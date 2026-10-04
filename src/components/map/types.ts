import type { EntityResult } from '@/lib/entities';

/** Punto del mapa en grados. */
export type MapCenter = { lat: number; lng: number };

/**
 * Encuadre inicial: Guinea Ecuatorial, con Bata y Monte Alén dentro y Bioko
 * asomando por arriba. Las coordenadas salen del seed de F2.1.
 */
export const INITIAL_VIEW = { lat: 2.1, lng: 9.9, zoom: 7.2 };

export type EnvironmentalMapProps = {
  /** Entidades ya filtradas por categoría y por texto. */
  entities: EntityResult[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** El centro del encuadre, para saber qué medición queda más cerca. */
  onCenterChange?: (center: MapCenter) => void;
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
