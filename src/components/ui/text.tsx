import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useFontFamily } from '@/hooks/use-fonts';
import { colors, typography, weightOf, type ColorToken, type TypographyVariant } from '@/theme';

export type TextProps = RNTextProps & {
  /** Variante de la escala tipográfica. Nunca pasar `fontSize` a mano. */
  variant?: TypographyVariant;
  /** Token de color de texto. */
  color?: ColorToken;
};

/** Texto del sistema. Toda la app escribe con este componente, no con `<Text>` de RN. */
export function Text({ variant = 'body', color = 'text', style, ...rest }: TextProps) {
  const fontFamily = useFontFamily();

  return (
    <RNText
      style={[
        typography[variant],
        // Después de la variante: en una fuente propia, el peso lo elige el
        // archivo, no `fontWeight`.
        { fontFamily: fontFamily(weightOf(variant)), color: colors[color] },
        style,
      ]}
      {...rest}
    />
  );
}
