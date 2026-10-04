/**
 * Lugares del mundo para el buscador del mapa (F4.2).
 *
 * Fuente: **Open-Meteo Geocoding**, sobre GeoNames. Pública, mundial, sin clave
 * y con CORS abierto, así que el navegador la llama directamente, como el aire
 * de F4.1.
 *
 * ## Contrato, comprobado el 2026-10-04
 *
 * `GET /v1/search?name=Douala&count=5&language=es` devuelve
 * `{ results: [{ id, name: "Duala", latitude, longitude, feature_code: "PPLA",
 * country: "Camerún", country_code: "CM", admin1: "Región del Litoral",
 * admin2, population, timezone }] }`. Los nombres llegan **en español**
 * ("Duala", no "Douala"). Sin coincidencias **no hay clave `results`**, y una
 * búsqueda de un solo carácter vuelve vacía.
 *
 * **No hay geocodificación inversa**: de unas coordenadas no sale un nombre.
 * Por eso la ubicación propia se llama "Tu ubicación".
 */

const ENDPOINT = 'https://geocoding-api.open-meteo.com/v1/search';
const TIMEOUT_MS = 8000;

/** Menos de esto, la API devuelve vacío: no merece la pena preguntar. */
export const MIN_PLACE_QUERY = 2;

export type Place = {
  id: number;
  name: string;
  /** "Región del Litoral, Camerún": lo que distingue a dos Málagas. */
  detail: string;
  lat: number;
  lng: number;
  /** Zoom al que volar, según el tipo de lugar. */
  zoom: number;
};

type GeocodingResponse = {
  results?: {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    feature_code?: string;
    country?: string;
    admin1?: string;
    population?: number;
  }[];
  error?: boolean;
};

/**
 * Zoom razonable según el `feature_code` de GeoNames: un país entero no se
 * enseña al nivel de una calle, ni un pueblo al de un continente.
 */
function zoomFor(featureCode: string | undefined, population: number | undefined): number {
  const code = featureCode ?? '';
  if (code.startsWith('PCL')) return 5; // país
  if (code === 'ADM1') return 6.5; // región
  if (code === 'ADM2') return 8; // provincia
  if (code.startsWith('PPL')) return (population ?? 0) > 1_000_000 ? 10 : 11; // población
  if (code === 'MT' || code === 'PK' || code === 'VLC') return 11; // monte, pico, volcán
  return 10;
}

const cache = new Map<string, Place[]>();

export class PlaceSearchFailed extends Error {}

/**
 * Hasta cinco lugares para un texto. Lanza `PlaceSearchFailed` si la API no
 * responde —la pantalla lo dice en español— y devuelve `[]` si no hay
 * coincidencias, que no es un error.
 */
export async function searchPlaces(query: string): Promise<Place[]> {
  const name = query.trim();
  if (name.length < MIN_PLACE_QUERY) return [];

  const key = name.toLowerCase();
  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({ name, count: '5', language: 'es', format: 'json' });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${ENDPOINT}?${params}`, { signal: controller.signal });
    if (!response.ok) throw new PlaceSearchFailed(`HTTP ${response.status}`);

    const body = (await response.json()) as GeocodingResponse;
    if (body.error) throw new PlaceSearchFailed('respuesta de error');

    const places = (body.results ?? []).map((result) => ({
      id: result.id,
      name: result.name,
      detail: [result.admin1, result.country].filter(Boolean).join(', '),
      lat: result.latitude,
      lng: result.longitude,
      zoom: zoomFor(result.feature_code, result.population),
    }));

    cache.set(key, places);
    return places;
  } catch (caught) {
    if (caught instanceof PlaceSearchFailed) throw caught;
    throw new PlaceSearchFailed(caught instanceof Error ? caught.message : 'sin respuesta');
  } finally {
    clearTimeout(timer);
  }
}
