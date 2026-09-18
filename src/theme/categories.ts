import type { ColorToken } from './colors';

/**
 * Categorías ambientales y su color.
 *
 * Es el mapeo que quedó pendiente en F0.2. Las categorías son las del mapa
 * ambiental (@docs/00_VISION.md); mientras `posts` no tenga columna de
 * categoría, este módulo es la única definición del enumerado y la referencia
 * para la migración que la añada.
 *
 * ## Cómo se eligieron los colores
 *
 * Cuatro salen de la paleta de AGENTS.md; `agua` necesitaba una variante propia
 * porque comparte familia con `aire`. Se usó azul oscuro (#0277BD, la misma
 * familia Material que el resto de la paleta): frente al cian de `aire` no solo
 * cambia el tono, cambia la luminancia — se distinguen también en escala de
 * grises y con daltonismo, que es lo que el tono por sí solo no garantiza.
 *
 * ## Cómo se pintan
 *
 * Relleno sólido del color + texto en `onColor`. Nada de fondos suaves: los
 * tintes claros de `aire` y `agua` salen casi idénticos (#E1F6F9 y #E1EFF7) y
 * dejarían dos categorías indistinguibles, así que no se ofrecen.
 *
 * El color del texto se eligió midiendo, no a ojo — contraste real de cada
 * combinación (mínimo AA para texto normal: 4.5:1):
 *
 * | Categoría     | Color     | Texto    | Contraste |
 * | ------------- | --------- | -------- | --------- |
 * | aire          | `#02B8D1` | oscuro   |  6.9:1 ✓  |
 * | agua          | `#0277BD` | blanco   |  4.8:1 ✓  |
 * | suelo         | `#FFC107` | oscuro   | 10.1:1 ✓  |
 * | biodiversidad | `#2E7D32` | blanco   |  5.1:1 ✓  |
 * | residuos      | `#616161` | blanco   |  6.2:1 ✓  |
 *
 * De ahí que el texto no sea siempre oscuro: depende de la luminancia del
 * relleno, y con estos cinco colores cae a los dos lados.
 *
 * **El color nunca va solo.** La categoría se acompaña siempre de su etiqueta
 * de texto: un punto de color de `aire` sobre la superficie da 2.2:1, por
 * debajo del 3:1 que pide WCAG para un elemento gráfico con significado.
 */
export type EnvironmentalCategory = 'aire' | 'agua' | 'suelo' | 'biodiversidad' | 'residuos';

export type EnvironmentalCategoryStyle = {
  /** Nombre visible, en la terminología del producto. */
  label: string;
  /** Relleno sólido: chip, punto del mapa, capa. */
  color: string;
  /** Token de color del texto sobre `color`. Medido, no elegido a ojo. */
  onColor: Extract<ColorToken, 'text' | 'textInverse'>;
};

export const environmentalCategories: Record<
  EnvironmentalCategory,
  EnvironmentalCategoryStyle
> = {
  aire: { label: 'Aire', color: '#02B8D1', onColor: 'text' },
  agua: { label: 'Agua', color: '#0277BD', onColor: 'textInverse' },
  suelo: { label: 'Suelo', color: '#FFC107', onColor: 'text' },
  biodiversidad: { label: 'Biodiversidad', color: '#2E7D32', onColor: 'textInverse' },
  residuos: { label: 'Residuos', color: '#616161', onColor: 'textInverse' },
};

/** Orden estable para filtros y leyendas del mapa. */
export const environmentalCategoryOrder: readonly EnvironmentalCategory[] = [
  'aire',
  'agua',
  'suelo',
  'biodiversidad',
  'residuos',
];
