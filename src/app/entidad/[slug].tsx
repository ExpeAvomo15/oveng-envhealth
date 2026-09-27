import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { EntityAvatar, RatingBadge } from '@/components/search';
import { Button, Callout, Card, Screen, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import type { EntityMetric } from '@/lib/database.types';
import {
  EntityFollowsUnavailable,
  entityTypeLabels,
  followEntity,
  getEntityBySlug,
  getEntityFollowerCount,
  getEntityMetrics,
  getFollowedEntityIds,
  unfollowEntity,
  type EntityResult,
} from '@/lib/entities';
import { colors, environmentalCategories, radius, screenPadding, spacing } from '@/theme';

type Loaded = {
  slug: string;
  entity: EntityResult | null;
  metrics: EntityMetric[];
  followers: number;
  following: boolean;
};

async function loadEntity(slug: string, viewerId: string | null): Promise<Loaded> {
  const entity = await getEntityBySlug(slug);
  if (!entity) return { slug, entity: null, metrics: [], followers: 0, following: false };

  const [metrics, followers, followed] = await Promise.all([
    getEntityMetrics(entity.id),
    getEntityFollowerCount(entity.id),
    viewerId ? getFollowedEntityIds(viewerId, [entity.id]) : Promise.resolve(new Set<string>()),
  ]);

  return { slug, entity, metrics, followers, following: followed.has(entity.id) };
}

/**
 * Ficha de una entidad. **Mínima a propósito.**
 *
 * Enseña lo que hay en la base y nada más: identidad, ubicación, descripción y
 * las métricas en bruto. El perfil ambiental de verdad —los índices con su
 * escala, la evolución, la comparación con la media— es F2.4, y adelantarlo
 * aquí a medias significaría construirlo dos veces. Lo que sí hace falta ya es
 * que desde Buscar se pueda llegar a algo y seguirlo.
 */
export default function EntityScreen() {
  const router = useRouter();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { profile: viewer, session } = useAuth();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);

  const viewerId = viewer?.id ?? null;
  const current = loaded?.slug === slug ? loaded : null;
  const entity = current?.entity ?? null;

  useEffect(() => {
    if (!slug) return;
    let active = true;

    loadEntity(slug, viewerId)
      .then((data) => {
        if (active) setLoaded(data);
      })
      .catch(() => {
        if (!active) return;
        setLoaded({ slug, entity: null, metrics: [], followers: 0, following: false });
        showToast('No se ha podido cargar la entidad.');
      });

    return () => {
      active = false;
    };
  }, [slug, viewerId]);

  async function toggleFollow() {
    if (!entity || !viewerId || busy) return;

    const next = !current?.following;
    setBusy(true);
    setLoaded((previous) =>
      previous === null
        ? previous
        : {
            ...previous,
            following: next,
            followers: Math.max(0, previous.followers + (next ? 1 : -1)),
          },
    );

    try {
      if (next) await followEntity(viewerId, entity.id);
      else await unfollowEntity(viewerId, entity.id);
    } catch (caught) {
      setLoaded((previous) =>
        previous === null
          ? previous
          : {
              ...previous,
              following: !next,
              followers: Math.max(0, previous.followers + (next ? -1 : 1)),
            },
      );
      showToast(
        caught instanceof EntityFollowsUnavailable
          ? 'Seguir entidades todavía no está disponible.'
          : next
            ? 'No se ha podido seguir la entidad.'
            : 'No se ha podido dejar de seguir.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (current === null) {
    return (
      <Screen scroll={false}>
        <View style={styles.centeredFill}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!entity) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text variant="title">Esa entidad no existe</Text>
          <Text variant="body" color="textSecondary">
            No hay ninguna entidad con el identificador «{slug}».
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  const category = environmentalCategories[entity.category];
  const place = [entity.location_name, entity.country].filter(Boolean).join(' · ');

  return (
    <Screen>
      <View style={styles.backRow}>
        <Pressable
          onPress={() =>
            router.canGoBack()
              ? router.back()
              : // Sin sesión, Buscar no existe en el árbol: la salida es el mapa,
                // que es la otra pantalla pública.
                router.replace(session === null ? '/mapa' : '/buscar')
          }
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.identity}>
        <EntityAvatar category={entity.category} size={72} />

        <View style={styles.nameRow}>
          {/* Es el encabezado de la pantalla: anunciarlo como tal deja que un
              lector de pantalla salte aquí, y da un nombre estable al que
              apuntar desde las comprobaciones. */}
          <Text variant="title" accessibilityRole="header" style={styles.name}>
            {entity.name}
          </Text>
          {entity.verified ? (
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={colors.accent}
              accessibilityLabel="Verificada"
            />
          ) : null}
        </View>

        <Text
          variant="caption"
          color="textSecondary"
          accessibilityLabel={`${entityTypeLabels[entity.type]} · ${category.label}`}>
          {entityTypeLabels[entity.type]} · {category.label}
        </Text>

        {place ? (
          <View style={styles.placeRow}>
            <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
            <Text variant="caption" color="textSecondary">
              {place}
            </Text>
          </View>
        ) : null}

        <RatingBadge average={entity.ratingAverage} count={entity.ratingsCount} />

        <Text variant="caption" color="textMuted">
          {current.followers === 1 ? '1 seguidor' : `${current.followers} seguidores`}
        </Text>
      </View>

      {/*
        Esta ficha se ve sin cuenta (F2.3). Seguir sí la exige, y el botón lo
        dice en vez de no responder: el valor se enseña primero y la cuenta se
        pide cuando hace falta. Ver @docs/07_CRECIMIENTO.md.
      */}
      {session === null ? (
        <Button
          label="Inicia sesión para seguir"
          variant="secondary"
          fullWidth
          onPress={() => router.push('/welcome')}
        />
      ) : (
        <Button
          label={current.following ? 'Siguiendo' : 'Seguir'}
          variant={current.following ? 'secondary' : 'primary'}
          fullWidth
          loading={busy}
          onPress={toggleFollow}
        />
      )}

      {entity.description ? (
        <View style={styles.section}>
          <Text variant="body">{entity.description}</Text>
        </View>
      ) : null}

      {current.metrics.length > 0 ? (
        <View style={styles.section}>
          <Text variant="subtitle">Datos ambientales</Text>
          <Card>
            <View style={styles.metrics}>
              {current.metrics.map((metric) => (
                <View key={metric.metric} style={styles.metricRow}>
                  <Text variant="caption" color="textSecondary" style={styles.metricName}>
                    {metricLabel(metric.metric)}
                  </Text>
                  <Text variant="bodyStrong">
                    {formatValue(metric.value)}
                    {metric.unit ? ` ${metric.unit}` : ''}
                    {metric.label ? ` · ${metric.label}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </Card>
        </View>
      ) : null}

      <View style={styles.section}>
        <Callout tone="info">Perfil ambiental completo en F2.4.</Callout>
      </View>
    </Screen>
  );
}

/** `cobertura_forestal` → "Cobertura forestal". Sin tabla de traducción: en bruto. */
function metricLabel(metric: string): string {
  const words = metric.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** 42 → "42"; 8.2 → "8,2". Coma decimal, que es lo que se lee en español. */
function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
}

const styles = StyleSheet.create({
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.md,
  },
  backRow: {
    paddingTop: spacing.md,
    marginLeft: -spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identity: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: screenPadding,
  },
  name: {
    textAlign: 'center',
    flexShrink: 1,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
    paddingTop: spacing.xl,
  },
  metrics: {
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  metricName: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
