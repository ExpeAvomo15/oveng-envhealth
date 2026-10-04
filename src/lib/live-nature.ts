import { createLiveCache, fetchJson } from './live-cache';

/**
 * Naturaleza registrada cerca, en vivo (F4.3).
 *
 * Fuente: **GBIF**, la red mundial de datos de biodiversidad. Pública, mundial
 * y sin clave, con CORS abierto: cumple el criterio de fuentes.
 *
 * ## Contrato, comprobado el 2026-10-04
 *
 * `GET /v1/occurrence/search?geoDistance=1.86,9.77,10km&hasGeospatialIssue=false
 * &hasCoordinate=true&limit=0&facet=speciesKey&facetLimit=1000`
 * → `{ count: 2792, results: [], facets: [{ field: "SPECIES_KEY",
 *   counts: [{ name: "2494058", count: 63 }, …] }] }`.
 *
 * `count` son las observaciones; las especies distintas son las entradas del
 * facet, hasta el tope pedido. Alrededor de Bata: 2.792 observaciones de 701
 * especies. En Málaga el facet llega al tope de 1.000, y se dice "más de
 * 1.000".
 *
 * **`hasGeospatialIssue=false` no es opcional.** Sin él, el punto 0,0 en mitad
 * del océano tiene 1,4 millones de observaciones: registros con las
 * coordenadas mal puestas a cero (la "isla nula"). Con él, 74.
 */

const ENDPOINT = 'https://api.gbif.org/v1/occurrence/search';

/** El radio de "cerca": se dice en la tarjeta y en la explicación. */
export const NATURE_RADIUS_KM = 10;

/** Tope de especies que se cuentan: más allá, "más de 1.000". */
const SPECIES_CAP = 1000;

/** Esto cambia poco: un día de caché. */
const cache = createLiveCache<LiveNature>(24 * 60 * 60 * 1000);

export type LiveNature = {
  observations: number;
  species: number;
  /** El recuento de especies llegó al tope. */
  speciesCapped: boolean;
};

/** Celda de 0,05° (unos 5 km): el radio es de 10 km y no hace falta más. */
const keyOf = (lat: number, lng: number) =>
  `${(Math.round(lat * 20) / 20).toFixed(2)},${(Math.round(lng * 20) / 20).toFixed(2)}`;

export function peekNature(lat: number, lng: number): LiveNature | null {
  return cache.peek(keyOf(lat, lng));
}

type Response = { count?: number; facets?: { field: string; counts: unknown[] }[] };

/** Nunca lanza: `null` si GBIF no responde. */
export function getNature(lat: number, lng: number): Promise<LiveNature | null> {
  return cache.get(keyOf(lat, lng), async () => {
    const params = new URLSearchParams({
      geoDistance: `${lat.toFixed(2)},${lng.toFixed(2)},${NATURE_RADIUS_KM}km`,
      hasGeospatialIssue: 'false',
      hasCoordinate: 'true',
      limit: '0',
      facet: 'speciesKey',
      facetLimit: String(SPECIES_CAP),
    });
    const body = await fetchJson<Response>(`${ENDPOINT}?${params}`, 15_000);
    if (typeof body?.count !== 'number') return null;

    const species = body.facets?.find((facet) => facet.field === 'SPECIES_KEY')?.counts.length ?? 0;
    return { observations: body.count, species, speciesCapped: species >= SPECIES_CAP };
  });
}

/** "2.792 observaciones de 701 especies" con miles en español. */
export function natureText(nature: LiveNature): string {
  const n = (value: number) => value.toLocaleString('es-ES');
  if (nature.observations === 0) return 'Nadie ha registrado seres vivos aquí todavía';
  const species = nature.speciesCapped ? `más de ${n(nature.species)}` : n(nature.species);
  return `${n(nature.observations)} observaciones de ${species} especies`;
}
