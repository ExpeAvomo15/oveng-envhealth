import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { EntityMetric } from '@/lib/database.types';
import { formatMetricValue } from '@/lib/metrics';
import { colors, radius, spacing } from '@/theme';

/**
 * El círculo grande de calidad general del mockup 2.
 *
 * **Solo se pinta si la entidad tiene la métrica `calidad_general`.** El Río
 * Ntem la tiene (8.7/10) y Monte Alén no, porque el mockup 1 no la enseña y
 * F2.1 se negó a inventarla. Un círculo con un hueco, o peor, con un número
 * calculado a ojo, rompería la trazabilidad que costó conseguir.
 */
export function QualityCircle({ metric }: { metric: EntityMetric }) {
  const value = formatMetricValue(Number(metric.value));

  return (
    <View style={styles.row}>
      <View
        style={styles.circle}
        accessibilityLabel={`Calidad ambiental general ${value} sobre 10${
          metric.label ? `, ${metric.label}` : ''
        }`}>
        <Text variant="display" color="accent">
          {value}
        </Text>
        <Text variant="micro" color="textSecondary">
          {metric.unit ?? '/10'}
        </Text>
      </View>

      <View style={styles.texts}>
        <Text variant="subtitle">Calidad ambiental general</Text>
        {metric.label ? (
          <Text variant="caption" color="textSecondary">
            {metric.label}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  circle: {
    width: 92,
    height: 92,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.accent,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
});
