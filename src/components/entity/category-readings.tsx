import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatMetricValue, type CategoryReading } from '@/lib/metrics';
import { colors, environmentalCategories, radius, spacing } from '@/theme';

/**
 * Fila de categorías: la de cuatro índices del mockup 2 y la de tres tarjetas
 * del mockup 1 son la misma fila con distintos datos.
 *
 * Cada casilla lleva el color y el icono de su categoría, que salen del theme y
 * son los mismos que usan los pines del mapa y las fichas de Buscar.
 *
 * **La unidad se enseña siempre.** En el Ntem conviven un 8,9 sobre 10 y un 8,2
 * de pH; sin la unidad, dos números parecidos parecerían comparables y no lo
 * son. Es la diferencia entre un índice y una medición.
 */
export function CategoryReadings({ readings }: { readings: CategoryReading[] }) {
  return (
    <View style={styles.row}>
      {readings.map(({ metric, category }) => {
        const style = environmentalCategories[category];
        const value = formatMetricValue(Number(metric.value));

        return (
          <View
            key={metric.metric}
            style={styles.cell}
            accessibilityLabel={`${style.label}: ${value} ${metric.unit ?? ''}${
              metric.label ? `, ${metric.label}` : ''
            }`}>
            <View style={[styles.icon, { backgroundColor: style.color }]}>
              <Ionicons name={style.icon} size={16} color={colors[style.onColor]} />
            </View>

            <Text variant="bodyStrong">{value}</Text>
            <Text variant="micro" color="textMuted">
              {metric.unit ?? ''}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              {style.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cell: {
    flexGrow: 1,
    // Cuatro por fila en móvil; con tres o cinco reparten el hueco sin saltos.
    flexBasis: '20%',
    alignItems: 'center',
    gap: 2,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
});
