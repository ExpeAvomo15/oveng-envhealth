import { StyleSheet, View } from 'react-native';

import { InfoButton } from '@/components/explain';
import { Text } from '@/components/ui';
import { airLevelColor, type AirLevel, type AirQuality } from '@/lib/air-quality';
import type { ExplainerTopic } from '@/lib/explainers';
import { relativeTime } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';

/**
 * Lo que se pinta de un dato de aire vivo, compartido por el feed, el mapa y el
 * perfil ambiental para que los tres digan lo mismo de la misma forma.
 *
 * **La procedencia siempre está a la vista** (docs/08_DATOS_EN_VIVO.md): una
 * estimación no se disfraza de medición, ni un dato curado de dato de ahora.
 */

/**
 * "Excelente · 16 AQI europeo": palabra primero, índice después. Es el texto de
 * los **nombres accesibles**; en pantalla va partido en `AirValue`.
 */
export function liveAirText(air: AirQuality): string {
  return `${air.label} · ${air.aqi} AQI europeo`;
}

/**
 * El aire en lenguaje llano (F4.3): **la palabra grande y con su color
 * primero**; debajo, pequeño, "Índice de calidad del aire: 16 (escala
 * europea)" y el ⓘ que lo explica. Nada de siglas a la vista: "AQI" solo vive
 * en el nombre accesible y en la explicación.
 */
export function AirValue({ air, size = 'title' }: { air: AirQuality; size?: 'title' | 'bodyStrong' }) {
  return (
    <View style={styles.value}>
      <View style={styles.row}>
        <AirLevelDot level={air.level} size={size === 'title' ? 12 : 10} />
        <Text variant={size} style={styles.shrink} numberOfLines={1}>
          {air.label}
        </Text>
      </View>
      <View style={styles.row}>
        <Text variant="caption" color="textSecondary" style={styles.shrink}>
          Índice de calidad del aire: {air.aqi} (escala europea)
        </Text>
        <InfoButton topic="aqi" about="índice de calidad del aire" size={16} />
      </View>
    </View>
  );
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
  | {
      kind: 'satellite';
      updatedAt: string;
      /** Otra fuente en vivo con la misma forma (F4.3): "Modelo del tiempo Open-Meteo". */
      source?: string;
      sourceA11y?: string;
      icon?: string;
      explain?: ExplainerTopic;
    }
  | { kind: 'reference'; /** De qué lugar es el dato: "Río Ntem". */ of?: string }
  /** Una fuente en vivo sin instante de medida: GBIF acumula, no mide a una hora. */
  | { kind: 'source'; text: string; a11y: string; explain: ExplainerTopic };

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
      <View style={styles.row}>
        <Text
          variant="micro"
          color="textMuted"
          numberOfLines={1}
          accessibilityLabel="Procedencia: dato de referencia del perfil, sin actualización automática">
          📋 Dato de referencia{props.of ? ` · ${props.of}` : ''}
        </Text>
        <InfoButton topic="reference" about="dato de referencia" size={14} />
      </View>
    );
  }

  if (props.kind === 'source') {
    return (
      <View style={styles.row}>
        <Text
          variant="micro"
          color="textMuted"
          numberOfLines={1}
          style={styles.shrink}
          accessibilityLabel={`Procedencia: ${props.a11y}`}>
          {props.text}
        </Text>
        <InfoButton topic={props.explain} about={props.a11y} size={14} />
      </View>
    );
  }

  const ago = relativeTime(props.updatedAt);
  const when = ago === 'ahora' ? 'ahora' : `hace ${ago}`;

  const label = props.source ?? 'Estimación satelital Copernicus';
  return (
    <View style={styles.row}>
      <Text
        variant="micro"
        color="textMuted"
        numberOfLines={1}
        style={styles.shrink}
        accessibilityLabel={`Procedencia: ${props.sourceA11y ?? 'estimación satelital del modelo CAMS de Copernicus, vía Open-Meteo'}, ${when}`}>
        {props.icon ?? '🛰️'} {label} · {when}
      </Text>
      <InfoButton topic={props.explain ?? 'satellite'} about={label.toLowerCase()} size={14} />
    </View>
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
  value: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  shrink: {
    flexShrink: 1,
  },
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
