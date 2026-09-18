import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export type LogoVariant = 'full' | 'mark' | 'inline';

export type LogoProps = {
  /**
   * `full` apila marca y nombre (bienvenida) · `mark` solo el símbolo ·
   * `inline` símbolo y nombre en horizontal (cabeceras).
   */
  variant?: LogoVariant;
};

/**
 * Marca de OVENG EnvHealth.
 *
 * Dibujada con vistas, sin SVG ni imagen: el logotipo definitivo llegará con
 * los mockups oficiales (docs/design/) y entonces se sustituye por el asset
 * real. Hasta entonces esto evita pantallas sin identidad.
 */
export function Logo({ variant = 'full' }: LogoProps) {
  const compact = variant === 'inline';
  const badgeSize = compact ? 32 : 88;
  const leafSize = compact ? 16 : 44;

  const badge = (
    <View style={[styles.badge, { width: badgeSize, height: badgeSize }]}>
      {/* Hoja: un cuadrado con dos esquinas opuestas redondeadas del todo. */}
      <View style={[styles.leaf, { width: leafSize, height: leafSize }]} />
    </View>
  );

  if (variant === 'mark') {
    return badge;
  }

  if (compact) {
    return (
      <View style={styles.inline}>
        {badge}
        <View style={styles.inlineText}>
          <Text variant="subtitle">OVENG</Text>
          <Text variant="micro" color="accent">
            EnvHealth
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      {badge}
      <View style={styles.wordmark}>
        <Text variant="title">OVENG</Text>
        <Text variant="subtitle" color="accent">
          EnvHealth
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.lg,
  },
  inline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inlineText: {
    justifyContent: 'center',
  },
  badge: {
    borderRadius: radius.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leaf: {
    backgroundColor: colors.accent,
    borderTopLeftRadius: radius.full,
    borderBottomRightRadius: radius.full,
    borderTopRightRadius: 4,
  },
  wordmark: {
    alignItems: 'center',
  },
});
