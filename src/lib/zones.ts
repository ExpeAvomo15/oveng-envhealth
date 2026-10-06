import type { EntityMetric } from './database.types';
import type { EntityResult } from './entities';
import { supabase } from './supabase';
import { withRatingsOf } from './entities';

/**
 * Zonas del feed: "los datos ambientales de tu zona" del mockup 1.
 *
 * ## "Tu zona" es elegida, no detectada
 *
 * No se usa la geolocalización del navegador: pide un permiso que muchas
 * personas deniegan, en escritorio da una precisión de ciudad o peor, y obliga
 * a diseñar el caso "me han dicho no". Para la demo la zona **se elige**, con
 * Guinea Ecuatorial por defecto. La geolocalización queda anotada como mejora.
 *
 * ## Las zonas son recuadros de coordenadas, no países
 *
 * Filtrar por `country` habría metido Madrid y Barcelona dentro de
 * "Málaga/Andalucía", porque las tres entidades españolas comparten país y no
 * región. Un recuadro sobre las coordenadas reales del seed deja fuera lo que
 * no está en la zona, que es lo que la palabra promete.
 */

export type ZoneId = 'guinea-ecuatorial' | 'malaga' | 'mi-ubicacion';

/**
 * "Usar mi ubicación" (F4.2). No es un recuadro fijo: su punto lo da el
 * navegador, solo con permiso, y **no se guarda** —se guarda la elección, no
 * las coordenadas—. Ver src/lib/geolocation.ts.
 */
export const MY_LOCATION: ZoneId = 'mi-ubicacion';
export const MY_LOCATION_NAME = 'Tu ubicación';

export type Zone = {
  id: ZoneId;
  /** Nombre en la tarjeta: "Datos ambientales de …". */
  name: string;
  bbox: { lat: [number, number]; lng: [number, number] };
  /**
   * Punto de la zona para el aire en vivo cuando no hay un lugar de referencia
   * (F4.1). Málaga no tiene ningún lugar medido, pero el aire de Málaga existe:
   * se pide aquí, en el centro de la ciudad.
   */
  center: { lat: number; lng: number };
};

/** Incluye Annobón (−1,43 S) y Bioko (3,8 N). */
export const zones: Zone[] = [
  {
    id: 'guinea-ecuatorial',
    name: 'Guinea Ecuatorial',
    bbox: { lat: [-1.6, 4.0], lng: [5.0, 11.5] },
    // Bata. Solo se usa si la zona se quedara sin lugar de referencia.
    center: { lat: 1.8639, lng: 9.7658 },
  },
  {
    id: 'malaga',
    name: 'Málaga y Andalucía',
    bbox: { lat: [36.0, 38.8], lng: [-7.6, -1.6] },
    center: { lat: 36.7213, lng: -4.4214 },
  },
];

export const DEFAULT_ZONE: ZoneId = 'guinea-ecuatorial';

/** Zona por identificador; lo desconocido —y "mi ubicación"— cae en la de por defecto. */
export function zoneById(id: string | null | undefined): Zone {
  return zones.find((zone) => zone.id === id) ?? zones[0]!;
}

/**
 * Las zonas que tienen al menos un lugar dentro (F4.5): son los chips de un
 * toque de Turismo Verde. Se calculan con los lugares que haya, no se escriben
 * a mano, así que una zona sin rincones no ofrece un chip que lleve a la nada.
 */
export function zonesWithPlaces(places: { lat: number | null; lng: number | null }[]): Zone[] {
  return zones.filter((zone) =>
    places.some(
      (place) =>
        place.lat !== null &&
        place.lng !== null &&
        place.lat >= zone.bbox.lat[0] &&
        place.lat <= zone.bbox.lat[1] &&
        place.lng >= zone.bbox.lng[0] &&
        place.lng <= zone.bbox.lng[1],
    ),
  );
}

/** Un identificador guardado que se puede restaurar tal cual. */
export function isZoneId(id: string | null | undefined): id is ZoneId {
  return id === MY_LOCATION || zones.some((zone) => zone.id === id);
}

export type ZoneData = {
  zone: Zone;
  /** El lugar del que sale la medición que se enseña. `null` si la zona no tiene. */
  reference: EntityResult | null;
  /**
   * Calidad del aire **curada** de la referencia. Desde F4.1 es el respaldo: la
   * tarjeta enseña el aire en vivo de `airCoords` y cae aquí si la API falla.
   */
  air: EntityMetric | null;
  /**
   * Dónde se pide el aire en vivo: las coordenadas de la referencia, o el
   * centro de la zona si no la hay.
   */
  airCoords: { lat: number; lng: number };
  /** Cómo se nombra ese punto en la tarjeta: "Río Ntem", "Málaga y Andalucía". */
  airPlace: string;
  /** Hasta dos mediciones más de la misma referencia. */
  secondary: EntityMetric[];
  /** Iniciativa destacada de la zona. `null` si no hay ninguna. */
  featured: EntityResult | null;
};

