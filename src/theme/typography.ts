import { Platform, type TextStyle } from 'react-native';

import '@/global.css';

/**
 * Tipografía: **Inter**, la familia de los mockups oficiales.
 *
 * En React Native el peso no se elige con `fontWeight` cuando la fuente es
 * propia: cada peso es un archivo distinto y hay que nombrarlo. Por eso cada
 * variante declara su peso y el componente `Text` traduce ese peso al archivo
 * correspondiente. `fontWeight` se mantiene porque en web sigue sirviendo, y
 * porque es lo que se aplica mientras la fuente carga.
 */

export type FontWeight = '400' | '500' | '600' | '700';

/** Archivos de Inter, por peso. Los carga `FontsProvider` en el layout raíz. */
export const interFontFamily: Record<FontWeight, string> = {
  '400': 'Inter_400Regular',
  '500': 'Inter_500Medium',
  '600': 'Inter_600SemiBold',
  '700': 'Inter_700Bold',
};

/**
 * Familia del sistema. Es lo que se ve durante los milisegundos que tarda Inter
 * en cargar: el texto aparece desde el primer momento y luego cambia de forma,
 * en vez de dejar la pantalla en blanco esperando a una fuente.
 */
export const systemFontFamily = Platform.select({
  ios: 'system-ui',
  web: 'var(--font-display)',
  default: 'normal',
}) as string;

export const monoFontFamily = Platform.select({
  ios: 'ui-monospace',
  web: 'var(--font-mono)',
  default: 'monospace',
}) as string;

/**
 * Variantes de texto. La UI usa `<Text variant="...">` y nunca fontSize suelto,
 * para que un cambio de escala sea un cambio en un solo sitio.
 */
export const typography = {
  /** 28/34 bold — título de pantalla. */
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  /** 22/28 bold — título de sección o nombre de perfil. */
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  /** 17/22 semibold — cabecera de card, nombre de autor. */
  subtitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  /** 16/24 regular — cuerpo por defecto: contenido de publicaciones. */
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  /** 16/24 semibold — cuerpo enfatizado. */
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  /** 14/20 regular — metadatos, descripciones secundarias. */
  caption: { fontSize: 14, lineHeight: 20, fontWeight: '400' },
  /** 13/16 semibold — badges, etiquetas, pestañas. */
  label: { fontSize: 13, lineHeight: 16, fontWeight: '600' },
  /** 11/14 medium — etiquetas de la barra de navegación. El tamaño mínimo. */
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '500' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;

/** Peso declarado por una variante, ya tipado como peso de Inter. */
export function weightOf(variant: TypographyVariant): FontWeight {
  return typography[variant].fontWeight as FontWeight;
}
