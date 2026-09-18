import { Platform, type TextStyle } from 'react-native';

import '@/global.css';

/**
 * Tipografía del sistema. Sin fuentes propias todavía: los mockups oficiales
 * aún no fijan una familia, así que se usa la del sistema en cada plataforma
 * (legible, cero coste de carga). Cuando haya fuente de marca, se cambia aquí
 * y en global.css, y nada más.
 */
export const fontFamily = Platform.select({
  ios: { sans: 'system-ui', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', mono: 'monospace' },
}) as { sans: string; mono: string };

/**
 * Variantes de texto. La UI usa `<Text variant="...">` y nunca fontSize suelto,
 * para que un cambio de escala sea un cambio en un solo sitio.
 */
export const typography = {
  /** 28/34 semibold — título de pantalla. */
  display: { fontSize: 28, lineHeight: 34, fontWeight: '600' },
  /** 22/28 semibold — título de sección o nombre de perfil. */
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' },
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
  /** 11/14 semibold — etiquetas de la barra de navegación. El tamaño mínimo. */
  micro: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
