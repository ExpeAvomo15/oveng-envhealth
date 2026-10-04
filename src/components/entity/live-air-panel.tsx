import { StyleSheet, View } from 'react-native';

import { AirLevelDot, AirSkeleton, liveAirText, ProvenanceLine } from '@/components/air';
import { Text } from '@/components/ui';
import { useLiveAir } from '@/hooks/use-live-air';
import type { EntityMetric } from '@/lib/database.types';
import { formatMetricValue, formatReading } from '@/lib/metrics';
import { colors, radius, spacing } from '@/theme';

export type LiveAirPanelProps = {
  coords: { lat: number; lng: number };
  /** La métrica `aire` curada del perfil, si la tiene. */
  reference: EntityMetric | null;
};

/**
 * "Aire ahora" en el perfil ambiental de un lugar (F4.1).
 *
 * El dato vivo de sus coordenadas va **como principal**, con su etiqueta 🛰️, y
 * el curado del perfil debajo como **referencia**: las dos cosas se enseñan,
 * cada una con su procedencia, y la más reciente no borra a la otra. Ni siquiera
 * están en la misma escala —el vivo es el índice europeo, el curado de los
 * mockups un AQI de otra escala—, así que mezclarlas en una sola cifra sería
 * peor que enseñarlas juntas y nombradas.
 *
 * Aquí, que es el detalle, sí entran los µg/m³. El resto de métricas del perfil
 * no se tocan: siguen curadas y lo dicen (F4.2 ampliará fuentes).
 */
export function LiveAirPanel({ coords, reference }: LiveAirPanelProps) {
  const live = useLiveAir(coords);

  if (live.status === 'unavailable' && !reference) return null;

  return (
    <View style={styles.section}>
      <Text variant="subtitle">Aire ahora</Text>

      <View style={styles.card}>
        {live.status === 'live' ? (
          <View
            style={styles.block}
            accessibilityLabel={`Aire ahora: ${liveAirText(live.air)}. Estimación satelital Copernicus`}>
            <View style={styles.row}>
              <AirLevelDot level={live.air.level} size={12} />
              <Text variant="title" style={styles.shrink}>
                {liveAirText(live.air)}
              </Text>
            </View>
            <Text variant="caption" color="textSecondary">
              {[
                live.air.pm25 !== null ? `PM2.5 ${formatMetricValue(live.air.pm25)} µg/m³` : null,
                live.air.pm10 !== null ? `PM10 ${formatMetricValue(live.air.pm10)} µg/m³` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            <ProvenanceLine kind="satellite" updatedAt={live.air.updatedAt} />
          </View>
        ) : live.status === 'loading' ? (
          <AirSkeleton />
        ) : null}

        {reference ? (
          <View
            style={[styles.block, live.status !== 'unavailable' && styles.referenceDivider]}
            accessibilityLabel={`Referencia del perfil: ${reference.label ?? ''} ${formatReading(reference)}. Dato de referencia`}>
            <Text variant={live.status === 'unavailable' ? 'title' : 'label'}>
              {live.status === 'unavailable' ? '' : 'Referencia del perfil: '}
              {reference.label ? `${reference.label} · ` : ''}
              {formatReading(reference)}
            </Text>
            <ProvenanceLine kind="reference" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  block: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shrink: {
    flexShrink: 1,
  },
  referenceDivider: {
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
