/**
 * Design system de OVENG EnvHealth.
 *
 * Punto de entrada único de los tokens: `import { theme } from '@/theme'`.
 * Ninguna pantalla define colores, tamaños ni radios propios — si algo falta,
 * se añade aquí después de comprobarlo contra los mockups de docs/design/.
 */
import { environmentalCategories } from './categories';
import { colors } from './colors';
import { radius } from './radius';
import { shadows } from './shadows';
import { maxContentWidth, screenPadding, spacing } from './spacing';
import { systemFontFamily, typography } from './typography';

export {
  environmentalCategories,
  environmentalCategoryOrder,
  type EnvironmentalCategory,
  type EnvironmentalCategoryStyle,
} from './categories';
export { colors, type ColorToken } from './colors';
export { noWebFocusRing } from './focus';
export { radius, type RadiusToken } from './radius';
export { shadows, type ShadowToken } from './shadows';
export { maxContentWidth, screenPadding, spacing, type SpacingToken } from './spacing';
export {
  interFontFamily,
  monoFontFamily,
  systemFontFamily,
  typography,
  weightOf,
  type FontWeight,
  type TypographyVariant,
} from './typography';


export const theme = {
  colors,
  environmentalCategories,
  spacing,
  radius,
  shadows,
  typography,
  systemFontFamily,
  screenPadding,
  maxContentWidth,
} as const;
