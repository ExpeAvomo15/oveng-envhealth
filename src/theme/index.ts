/**
 * Design system de OVENG EnvHealth.
 *
 * Punto de entrada único de los tokens: `import { theme } from '@/theme'`.
 * Ninguna pantalla define colores, tamaños ni radios propios — si algo falta,
 * se añade aquí después de comprobarlo contra los mockups de docs/design/.
 */
export { colors, type ColorToken } from './colors';
export { radius, type RadiusToken } from './radius';
export { shadows, type ShadowToken } from './shadows';
export { maxContentWidth, screenPadding, spacing, type SpacingToken } from './spacing';
export { fontFamily, typography, type TypographyVariant } from './typography';

import { colors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { maxContentWidth, screenPadding, spacing } from './spacing';
import { fontFamily, typography } from './typography';

export const theme = {
  colors,
  spacing,
  radius,
  shadows,
  typography,
  fontFamily,
  screenPadding,
  maxContentWidth,
} as const;
