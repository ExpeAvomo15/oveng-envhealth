import { colors, type ColorToken } from '@/theme';

/**
 * Calidad del aire en vivo, de cualquier coordenada del mundo (F4.1).
 *
 * Fuente: **Open-Meteo Air Quality**, que sirve el modelo CAMS de Copernicus.
 * Es una **estimación de modelo**, no una medición: la app lo dice siempre
 * (ver `provenanceLine`). Gratis, sin clave y con CORS abierto, así que el
 * navegador la llama directamente; no hay servidor ni migración. El razonamiento
 * completo está en docs/08_DATOS_EN_VIVO.md.
 *
 * ## Contrato, comprobado el 2026-10-04
 *
 * `GET /v1/air-quality?latitude=1.86&longitude=9.77&current=european_aqi,pm2_5,pm10&timezone=GMT`
 * devuelve el punto de rejilla más cercano (`latitude: 1.9, longitude: 9.8`) y
 * `current: { time: "2026-10-04T12:00", interval: 3600, european_aqi: 16,
 * pm2_5: 3.0, pm10: 5.0 }`. `time` llega **sin zona** aunque se pida GMT, así
 * que se le añade la `Z`. Un error llega como `{ error: true, reason }`.
 *
 * ## Si falla, no se nota
 *
 * `getAirQuality` **nunca lanza**: devuelve `null`, y quien la llama enseña el
 * dato curado del seed con su propia etiqueta ("Dato de referencia"). Un
 * servicio externo caído no puede romper una pantalla que ya sabía qué enseñar.
 */

const ENDPOINT = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Lo que tarda de más una respuesta antes de darla por perdida. */
const TIMEOUT_MS = 8000;

/**
 * Media hora de caché. El modelo se actualiza por horas, así que pedirlo más a
 * menudo no trae dato nuevo; y al navegar entre el feed, el mapa y una ficha se
 * repiten las mismas coordenadas.
 */
const TTL_MS = 30 * 60 * 1000;

export type AirLevel = 'excelente' | 'buena' | 'moderada' | 'mala' | 'muy-mala' | 'extrema';

export type AirQuality = {
  /** Índice europeo de calidad del aire (EAQI). Sube cuando el aire empeora. */
  aqi: number;
  level: AirLevel;
  /** "Buena", "Moderada"… */
  label: string;
  /** µg/m³. `null` si el modelo no lo da para ese punto. */
  pm25: number | null;
  pm10: number | null;
  /** Instante del dato del modelo (ISO, UTC), no el de la consulta. */
  updatedAt: string;
  source: 'copernicus';
  /** Punto de rejilla del que sale el dato: Open-Meteo ajusta la coordenada. */
  gridLat: number;
  gridLng: number;
};

/**
 * Tramos oficiales del **European Air Quality Index** (Agencia Europea de Medio
 * Ambiente), tal como los documenta Open-Meteo: 0–20 *good*, 20–40 *fair*,
 * 40–60 *moderate*, 60–80 *poor*, 80–100 *very poor* y más de 100 *extremely
 * poor*. Cada tramo incluye su límite superior.
 *
 * Son **seis**, y la sexta no se funde con "Muy mala": un episodio extremo
 * tiene que poder decirse.
 *
 * El color es el semáforo de la paleta y nunca va solo: siempre acompaña a la
 * palabra. "Muy mala" y "Extremadamente mala" comparten el rojo de error, que
 * es el único que hay, y se distinguen por la palabra.
 */
export const AIR_LEVELS: readonly { level: AirLevel; max: number; label: string; color: ColorToken }[] = [
  { level: 'excelente', max: 20, label: 'Excelente', color: 'accent' },
  { level: 'buena', max: 40, label: 'Buena', color: 'accentSoft' },
  { level: 'moderada', max: 60, label: 'Moderada', color: 'warning' },
  { level: 'mala', max: 80, label: 'Mala', color: 'warningText' },
  { level: 'muy-mala', max: 100, label: 'Muy mala', color: 'danger' },
  { level: 'extrema', max: Infinity, label: 'Extremadamente mala', color: 'danger' },
];

export function airLevel(aqi: number): (typeof AIR_LEVELS)[number] {
  return AIR_LEVELS.find((band) => aqi <= band.max) ?? AIR_LEVELS[AIR_LEVELS.length - 1]!;
}

/** Color del punto del semáforo para un nivel. */
export function airLevelColor(level: AirLevel): string {
  const band = AIR_LEVELS.find((candidate) => candidate.level === level);
  return colors[band?.color ?? 'textMuted'];
}

/** Clave de caché: la coordenada redondeada a 0,1°, la rejilla de Open-Meteo. */
export function airCacheKey(lat: number, lng: number): string {
  return `${lat.toFixed(1)},${lng.toFixed(1)}`;
}

type Entry = { at: number; value: AirQuality | null; pending?: Promise<AirQuality | null> };
const cache = new Map<string, Entry>();

/**
 * El dato en caché si sigue vigente, sin llamar a nadie. Permite pintarlo en el
 * primer render al volver a una pantalla, en vez de enseñar un esqueleto.
 */
export function peekAirQuality(lat: number, lng: number): AirQuality | null {
  const entry = cache.get(airCacheKey(lat, lng));
  if (!entry || entry.value === null || Date.now() - entry.at > TTL_MS) return null;
  return entry.value;
}

/**
 * Calidad del aire en vivo para una coordenada. `null` si la API no responde o
 * responde algo que no se entiende: quien llama cae al dato curado.
 *
 * Las peticiones en vuelo se comparten —el feed y el mapa pueden pedir la
 * misma celda a la vez— y los fallos **no** se cachean, para que la siguiente
 * navegación lo vuelva a intentar.
 */
export function getAirQuality(lat: number, lng: number): Promise<AirQuality | null> {
  const key = airCacheKey(lat, lng);
  const entry = cache.get(key);

  if (entry?.pending) return entry.pending;
  if (entry && entry.value !== null && Date.now() - entry.at <= TTL_MS) {
    return Promise.resolve(entry.value);
  }

  const pending = fetchAirQuality(lat, lng).then((value) => {
    if (value) cache.set(key, { at: Date.now(), value });
    else cache.delete(key);
    return value;
  });

  cache.set(key, { at: Date.now(), value: null, pending });
  return pending;
}

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  current?: {
    time?: string;
    european_aqi?: number | null;
    pm2_5?: number | null;
    pm10?: number | null;
  };
  error?: boolean;
};

async function fetchAirQuality(lat: number, lng: number): Promise<AirQuality | null> {
  // Dos decimales (algo más de un kilómetro). La rejilla del modelo es de 0,1°,
  // así que no cambia el dato, y la ubicación de quien mira (F4.2) no sale con
  // más precisión de la necesaria.
  const params = new URLSearchParams({
    latitude: lat.toFixed(2),
    longitude: lng.toFixed(2),
    current: 'european_aqi,pm2_5,pm10',
    timezone: 'GMT',
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?${params}`, { signal: controller.signal });
    if (!response.ok) return null;

    const body = (await response.json()) as OpenMeteoResponse;
    const current = body.current;
    const aqi = current?.european_aqi;
    if (body.error || !current?.time || typeof aqi !== 'number') return null;

    const band = airLevel(aqi);
    return {
      aqi: Math.round(aqi),
      level: band.level,
      label: band.label,
      pm25: current.pm2_5 ?? null,
      pm10: current.pm10 ?? null,
      updatedAt: `${current.time}:00Z`,
      source: 'copernicus',
      gridLat: body.latitude ?? lat,
      gridLng: body.longitude ?? lng,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
