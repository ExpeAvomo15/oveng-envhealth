import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AirSkeleton, AirValue, liveAirText, ProvenanceLine } from '@/components/air';
import { InfoButton } from '@/components/explain';
import { Text } from '@/components/ui';
import { useLiveNature, useLiveSoil } from '@/hooks/use-live';
import { useLiveAir } from '@/hooks/use-live-air';
import type { EntityMetric } from '@/lib/database.types';
import { explainerForMetric } from '@/lib/explainers';
import { NATURE_RADIUS_KM, natureText } from '@/lib/live-nature';
import { soilLevel } from '@/lib/live-soil';
import { formatMetricValue, formatReading } from '@/lib/metrics';
import { colors, radius, spacing } from '@/theme';

type Coords = { lat: number; lng: number };

export type LiveAirPanelProps = {
  coords: Coords;
  /** La métrica `aire` curada del perfil, si la tiene. */
  reference: EntityMetric | null;
};

/**
 * "Aire ahora" en el perfil ambiental de un lugar (F4.1, en lenguaje llano
 * desde F4.3).
 *
 * El dato vivo de sus coordenadas va **como principal**, con su etiqueta 🛰️, y
 * el curado del perfil debajo como **referencia**: las dos cosas se enseñan,
 * cada una con su procedencia, y la más reciente no borra a la otra. Ni siquiera
 * están en la misma escala —el vivo es el índice europeo, el curado de los
 * mockups un índice de otra escala—, así que mezclarlas en una sola cifra sería
 * peor que enseñarlas juntas y nombradas.
 *
 * Aquí, que es el detalle, sí entra el polvo fino en µg/m³, con su palabra y su
 * explicación.
 */
export function LiveAirPanel({ coords, reference }: LiveAirPanelProps) {
  const live = useLiveAir(coords);

  if (live.status === 'unavailable' && !reference) return null;

  return (
    <Panel title="Aire ahora">
      {live.status === 'live' ? (
        <View
          style={styles.block}
          accessibilityLabel={`Aire ahora: ${liveAirText(live.air)}. Estimación satelital Copernicus`}>
          <AirValue air={live.air} />
          {live.air.pm25 !== null || live.air.pm10 !== null ? (
            <View style={styles.row}>
              <Text variant="caption" color="textSecondary" style={styles.shrink}>
                Polvo fino:{' '}
                {[
                  live.air.pm25 !== null ? `PM2.5 ${formatMetricValue(live.air.pm25)} µg/m³` : null,
                  live.air.pm10 !== null ? `PM10 ${formatMetricValue(live.air.pm10)} µg/m³` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <InfoButton topic="pm" about="polvo fino" size={14} />
            </View>
          ) : null}
          <ProvenanceLine kind="satellite" updatedAt={live.air.updatedAt} />
        </View>
      ) : live.status === 'loading' ? (
        <AirSkeleton />
      ) : null}

      {reference ? (
        <Reference metric={reference} main={live.status === 'unavailable'} />
      ) : null}
    </Panel>
  );
}

/**
 * "Suelo ahora" (F4.3): la humedad del suelo en vivo en las coordenadas del
 * lugar y, debajo, la nota curada de suelo de la ficha si la tiene. Son cosas
 * distintas —una cuánta agua tiene la tierra hoy, la otra cómo es su suelo— y
 * se enseñan juntas y nombradas.
 */
export function LiveSoilPanel({ coords, reference }: { coords: Coords; reference: EntityMetric | null }) {
  const live = useLiveSoil(coords);

  if (live.status === 'unavailable' && !reference) return null;
  if (live.status === 'live' && live.value.kind === 'water-body' && !reference) return null;

  return (
    <Panel title="Suelo ahora">
      {live.status === 'live' && live.value.kind === 'soil' ? (
        <View
          style={styles.block}
          accessibilityLabel={`Suelo ahora: ${live.value.label}, ${live.value.percent} % de humedad. Estimación del modelo del tiempo`}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: colors[soilLevel(live.value.percent).color] }]} />
            <Text variant="title">{live.value.label}</Text>
          </View>
          <View style={styles.row}>
            <Text variant="caption" color="textSecondary" style={styles.shrink}>
              Humedad: {live.value.percent} % de agua en la capa de arriba
            </Text>
            <InfoButton topic="soil" about="humedad del suelo" size={14} />
          </View>
          <ProvenanceLine
            kind="satellite"
            updatedAt={live.value.updatedAt}
            icon="🌦️"
            source="Modelo del tiempo Open-Meteo"
            sourceA11y="estimación del modelo del tiempo de Open-Meteo"
            explain="soil"
          />
        </View>
      ) : live.status === 'loading' ? (
        <AirSkeleton />
      ) : null}

      {reference ? <Reference metric={reference} main={live.status !== 'live'} /> : null}
    </Panel>
  );
}

/**
 * "Naturaleza cerca" (F4.3): lo registrado en GBIF a menos de 10 km y, debajo,
 * la nota curada de biodiversidad de la ficha si la tiene.
 */
export function LiveNaturePanel({ coords, reference }: { coords: Coords; reference: EntityMetric | null }) {
  const live = useLiveNature(coords);

  if (live.status === 'unavailable' && !reference) return null;

  return (
    <Panel title="Naturaleza cerca">
      {live.status === 'live' ? (
        <View
          style={styles.block}
          accessibilityLabel={`Naturaleza registrada cerca: ${natureText(live.value)}. Fuente GBIF`}>
          <View style={styles.row}>
            <Text variant="bodyStrong" style={styles.shrink}>
              {natureText(live.value)}
            </Text>
            <InfoButton topic="nature" about="naturaleza registrada" size={14} />
          </View>
          <Text variant="caption" color="textSecondary">
            registradas a menos de {NATURE_RADIUS_KM} km
          </Text>
          <ProvenanceLine
            kind="source"
            text="🔎 GBIF, red mundial de biodiversidad"
            a11y="GBIF, la red mundial pública de datos de biodiversidad"
            explain="nature"
          />
        </View>
      ) : live.status === 'loading' ? (
        <AirSkeleton />
      ) : null}

      {reference ? <Reference metric={reference} main={live.status === 'unavailable'} /> : null}
    </Panel>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

/** El dato curado de la ficha, como referencia: palabra primero, cifra y ⓘ después. */
function Reference({ metric, main }: { metric: EntityMetric; main: boolean }) {
  const reading = formatReading(metric);
  return (
    <View
      style={[styles.block, !main && styles.referenceDivider]}
      accessibilityLabel={`Referencia del perfil: ${metric.label ?? ''} ${reading}. Dato de referencia`}>
      <View style={styles.row}>
        <Text variant={main ? 'title' : 'label'} style={styles.shrink}>
          {main ? '' : 'Referencia del perfil: '}
          {metric.label ? `${metric.label} · ` : ''}
          {reading}
        </Text>
        <InfoButton topic={explainerForMetric(metric.metric)} about={`${metric.metric.replace(/_/g, ' ')} de la ficha`} size={14} />
      </View>
      <ProvenanceLine kind="reference" />
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
    gap: spacing.xs,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
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
