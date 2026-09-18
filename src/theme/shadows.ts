import { Platform, type ViewStyle } from 'react-native';

/**
 * Elevación. Los mockups usan cards que flotan apenas sobre la superficie:
 * sombra amplia y muy tenue, nunca un borde marcado.
 */
export const shadows = {
  /** Card sobre el fondo de pantalla. */
  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    android: { elevation: 2 },
    web: { boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)' },
    default: {},
  }) as ViewStyle,

  /** Elemento flotante: botón de crear, barra inferior, hoja. */
  floating: Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
    },
    android: { elevation: 6 },
    web: { boxShadow: '0 8px 20px rgba(0, 0, 0, 0.12)' },
    default: {},
  }) as ViewStyle,
} as const;

export type ShadowToken = keyof typeof shadows;
