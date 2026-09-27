import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { EntityMetric, EntityMetricName } from '@/lib/database.types';
import { formatReading, metricLabel } from '@/lib/metrics';
import { colors, radius, spacing } from '@/theme';

/** Icono de las métricas que no son una categoría ambiental. */
const ICONS: Partial<Record<EntityMetricName, 'leaf-outline' | 'thermometer-outline' | 'cloud-outline'>> = {
  cobertura_forestal: 'leaf-outline',
  temperatura_media: 'thermometer-outline',
  aire: 'cloud-outline',
};

/**
 * "Datos clave" en dos columnas, como los mockups.
 *
 * Aquí caen las métricas que no son una categoría: la cobertura forestal y la
 * temperatura, y también el AQI del Ntem, que baja de la fila de arriba cuando
 * ahí ya está el subíndice de aire. Ver `groupMetrics`.
 */
export function MetricCards({ metrics }: { metrics: EntityMetric[] }) {
  return (
    <View style={styles.grid}>
      {metrics.map((metric) => (
        <View
          key={metric.metric}
          style={styles.card}
          accessibilityLabel={`${metricLabel(metric.metric)}: ${formatReading(metric)}${
            metric.label ? `, ${metric.label}` : ''
          }`}>
          <View style={styles.head}>
            <Ionicons
              name={ICONS[metric.metric] ?? 'analytics-outline'}
              size={16}
              color={colors.accent}
            />
            <Text variant="micro" color="textSecondary" numberOfLines={2} style={styles.name}>
              {metricLabel(metric.metric)}
            </Text>
          </View>

          <Text variant="subtitle">{formatReading(metric)}</Text>
          {metric.label ? (
            <Text variant="caption" color="textSecondary">
              {metric.label}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  card: {
    flexGrow: 1,
    // Dos columnas: 48 % deja sitio al hueco entre tarjetas.
    flexBasis: '44%',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flex: 1,
  },
});
