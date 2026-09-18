/**
 * Escala de espaciado, base 4. Todo margen, padding y gap sale de aquí:
 * si un valor no está en la escala, casi siempre el problema es el layout.
 */
export const spacing = {
  /** 4 — separación entre elementos pegados (icono + su etiqueta). */
  xs: 4,
  /** 8 — gap interno de un componente. */
  sm: 8,
  /** 12 — padding de controles compactos. */
  md: 12,
  /** 16 — padding estándar de card y margen lateral de pantalla. */
  lg: 16,
  /** 24 — separación entre bloques. */
  xl: 24,
  /** 32 — separación entre secciones. */
  xxl: 32,
  /** 48 — respiro grande: cabeceras, estados vacíos. */
  xxxl: 48,
} as const;

export type SpacingToken = keyof typeof spacing;

/** Margen lateral de pantalla. */
export const screenPadding = spacing.lg;

/** Ancho máximo del contenido en web: el feed no se estira en pantalla ancha. */
export const maxContentWidth = 640;
