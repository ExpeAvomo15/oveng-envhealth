import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, fontFamily, typography, type ColorToken, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  /** Variante de la escala tipográfica. Nunca pasar `fontSize` a mano. */
  variant?: TypographyVariant;
  /** Token de color de texto. */
  color?: ColorToken;
};

/** Texto del sistema. Toda la app escribe con este componente, no con `<Text>` de RN. */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  return (
    <RNText
      style={[{ fontFamily: fontFamily.sans, color: colors[color] }, typography[variant], style]}
      {...rest}
    />
  );
}
