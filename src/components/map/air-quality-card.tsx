import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AirSkeleton, AirValue, liveAirText, ProvenanceLine } from '@/components/air';
import { InfoButton } from '@/components/explain';
import { Text } from '@/components/ui';
import type { LiveAir } from '@/hooks/use-live-air';
import type { EntityMetric } from '@/lib/database.types';
import type { EntityResult } from '@/lib/entities';
import { formatReading } from '@/lib/metrics';
import { colors, radius, shadows, spacing } from '@/theme';

import type { MapCenter } from './types';

export type AirQualityCardProps = {
  /** Aire en vivo del centro del encuadre. */
  live: LiveAir;
  /** El punto del que se pidió: el centro del mapa al soltarlo. */
  center: MapCenter;
  /**
   * Nombre del punto si es uno elegido (F4.2): un lugar buscado ("Duala ·
   * Región del Litoral, Camerún") o "Tu ubicación". Sin él, "Centro del mapa"
   * y las coordenadas.
   */
  placeName?: string | null;
  /**
   * La medición curada más cercana al centro, para cuando la API no responde.
   * `null` si no hay ninguna visible.
   */
  fallback: { entity: EntityResult; metric: EntityMetric } | null;
  onOpenFallback: (entity: EntityResult) => void;
};

/**
 * "Calidad del aire" sobre el mapa: el aire **en vivo** del centro del
 * encuadre (F4.1).
 *
 * Es lo que hace real "cualquier zona del mundo": llevar el mapa a Douala o a
 * Sevilla cambia el dato, porque Open-Meteo responde en cualquier coordenada.
 * Se recalcula al soltar el mapa, no en cada fotograma, y la celda se reutiliza
 * de la caché.
 *
 * Si la API no responde, vuelve a ser lo que era en F2.3: la medición curada
 * de la entidad más cercana, nombrándola y llevando a ella, con la etiqueta
 * "📋 Dato de referencia".
 */
export function AirQualityCard({
  live,
  center,
  placeName = null,
  fallback,
  onOpenFallback,
}: AirQualityCardProps) {
  if (live.status === 'live') {
    const place = placeName ?? `Centro del mapa · ${formatCoords(center)}`;
    const where = placeName ?? `el centro del mapa (${formatCoords(center)})`;
    return (
      <View
        style={styles.card}
        accessibilityLabel={`Calidad del aire en ${where}: ${liveAirText(live.air)}. Estimación satelital Copernicus`}>
        <Icon />
        <View style={styles.texts}>
          <Text variant="label" color="textSecondary">
            Calidad del aire
          </Text>
          <AirValue air={live.air} size="bodyStrong" />
          <Text variant="micro" color="textMuted" numberOfLines={1}>
            {place}
          </Text>
          <ProvenanceLine kind="satellite" updatedAt={live.air.updatedAt} />
        </View>
      </View>
    );
  }

  if (live.status === 'loading') {
    return (
      <View style={styles.card}>
        <Icon />
        <View style={styles.texts}>
          <Text variant="label" color="textSecondary">
            Calidad del aire
          </Text>
          <AirSkeleton />
        </View>
      </View>
    );
  }

  if (!fallback) {
    return (
      <View style={styles.card}>
        <Icon />
        <View style={styles.texts}>
          <Text variant="label" color="textSecondary">
            Calidad del aire
          </Text>
          <Text variant="caption" color="textSecondary">
            No se ha podido cargar el dato de esta zona. Mueve el mapa para volver a intentarlo.
          </Text>
        </View>
      </View>
    );
  }

  const { entity, metric } = fallback;
  const reading = formatReading(metric);

  // No es un único pulsable: lleva ⓘ dentro, y en web el toque burbujearía.
  return (
    <View
      style={styles.card}
      accessibilityLabel={`Calidad del aire en ${entity.name}: ${metric.label ?? reading}. Dato de referencia`}>
      <Icon />
      <View style={styles.texts}>
        <Text variant="label" color="textSecondary">
          Calidad del aire
        </Text>
        <Text variant="bodyStrong" numberOfLines={1}>
          {metric.label ?? reading}
        </Text>
        <View style={styles.liveRow}>
          <Text variant="caption" color="textSecondary" style={styles.shrink}>
            Índice de la ficha: {reading}
          </Text>
          <InfoButton topic="aqi-reference" about="índice de aire de la ficha" size={14} />
        </View>
        <ProvenanceLine kind="reference" of={entity.name} />
      </View>

      <Pressable
        onPress={() => onOpenFallback(entity)}
        accessibilityRole="link"
        accessibilityLabel={`Ver la ficha de ${entity.name}`}
        hitSlop={8}
        style={({ pressed }) => pressed && styles.pressed}>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

function Icon() {
  return (
    <View style={styles.icon}>
      <Ionicons name="leaf-outline" size={20} color={colors.accent} />
    </View>
  );
}

/** "1,90 N · 9,80 E": dos decimales, que es más de lo que resuelve el modelo. */
function formatCoords({ lat, lng }: MapCenter): string {
  const part = (value: number, positive: string, negative: string) =>
    `${Math.abs(value).toFixed(2).replace('.', ',')} ${value >= 0 ? positive : negative}`;
  return `${part(lat, 'N', 'S')} · ${part(lng, 'E', 'O')}`;
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
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shrink: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
