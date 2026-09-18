/**
 * Radios de esquina. Los mockups usan esquinas claramente redondeadas;
 * las cards son `lg` (~16px) y ese es el valor por defecto del producto.
 */
export const radius = {
  /** 8 — chips, badges, inputs pequeños. */
  sm: 8,
  /** 12 — botones e inputs. */
  md: 12,
  /** 16 — cards. El radio característico del producto. */
  lg: 16,
  /** 24 — hojas, modales y contenedores grandes. */
  xl: 24,
  /** Circular: avatares, botón de crear, píldoras. */
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
