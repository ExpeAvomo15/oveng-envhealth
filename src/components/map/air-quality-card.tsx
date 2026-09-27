import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { EntityMetric } from '@/lib/database.types';
import type { EntityResult } from '@/lib/entities';
import { relativeTime } from '@/lib/time';
import { colors, radius, shadows, spacing } from '@/theme';

export type AirQualityCardProps = {
  entity: EntityResult;
  metric: EntityMetric;
  onPress: () => void;
};

/**
 * "Datos ambientales de tu zona" del mockup 1, con la medición de aire de la
 * entidad más cercana al centro del encuadre.
 *
 * Dice **de dónde** sale el dato. El mockup lo titula "de tu zona" y lo deja
 * ahí; sin geolocalización eso sería una promesa que el producto no cumple, y
 * un índice de calidad del aire sin lugar no significa nada. Aquí se nombra la
 * entidad que lo mide, y tocando la tarjeta se llega a ella.
 */
export function AirQualityCard({ entity, metric, onPress }: AirQualityCardProps) {
  const value = Number(metric.value);
  const reading = `${Number.isInteger(value) ? value : String(value).replace('.', ',')}${
    metric.unit ? ` ${metric.unit}` : ''
  }`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Calidad del aire en ${entity.name}: ${metric.label ?? reading}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Ionicons name="leaf-outline" size={20} color={colors.accent} />
      </View>

      <View style={styles.texts}>
        <Text variant="label" color="textSecondary">
          Calidad del aire
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {metric.label ? `${metric.label} · ${reading}` : reading}
        </Text>
        <Text variant="micro" color="textMuted" numberOfLines={1}>
          {entity.name} · actualizado hace {relativeTime(metric.updated_at)}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
