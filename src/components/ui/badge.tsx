import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, type ColorToken } from '@/theme';

import { Text } from './text';

/**
 * Tonos disponibles. El mapeo de categoría ambiental (aire, agua, suelo,
 * biodiversidad, residuos) a tono se define con el modelo de datos en F0.3,
 * no aquí: este componente solo conoce tonos, no dominio.
 */
export type BadgeTone = 'accent' | 'info' | 'warning' | 'neutral';

const tones: Record<BadgeTone, { background: ColorToken; label: ColorToken }> = {
  accent: { background: 'accentTint', label: 'accent' },
  info: { background: 'infoTint', label: 'text' },
  warning: { background: 'warningTint', label: 'text' },
  neutral: { background: 'surfaceMuted', label: 'textSecondary' },
};

export type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

/** Etiqueta compacta: categoría, tipo de cuenta, estado. */
export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { background, label: labelColor } = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors[background] }]}>
      <Text variant="label" color={labelColor} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