/**
 * Todo lo que la tarjeta de zona y la de destacado necesitan, en dos consultas.
 *
 * ## Cómo se elige la referencia
 *
 * De los **lugares** de la zona que tengan medición de aire, el que tenga más
 * mediciones; a igualdad, por nombre. Es determinista —la misma zona da siempre
 * la misma tarjeta— y elige al lugar mejor medido, que es el que más tiene que
 * contar. En Guinea Ecuatorial sale el Río Ntem, con siete.
 *
 * Solo lugares: las mediciones las llevan los lugares, no las empresas ni las
 * iniciativas (decidido en F2.1).
 *
 * ## Cómo se elige el destacado
 *
 * La iniciativa de la zona **de la misma categoría que la referencia**; si no
 * hay ninguna, la primera por nombre. Así el destacado habla de lo mismo que la
 * medición que tiene encima: en Guinea Ecuatorial la referencia es un río
 * (`agua`) y el destacado sale "Río limpio, vida sana", que es una limpieza de
 * ese río.
 */
export async function loadZoneData(zoneId: ZoneId, here?: { lat: number; lng: number }): Promise<ZoneData> {
  /*
   * Mi ubicación: solo el aire en vivo de ese punto. No hay lugar de
   * referencia ni destacado que buscar —las catorce entidades están en dos
   * regiones— y la tarjeta no finge tenerlos.
   */
  if (zoneId === MY_LOCATION) {
    if (!here) throw new Error('Mi ubicación sin coordenadas');
    return {
      zone: {
        id: MY_LOCATION,
        name: MY_LOCATION_NAME,
        bbox: { lat: [here.lat, here.lat], lng: [here.lng, here.lng] },
        center: here,
      },
      reference: null,
      air: null,
      airCoords: here,
      airPlace: MY_LOCATION_NAME,
      secondary: [],
      featured: null,
    };
  }

  const zone = zoneById(zoneId);

  const { data: entities, error } = await supabase
    .from('entities')
    .select('*')
    .gte('lat', zone.bbox.lat[0])
    .lte('lat', zone.bbox.lat[1])
    .gte('lng', zone.bbox.lng[0])
    .lte('lng', zone.bbox.lng[1])
    .order('name');

  if (error) throw error;

  const inZone = entities ?? [];
  if (inZone.length === 0) {
    return {
      zone,
      reference: null,
      air: null,
      airCoords: zone.center,
      airPlace: zone.name,
      secondary: [],
      featured: null,
    };
  }

  const { data: metrics, error: metricsError } = await supabase
    .from('entity_metrics')
    .select('*')
    .in(
      'entity_id',
      inZone.map((entity) => entity.id),
    );

  if (metricsError) throw metricsError;

  const byEntity = new Map<string, EntityMetric[]>();
  for (const metric of metrics ?? []) {
    const list = byEntity.get(metric.entity_id) ?? [];
    list.push(metric);
    byEntity.set(metric.entity_id, list);
  }

  const candidates = inZone
    .filter((entity) => entity.type === 'lugar')
    .filter((entity) => (byEntity.get(entity.id) ?? []).some((m) => m.metric === 'aire'))
    .sort((a, b) => {
      const diff = (byEntity.get(b.id)?.length ?? 0) - (byEntity.get(a.id)?.length ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'es');
    });

  const referenceRow = candidates[0] ?? null;
  const referenceMetrics = referenceRow ? (byEntity.get(referenceRow.id) ?? []) : [];

  const air = referenceMetrics.find((metric) => metric.metric === 'aire') ?? null;
  // Las dos más legibles después del aire, en un orden fijo para que la tarjeta
  // no cambie de contenido entre recargas.
  const PREFERRED: EntityMetric['metric'][] = [
    'calidad_general',
    'agua',
    'biodiversidad',
    'cobertura_forestal',
    'temperatura_media',
  ];
  const secondary = PREFERRED.map((name) => referenceMetrics.find((m) => m.metric === name))
    .filter((metric): metric is EntityMetric => Boolean(metric))
    .slice(0, 2);

  const initiatives = inZone.filter((entity) => entity.type === 'iniciativa');
  const featuredRow =
    initiatives.find((entity) => entity.category === referenceRow?.category) ??
    initiatives[0] ??
    null;

  // Las fichas enseñan la valoración, así que se resuelve aquí de una vez.
  const [reference, featured] = await Promise.all([
    referenceRow ? withRatingsOf([referenceRow]).then((rows) => rows[0] ?? null) : Promise.resolve(null),
    featuredRow ? withRatingsOf([featuredRow]).then((rows) => rows[0] ?? null) : Promise.resolve(null),
  ]);

  const airCoords =
    referenceRow && referenceRow.lat !== null && referenceRow.lng !== null
      ? { lat: referenceRow.lat, lng: referenceRow.lng }
      : zone.center;

  return {
    zone,
    reference,
    air,
    airCoords,
    airPlace: referenceRow?.name ?? zone.name,
    secondary,
    featured,
  };
}
