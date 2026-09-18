import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export type LogoProps = {
  /** `full` incluye el nombre bajo la marca; `mark` es solo el símbolo. */
  variant?: 'full' | 'mark';
};

/**
 * Marca de OVENG EnvHealth.
 *
 * Dibujada con vistas, sin SVG ni imagen: el logotipo definitivo llegará con
 * los mockups oficiales (docs/design/) y entonces se sustituye por el asset
 * real. Hasta entonces esto evita una pantalla de bienvenida sin identidad.
 */
export function Logo({ variant = 'full' }: LogoProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.badge}>
        {/* Hoja: un cuadrado con dos esquinas opuestas redondeadas del todo. */}
        <View style={styles.leaf} />
      </View>

      {variant === 'full' ? (
        <View style={styles.wordmark}>
          <Text variant="title">OVENG</Text>
          <Text variant="subtitle" color="accent">
            EnvHealth
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  badge: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    width: 44,
    height: 44,
    backgroundColor: colors.accent,
    borderTopLeftRadius: radius.full,
    borderBottomRightRadius: radius.full,
    borderTopRightRadius: 4,
  },
  wordmark: {
    alignItems: 'center',
  },
});
