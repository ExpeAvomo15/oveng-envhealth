import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export type RatingBadgeProps = {
  /** Media de valoraciones, o `null` si la entidad no tiene ninguna. */
  average: number | null;
  count: number;
};

/** Cuenta compacta: 856 → "856", 1200 → "1,2k". */
export function compactCount(count: number): string {
  if (count < 1000) return String(count);
  const thousands = count / 1000;
  const rounded = thousands < 10 ? thousands.toFixed(1).replace('.', ',') : String(Math.round(thousands));
  return `${rounded.replace(',0', '')}k`;
}

/**
 * Valoración comunitaria en píldora verde, como en la pantalla 2 del mockup 1.
 *
 * **Sin valoraciones dice "Nuevo", no "0,0".** El seed no trae ninguna —una
 * valoración necesita una persona real detrás— así que hoy es el caso normal,
 * no el raro. Un 0,0 en la ficha se lee como "valorada pésimamente", que es lo
 * contrario de lo que pasa; y en una red cuya tesis es que la valoración
 * comunitaria pesa, arrancar acusando a todo el directorio de un cero sería
 * mentir sobre el único dato que importa.
 */
export function RatingBadge({ average, count }: RatingBadgeProps) {
  if (average === null || count === 0) {
    return (
      <View style={[styles.badge, styles.fresh]} accessibilityLabel="Todavía sin valoraciones">
        <Text variant="micro" color="textSecondary">
          Nuevo
        </Text>
      </View>
    );
  }

  const value = average.toFixed(1).replace('.', ',');

  return (
    <View
      style={styles.badge}
      accessibilityLabel={`Valoración ${value} de 5, ${count} valoraciones`}>
      <Ionicons name="star" size={11} color={colors.textInverse} />
      <Text variant="micro" color="textInverse">
        {value} ({compactCount(count)})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
  },
  fresh: {
    backgroundColor: colors.surfaceMuted,
  },
});
