import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AirSkeleton, ProvenanceLine } from '@/components/air';
import { InfoButton } from '@/components/explain';
import { Text } from '@/components/ui';
import type { Live } from '@/hooks/use-live';
import type { EntityMetric, EnvironmentalCategoryName } from '@/lib/database.types';
import type { EntityResult } from '@/lib/entities';
import { NATURE_RADIUS_KM, natureText, type LiveNature } from '@/lib/live-nature';
import { soilLevel, type LiveSoil } from '@/lib/live-soil';
import { formatReading } from '@/lib/metrics';
import { colors, environmentalCategories, radius, shadows, spacing } from '@/theme';

/**
 * Las tarjetas flotantes del mapa **por capa** (F4.3). La del aire es
 * `AirQualityCard`; estas son las demás.
 *
 * Cada una enseña el dato de su capa —real, o honestamente ausente—, con su
 * procedencia y su ⓘ. Ninguna inventa: lo que no tiene fuente mundial, pública
 * y sin clave (docs/08_DATOS_EN_VIVO.md) sale como dato de referencia de una
 * entidad, o no sale.
 */

function Shell({
  category,
  title,
  label,
  children,
  link,
}: {
  category: EnvironmentalCategoryName;
  title: string;
  /** Nombre accesible del dato entero, para lectores de pantalla y pruebas. */
  label: string;
  children: ReactNode;
  /** Enlace a una entidad: su propio pulsable, al lado y no alrededor. */
  link?: { label: string; onPress: () => void } | null;
}) {
  const style = environmentalCategories[category];

  return (
    <View style={styles.card} accessibilityLabel={label}>
      <View style={[styles.icon, { backgroundColor: style.color }]}>
        <Ionicons name={style.icon} size={18} color={colors[style.onColor]} />
      </View>
      <View style={styles.texts}>
        <Text variant="label" color="textSecondary">
          {title}
        </Text>
        {children}
      </View>
      {link ? (
        <Pressable
          onPress={link.onPress}
          accessibilityRole="link"
          accessibilityLabel={link.label}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

function Dot({ color }: { color: string }) {
  return <View style={[styles.dot, { backgroundColor: color }]} />;
}

/** Humedad del suelo en vivo (Open-Meteo). */
export function SoilCard({
  live,
  where,
  whereLine,
}: {
  live: Live<LiveSoil>;
  /** Para frases: "el centro del mapa", "Duala · Camerún". */
  where: string;
  /** Para la línea suelta: "Centro del mapa · 2,10 N · 9,90 E". */
  whereLine: string;
}) {
  if (live.status === 'loading') {
    return (
      <Shell category="suelo" title="Suelo" label="Cargando el suelo">
        <AirSkeleton />
      </Shell>
    );
  }

  if (live.status === 'unavailable') {
    return (
      <Shell category="suelo" title="Suelo" label="Suelo: no disponible ahora">
        <Text variant="caption" color="textSecondary">
          No hemos podido cargar el suelo de esta zona ahora. Mueve el mapa para volver a intentarlo.
        </Text>
      </Shell>
    );
  }

  const soil = live.value;
  if (soil.kind === 'water-body') {
    return (
      <Shell category="suelo" title="Suelo" label={`Suelo en ${where}: aquí es mar o agua, no hay suelo que medir`}>
        <Text variant="bodyStrong">Aquí es mar o agua</Text>
        <Text variant="caption" color="textSecondary">
          No hay suelo que medir en este punto. Mueve el mapa a tierra.
        </Text>
      </Shell>
    );
  }

  const band = soilLevel(soil.percent);
  return (
    <Shell
      category="suelo"
      title="Suelo"
      label={`Suelo en ${where}: ${soil.label}, ${soil.percent} % de humedad. Estimación del modelo del tiempo`}>
      <Row>
        <Dot color={colors[band.color]} />
        <Text variant="bodyStrong">{soil.label}</Text>
      </Row>
      <Row>
        <Text variant="caption" color="textSecondary" style={styles.shrink}>
          Humedad: {soil.percent} % de agua en la capa de arriba
        </Text>
        <InfoButton topic="soil" about="humedad del suelo" size={14} />
      </Row>
      <Text variant="micro" color="textMuted" numberOfLines={1}>
        {whereLine}
      </Text>
      <ProvenanceLine
        kind="satellite"
        updatedAt={soil.updatedAt}
        icon="🌦️"
        source="Modelo del tiempo Open-Meteo"
        sourceA11y="estimación del modelo del tiempo de Open-Meteo"
        explain="soil"
      />
    </Shell>
  );
}

/** "de Duala", pero "del centro del mapa": la contracción que pide el español. */
function deWhere(where: string): string {
  return where.startsWith('el ') ? `del ${where.slice(3)}` : `de ${where}`;
}

/** Naturaleza registrada en 10 km (GBIF). */
export function NatureCard({ live, where }: { live: Live<LiveNature>; where: string }) {
  const title = 'Naturaleza registrada cerca';

  if (live.status === 'loading') {
    return (
      <Shell category="biodiversidad" title={title} label="Cargando la naturaleza registrada">
        <AirSkeleton />
      </Shell>
    );
  }

  if (live.status === 'unavailable') {
    return (
      <Shell category="biodiversidad" title={title} label="Naturaleza registrada: no disponible ahora">
        <Text variant="caption" color="textSecondary">
          No hemos podido consultar GBIF ahora. Mueve el mapa para volver a intentarlo.
        </Text>
      </Shell>
    );
  }

  const text = natureText(live.value);
  return (
    <Shell category="biodiversidad" title={title} label={`Naturaleza registrada cerca ${deWhere(where)}: ${text}. Fuente GBIF`}>
      <Row>
        <Text variant="bodyStrong" style={styles.shrink}>
          {text}
        </Text>
        <InfoButton topic="nature" about="naturaleza registrada" size={14} />
      </Row>
      <Text variant="micro" color="textMuted" numberOfLines={1}>
        a menos de {NATURE_RADIUS_KM} km {deWhere(where)}
      </Text>
      <ProvenanceLine
        kind="source"
        text="🔎 GBIF, red mundial de biodiversidad"
        a11y="GBIF, la red mundial pública de datos de biodiversidad"
        explain="nature"
      />
    </Shell>
  );
}

/**
 * Agua: **sin fuente mundial en vivo**. Si en lo que se ve hay un lugar con
 * medición de agua en su ficha, su dato de referencia; si no, se dice.
 */
export function WaterCard({
  reference,
  onOpen,
}: {
  reference: { entity: EntityResult; metric: EntityMetric } | null;
  onOpen: (entity: EntityResult) => void;
}) {
  if (!reference) {
    return (
      <Shell category="agua" title="Agua" label="Agua: aún no hay datos de agua en vivo para esta zona">
        <Row>
          <Text variant="bodyStrong" style={styles.shrink}>
            Aún no hay datos de agua en vivo para esta zona
          </Text>
          <InfoButton topic="water" about="por qué no hay datos de agua" size={14} />
        </Row>
        <Text variant="caption" color="textSecondary">
          Nadie mide la calidad del agua en todo el mundo. OVENG solo enseña datos con fuente.
        </Text>
      </Shell>
    );
  }

  const { entity, metric } = reference;
  return (
    <Shell
      category="agua"
      title="Agua"
      label={`Agua en ${entity.name}: ${metric.label ?? ''} ${formatReading(metric)}. Dato de referencia`}
      link={{ label: `Ver la ficha de ${entity.name}`, onPress: () => onOpen(entity) }}>
      <Text variant="bodyStrong">{metric.label ?? formatReading(metric)}</Text>
      <Row>
        <Text variant="caption" color="textSecondary" style={styles.shrink}>
          {metric.unit === 'pH' ? `pH de la ficha: ${formatReading(metric).replace(' pH', '')}` : formatReading(metric)}
        </Text>
        <InfoButton topic="ph" about="pH" size={14} />
      </Row>
      <ProvenanceLine kind="reference" of={entity.name} />
    </Shell>
  );
}

const TYPE_WORDS = {
  empresa: ['empresa', 'empresas'],
  iniciativa: ['iniciativa', 'iniciativas'],
  lugar: ['lugar', 'lugares'],
} as const;

/**
 * Energía y residuos: no hay dato del entorno que enseñar, y **no se inventa**.
 * Lo que sí hay son las entidades de esa capa en lo que se ve.
 */
export function CountCard({
  category,
  entities,
}: {
  category: 'energia' | 'residuos';
  entities: EntityResult[];
}) {
  const name = environmentalCategories[category].label.toLowerCase();
  const counts = (['empresa', 'iniciativa', 'lugar'] as const)
    .map((type) => [type, entities.filter((entity) => entity.type === type).length] as const)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${count} ${TYPE_WORDS[type][count === 1 ? 0 : 1]}`);

  const text =
    counts.length === 0
      ? `No hay empresas ni iniciativas de ${name} en esta parte del mapa`
      : `${counts.length > 1 ? `${counts.slice(0, -1).join(', ')} y ${counts.at(-1)}` : counts[0]} de ${name} por aquí`;

  return (
    <Shell category={category} title={environmentalCategories[category].label} label={`${environmentalCategories[category].label}: ${text}`}>
      <Row>
        <Text variant="bodyStrong" style={styles.shrink}>
          {text}
        </Text>
        <InfoButton topic="entities-count" about={`qué se cuenta en ${name}`} size={14} />
      </Row>
      <Text variant="caption" color="textSecondary">
        De esta capa no hay un dato del entorno en vivo: contamos quién trabaja en ella.
      </Text>
    </Shell>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  shrink: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
