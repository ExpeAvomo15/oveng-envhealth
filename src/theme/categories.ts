import type { ColorToken } from './colors';

/**
 * Categorías ambientales y su color.
 *
 * Son el enumerado `environmental_category` de la base de datos
 * (`supabase/migrations/003_entities.sql`): este archivo y esa migración tienen
 * que decir lo mismo.
 *
 * ## De dónde sale el listado
 *
 * Los dos mockups no coincidían. El 1 muestra capas de aire, agua, suelo y
 * biodiversidad; el 2 sustituye biodiversidad por energía y residuos. F2.1
 * resolvió la contradicción tomando **la unión de ambos**: las seis categorías
 * de abajo. Ninguna de las dos listas es un subconjunto de la otra, así que
 * quedarse con una habría dejado fuera contenido que los mockups enseñan.
 *
 * ## De dónde sale cada color
 *
 * Cuatro salen de la paleta de AGENTS.md. `agua` necesitaba una variante propia
 * para no confundirse con `aire`, y `suelo` es el único color realmente nuevo.
 *
 * | Categoría     | Color     | Texto   | Contraste | Origen |
 * | ------------- | --------- | ------- | --------- | ------ |
 * | aire          | `#02B8D1` | oscuro  |  6.9:1 ✓  | paleta ("azul agua") |
 * | agua          | `#0277BD` | blanco  |  4.8:1 ✓  | azul profundo, misma familia |
 * | suelo         | `#8E24AA` | blanco  |  7.0:1 ✓  | leyenda del mapa (mockup 2) |
 * | biodiversidad | `#2E7D32` | blanco  |  5.1:1 ✓  | paleta (verde principal) |
 * | energia       | `#FFC107` | oscuro  | 10.1:1 ✓  | paleta (amarillo) |
 * | residuos      | `#616161` | blanco  |  6.2:1 ✓  | paleta (gris) |
 *
 * **Sobre `suelo`:** el mockup 2 se contradice a sí mismo — morado en la
 * leyenda del mapa, marrón anaranjado en el perfil ambiental. Se elige el
 * morado porque es el que usa justo en la vista donde `suelo` y `energia`
 * aparecen juntos, y un marrón al lado del amarillo de `energia` sería difícil
 * de distinguir en un punto de mapa de doce píxeles.
 *
 * **Sobre `residuos`:** el mockup lo pinta verde, pero ahí no hay capa de
 * biodiversidad con la que chocar. Con las seis categorías juntas, el verde ya
 * está ocupado, así que se queda con el gris de la paleta.
 *
 * **El color nunca va solo.** Varias parejas (suelo/residuos,
 * biodiversidad/residuos) se separan por tono pero no por luminancia, así que
 * en escala de grises o con daltonismo se parecen. La categoría se acompaña
 * siempre de su etiqueta de texto.
 */
export type EnvironmentalCategory =
  | 'aire'
  | 'agua'
  | 'suelo'
  | 'biodiversidad'
  | 'energia'
  | 'residuos';

export type EnvironmentalCategoryStyle = {
  /** Nombre visible, en la terminología del producto. */
  label: string;
  /** Relleno sólido: chip, punto del mapa, capa. */
  color: string;
  /** Token de color del texto sobre `color`. Medido, no elegido a ojo. */
  onColor: Extract<ColorToken, 'text' | 'textInverse'>;
  /** Icono de Ionicons que acompaña a la categoría. */
  icon: 'cloud-outline' | 'water-outline' | 'layers-outline' | 'leaf-outline' | 'flash-outline' | 'trash-outline';
};

export const environmentalCategories: Record<
  EnvironmentalCategory,
  EnvironmentalCategoryStyle
> = {
  aire: { label: 'Aire', color: '#02B8D1', onColor: 'text', icon: 'cloud-outline' },
  agua: { label: 'Agua', color: '#0277BD', onColor: 'textInverse', icon: 'water-outline' },
  suelo: { label: 'Suelo', color: '#8E24AA', onColor: 'textInverse', icon: 'layers-outline' },
  biodiversidad: {
    label: 'Biodiversidad',
    color: '#2E7D32',
    onColor: 'textInverse',
    icon: 'leaf-outline',
  },
  energia: { label: 'Energía', color: '#FFC107', onColor: 'text', icon: 'flash-outline' },
  residuos: { label: 'Residuos', color: '#616161', onColor: 'textInverse', icon: 'trash-outline' },
};

/** Orden estable para filtros y leyendas del mapa. */
export const environmentalCategoryOrder: readonly EnvironmentalCategory[] = [
  'aire',
  'agua',
  'suelo',
  'biodiversidad',
  'energia',
  'residuos',
];
