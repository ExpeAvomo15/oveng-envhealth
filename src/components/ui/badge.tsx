import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
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
  /** Icono delante del texto (F4.4: el tipo de entidad, como Turismo Verde). */
  icon?: ComponentProps<typeof Ionicons>['name'];
};

/** Etiqueta compacta: categoría, tipo de cuenta, estado. */
export function Badge({ label, tone = 'neutral', icon }: BadgeProps) {
  const { background, label: labelColor } = tones[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors[background] }]}>
      {icon ? <Ionicons name={icon} size={13} color={colors[labelColor]} /> : null}
      <Text variant="label" color={labelColor} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
