/**
 * Mapa ambiental. `EnvironmentalMap` resuelve por plataforma: MapLibre en web,
 * marcador de posición en nativo.
 */
export { AirQualityCard, type AirQualityCardProps } from './air-quality-card';
export { CategoryLegend, type CategoryLegendProps } from './category-legend';
export { EntitySheet, type EntitySheetProps } from './entity-sheet';
export { EnvironmentalMap } from './environmental-map';
export { MapSearchResults, type MapSearchResultsProps } from './map-search-results';
export {
  INITIAL_VIEW,
  type EnvironmentalMapProps,
  type FlyTarget,
  type MapCenter,
} from './types';
