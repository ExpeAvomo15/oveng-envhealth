import type { EntityMetric, EntityMetricName, EnvironmentalCategoryName } from './database.types';

/**
 * Cómo se reparten las métricas de una entidad en el perfil ambiental.
 *
 * ## Por qué hace falta una regla y no una lista fija
 *
 * Los dos mockups enseñan la misma pantalla de formas distintas: el 1 (Monte
 * Alén) pone tres tarjetas de categoría arriba y los datos sueltos debajo; el 2
 * (Río Ntem) pone un círculo de calidad general, una fila de cuatro subíndices
 * y una sección de "Datos clave". No son dos diseños: son **el mismo diseño con
 * distintos datos**, porque las dos entidades no tienen las mismas métricas.
 *
 * Esta función reparte por lo que hay, así que el mismo código reproduce las
 * dos pantallas sin ramas por entidad.
 */

/** Métricas que son una categoría ambiental, en el orden en que se enseñan. */
const CATEGORY_METRICS: { metric: EntityMetricName; category: EnvironmentalCategoryName }[] = [
  { metric: 'indice_aire', category: 'aire' },
  { metric: 'aire', category: 'aire' },
  { metric: 'agua', category: 'agua' },
  { metric: 'suelo', category: 'suelo' },
  { metric: 'biodiversidad', category: 'biodiversidad' },
];

export type CategoryReading = {
  metric: EntityMetric;
  category: EnvironmentalCategoryName;
};

export type GroupedMetrics = {
  /** Calidad general, la del círculo grande. `null` si la entidad no la tiene. */
  general: EntityMetric | null;
  /** Fila de categorías: aire, agua, suelo, biodiversidad. */
  categories: CategoryReading[];
  /** El resto, en tarjetas: cobertura forestal, temperatura, AQI desplazado… */
  key: EntityMetric[];
};

/**
 * Reparte las métricas en las tres zonas de la pantalla.
 *
 * **`indice_aire` desplaza a `aire` de la fila de categorías.** El Ntem tiene
 * las dos —un AQI crudo de 42 y un subíndice de 8.9 sobre 10— y ponerlas juntas
 * daría dos casillas de "aire" contradiciéndose: una sube cuando el aire mejora
 * y la otra baja. En la fila va el índice, que es lo comparable con agua, suelo
 * y biodiversidad, y el AQI baja a "Datos clave" con su unidad a la vista. Si
 * una entidad solo tiene `aire`, como Monte Alén, entonces `aire` ocupa la
 * casilla.
 *
 * Con eso, el reparto sale **exactamente** como cada mockup:
 *
 * - Monte Alén → sin círculo; fila con aire (42 AQI), agua (8.2 pH) y
 *   biodiversidad (8.7/10); tarjeta con cobertura forestal (78 %).
 * - Río Ntem → círculo 8.7/10; fila con aire (8.9/10), agua (8.2 pH), suelo
 *   (8.5/10) y biodiversidad (9.1/10); tarjetas con el AQI y la temperatura.
 */
export function groupMetrics(metrics: EntityMetric[]): GroupedMetrics {
  const byName = new Map(metrics.map((metric) => [metric.metric, metric]));

  const general = byName.get('calidad_general') ?? null;
  const usadas = new Set<EntityMetricName>();
  if (general) usadas.add('calidad_general');

  const categories: CategoryReading[] = [];
  const yaPuestas = new Set<EnvironmentalCategoryName>();

  for (const { metric, category } of CATEGORY_METRICS) {
    const found = byName.get(metric);
    // `indice_aire` va antes que `aire` en la lista: el primero que aparece se
    // queda la casilla de su categoría.
    if (!found || yaPuestas.has(category)) continue;

    categories.push({ metric: found, category });
    yaPuestas.add(category);
    usadas.add(metric);
  }

  const key = metrics.filter((metric) => !usadas.has(metric.metric));

  return { general, categories, key };
}

/** "Cobertura forestal" a partir de `cobertura_forestal`. */
export function metricLabel(metric: EntityMetricName): string {
  const words = metric.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** 42 → "42"; 8.2 → "8,2". Coma decimal, que es lo que se lee en español. */
export function formatMetricValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

/** "8,2 pH", o solo el número si la métrica no trae unidad. */
export function formatReading(metric: Pick<EntityMetric, 'value' | 'unit'>): string {
  const value = formatMetricValue(Number(metric.value));
  return metric.unit ? `${value} ${metric.unit}` : value;
}
