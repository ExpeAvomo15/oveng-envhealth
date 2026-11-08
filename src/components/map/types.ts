import type { EntityResult } from '@/lib/entities';

/** Punto del mapa en grados. */
export type MapCenter = { lat: number; lng: number };

/** Lo que se ve del mapa (F4.3): para contar lo que hay "por aquí". */
export type MapBounds = { north: number; south: number; east: number; west: number };

export function inBounds(bounds: MapBounds, lat: number, lng: number): boolean {
  return lat <= bounds.north && lat >= bounds.south && lng <= bounds.east && lng >= bounds.west;
}

/**
 * Encuadre inicial: Guinea Ecuatorial **entera**, Bioko incluida (F5.0).
 *
 * Antes era un centro y un zoom fijos, y lo que entraba dependía de la
 * pantalla: en un móvil Malabo —la capital, con cuatro entidades— se quedaba
 * fuera, y en escritorio sus pines caían debajo del buscador. Ahora el mapa
 * encaja estos límites descontando lo que tapan buscador, chips y tarjeta.
 */
export const INITIAL_BOUNDS = { west: 8.4, south: 0.85, east: 11.4, north: 3.85 };

/** El centro de esos límites, y un zoom de respaldo antes de medir la pantalla. */
export const INITIAL_VIEW = {
  lat: (INITIAL_BOUNDS.north + INITIAL_BOUNDS.south) / 2,
  lng: (INITIAL_BOUNDS.east + INITIAL_BOUNDS.west) / 2,
  zoom: 7,
};

export type EnvironmentalMapProps = {
  /** Entidades ya filtradas por categoría y por texto. */
  entities: EntityResult[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /**
   * El centro del encuadre —para saber qué medición queda más cerca— y, desde
   * F4.3, lo que se ve, para contar las entidades de una capa.
   */
  onCenterChange?: (center: MapCenter, bounds: MapBounds) => void;
  /**
   * Petición de vuelo (F4.2): al buscar un lugar o pulsar "Mi ubicación". El
   * `id` cambia en cada petición, así que pedir dos veces el mismo sitio vuela
   * dos veces.
   */
  flyTo?: FlyTarget | null;
  /** Dónde está quien mira, si lo ha pedido. Se pinta como "Estás aquí". */
  userLocation?: MapCenter | null;
  /** Botón "Mi ubicación". Sin él, el botón no se pinta. */
  onLocate?: () => void;
  /** Mientras se espera la posición, el botón lo enseña. */
  locating?: boolean;
};

export type FlyTarget = MapCenter & { zoom: number; id: number };
