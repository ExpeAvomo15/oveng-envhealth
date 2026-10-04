import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { airLevelColor, type AirLevel, type AirQuality } from '@/lib/air-quality';
import { relativeTime } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';

/**
 * Lo que se pinta de un dato de aire vivo, compartido por el feed, el mapa y el
 * perfil ambiental para que los tres digan lo mismo de la misma forma.
 *
 * **La procedencia siempre está a la vista** (docs/08_DATOS_EN_VIVO.md): una
 * estimación no se disfraza de medición, ni un dato curado de dato de ahora.
 */

/** "Excelente · 16 AQI europeo": palabra primero, índice después. */
export function liveAirText(air: AirQuality): string {
  return `${air.label} · ${air.aqi} AQI europeo`;
}

/** El punto del semáforo. Nunca va solo: siempre acompaña a la palabra. */
export function AirLevelDot({ level, size = 10 }: { level: AirLevel; size?: number }) {
  return (
    <View
      style={[
        styles.dot,
        { width: size, height: size, backgroundColor: airLevelColor(level) },
      ]}
    />
  );
}

export type ProvenanceLineProps =
  | { kind: 'satellite'; updatedAt: string }
  | { kind: 'reference' };

/**
 * La línea pequeña que dice de dónde sale el dato.
 *
 * - 🛰️ Estimación satelital Copernicus · hace 23 min — Open-Meteo, modelo CAMS.
 * - 📋 Dato de referencia — el valor curado del seed, que no se actualiza solo.
 *
 * El nombre accesible lleva la atribución completa que piden las condiciones de
 * Open-Meteo (CAMS de Copernicus, servido por Open-Meteo).
 */
export function ProvenanceLine(props: ProvenanceLineProps) {
  if (props.kind === 'reference') {
    return (
      <Text
        variant="micro"
        color="textMuted"
        numberOfLines={1}
        accessibilityLabel="Procedencia: dato de referencia del perfil, sin actualización automática">
        📋 Dato de referencia
      </Text>
    );
  }

  const ago = relativeTime(props.updatedAt);
  const when = ago === 'ahora' ? 'ahora' : `hace ${ago}`;

  return (
    <Text
      variant="micro"
      color="textMuted"
      numberOfLines={1}
      accessibilityLabel={`Procedencia: estimación satelital del modelo CAMS de Copernicus, vía Open-Meteo, ${when}`}>
      🛰️ Estimación satelital Copernicus · {when}
    </Text>
  );
}

/** Hueco con la forma del dato mientras llega. Sin animación, como los del feed. */
export function AirSkeleton() {
  return (
    <View style={styles.skeleton} accessibilityLabel="Cargando la calidad del aire">
      <View style={[styles.line, { width: '55%', height: 18 }]} />
      <View style={[styles.line, { width: '40%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    borderRadius: radius.full,
  },
  skeleton: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  line: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
});
