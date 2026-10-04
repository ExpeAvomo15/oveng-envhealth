import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  CategoryReadings,
  LiveAirPanel,
  LiveNaturePanel,
  LiveSoilPanel,
  EntityJobs,
  PageAdmin,
  PlacePosts,
  VisitCard,
  EntityCover,
  MetricCards,
  QualityCircle,
  RatingList,
  RatingSheet,
} from '@/components/entity';
import { ProvenanceLine } from '@/components/air';
import { Badge, Button, Callout, Screen, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useEntityAdmin } from '@/hooks/use-entity-admin';
import type { EntityMetric } from '@/lib/database.types';
import {
  EntityFollowsUnavailable,
  entityTypeIcons,
  entityTypeLabels,
  followEntity,
  getEntityBySlug,
  getEntityFollowerCount,
  getEntityMetrics,
  getFollowedEntityIds,
  getMyRating,
  getRatingSummary,
  getRatings,
  rateEntity,
  unfollowEntity,
  type EntityResult,
  type RatingWithAuthor,
} from '@/lib/entities';
import { groupMetrics } from '@/lib/metrics';
import { entityUrl } from '@/lib/site';
import { colors, environmentalCategories, screenPadding, spacing } from '@/theme';

type Loaded = {
  slug: string;
  entity: EntityResult | null;
  metrics: EntityMetric[];
  followers: number;
  following: boolean;
  ratings: RatingWithAuthor[];
  average: number | null;
  count: number;
  mine: { score: number; comment: string | null } | null;
};

async function loadEntity(slug: string, viewerId: string | null): Promise<Loaded> {
  const entity = await getEntityBySlug(slug);
  const vacio = {
    slug,
    entity: null,
    metrics: [],
    followers: 0,
    following: false,
    ratings: [],
    average: null,
    count: 0,
    mine: null,
  };
  if (!entity) return vacio;

  // Todo lo de la ficha en paralelo: no dependen entre sí.
  const [metrics, followers, followed, ratings, summary, mine] = await Promise.all([
    getEntityMetrics(entity.id),
    getEntityFollowerCount(entity.id),
    viewerId ? getFollowedEntityIds(viewerId, [entity.id]) : Promise.resolve(new Set<string>()),
    getRatings(entity.id),
    getRatingSummary(entity.id),
    viewerId ? getMyRating(entity.id, viewerId) : Promise.resolve(null),
  ]);

  return {
    slug,
    entity,
    metrics,
    followers,
    following: followed.has(entity.id),
    ratings,
    average: summary.average,
    count: summary.count,
    mine,
  };
}

/**
 * Perfil ambiental de una entidad.
 *
 * Combina las dos pantallas 4 de los mockups, que son **la misma con distintos
 * datos**: el círculo de calidad general y la fila de subíndices del mockup 2 y
 * las tarjetas de datos del 1. Qué aparece lo decide `groupMetrics` a partir de
 * lo que la entidad tenga en la base, así que Monte Alén sale como el mockup 1
 * —sin círculo, porque no tiene calidad general— y el Ntem como el 2, sin una
 * sola rama por entidad.
 *
 * Se ve **sin cuenta** (F2.3). Seguir y valorar piden sesión y lo dicen.
 */
export default function EntityScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { profile: viewer, session } = useAuth();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState(false);
  const [rating, setRating] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const viewerId = viewer?.id ?? null;
  const current = loaded?.slug === slug ? loaded : null;
  const entity = current?.entity ?? null;

  useEffect(() => {
    if (!slug) return;
    let live = true;

    loadEntity(slug, viewerId)
      .then((data) => {
        if (live) setLoaded(data);
      })
      .catch(() => {
        if (!live) return;
        setLoaded({
          slug,
          entity: null,
          metrics: [],
          followers: 0,
          following: false,
          ratings: [],
          average: null,
          count: 0,
          mine: null,
        });
        showToast('No se ha podido cargar la entidad.');
      });

    return () => {
      live = false;
    };
  }, [slug, viewerId]);

  const grouped = useMemo(() => groupMetrics(current?.metrics ?? []), [current?.metrics]);
  // ¿Administra quien mira esta página? (F4.4)
  const admin = useEntityAdmin(entity?.id ?? null);

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

  async function submitRating(score: number, comment: string) {
    if (!entity || !viewerId) return;

    setRating(true);
    try {
      await rateEntity(entity.id, viewerId, score, comment);

      // La media la calcula la vista, no el cliente: se vuelve a leer en vez de
      // estimarla, que con pocas valoraciones se nota enseguida.
      const [summary, ratings] = await Promise.all([
        getRatingSummary(entity.id),
        getRatings(entity.id),
      ]);

      setLoaded((previous) =>
        previous === null
          ? previous
          : {
              ...previous,
              ratings,
              average: summary.average,
              count: summary.count,
              mine: { score, comment: comment.trim() || null },
            },
      );
      setSheetOpen(false);
      showToast(current?.mine ? 'Valoración actualizada.' : 'Gracias por tu valoración.');
    } catch {
      showToast('No se ha podido guardar tu valoración.');
    } finally {
      setRating(false);
    }
  }

  async function loadMoreRatings() {
    if (!entity || loadingMore || !current) return;

    setLoadingMore(true);
    try {
      const more = await getRatings(entity.id, { offset: current.ratings.length });
      setLoaded((previous) =>
        previous === null ? previous : { ...previous, ratings: [...previous.ratings, ...more] },
      );
    } catch {
      showToast('No se han podido cargar más opiniones.');
    } finally {
      setLoadingMore(false);
    }
  }

  async function share() {
    if (!entity) return;
    const url = entityUrl(entity.slug, pathname);

    try {
      await navigator.clipboard.writeText(url);
      showToast('Enlace copiado al portapapeles.');
    } catch {
      showToast('No se ha podido copiar el enlace.');
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
    <Screen padded={false}>
      <EntityCover
        category={entity.category}
        average={current.average}
        count={current.count}
        onBack={() =>
          router.canGoBack() ? router.back() : router.replace(session === null ? '/mapa' : '/buscar')
        }
        onShare={share}
        // La píldora dice "Sé el primero en valorar": que lleve a valorar, en
        // vez de avisar de que hay que bajar. Sin sesión, a la bienvenida.
        onRate={() => (session === null ? router.push('/welcome') : setSheetOpen(true))}
      />

      <View style={styles.body}>
        <View style={styles.identity}>
          <Text variant="title" accessibilityRole="header">
            {entity.name}
          </Text>

          <View style={styles.badges}>
            <Badge label={entityTypeLabels[entity.type]} tone="accent" icon={entityTypeIcons[entity.type]} />
            <Badge label={category.label} tone="neutral" />
            {/* El estado general del mockup 2 ("Muy bueno"), si lo hay. */}
            {grouped.general?.label ? (
              <Badge label={grouped.general.label} tone="info" />
            ) : null}
            {entity.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={18}
                color={colors.accent}
                accessibilityLabel="Verificada"
              />
            ) : null}
          </View>

          {place ? (
            <View style={styles.placeRow}>
              <Ionicons name="location-outline" size={15} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary">
                {place}
              </Text>
            </View>
          ) : null}

          <Text variant="caption" color="textMuted">
            {current.followers === 1 ? '1 seguidor' : `${current.followers} seguidores`}
          </Text>
        </View>

        {/*
          Sin cuenta se ve todo lo de arriba; seguir y valorar la piden y lo
          dicen en el propio botón. Ver @docs/07_CRECIMIENTO.md.
        */}
        {session === null ? (
          <Button
            label="Inicia sesión para seguir y valorar"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/welcome')}
          />
        ) : (
          <View style={styles.actions}>
            <Button
              label={current.following ? 'Siguiendo' : 'Seguir'}
              variant={current.following ? 'secondary' : 'primary'}
              loading={busy}
              onPress={toggleFollow}
              style={styles.action}
            />
            <Button
              label={current.mine ? 'Cambiar valoración' : 'Valorar'}
              variant="secondary"
              onPress={() => setSheetOpen(true)}
              style={styles.action}
            />
          </View>
        )}

        {entity.description ? <Text variant="body">{entity.description}</Text> : null}

        {/* Modelo LinkedIn adaptado (F4.4): la página la gestionan personas. */}
        <PageAdmin entity={entity} admin={admin} hasSession={session !== null} />

        {entity.type === 'lugar' ? <VisitCard entity={entity} /> : null}

        {/*
          El aire en vivo de sus coordenadas (F4.1), solo en los lugares: son
          los que se miden. Debajo, el aire curado del perfil como referencia.
        */}
        {entity.type === 'lugar' && entity.lat !== null && entity.lng !== null ? (
          <LiveAirPanel
            coords={{ lat: entity.lat, lng: entity.lng }}
            reference={current?.metrics.find((metric) => metric.metric === 'aire') ?? null}
          />
        ) : null}

        {/* Suelo y naturaleza en vivo (F4.3), con la nota curada de la ficha debajo. */}
        {entity.type === 'lugar' && entity.lat !== null && entity.lng !== null ? (
          <>
            <LiveSoilPanel
              coords={{ lat: entity.lat, lng: entity.lng }}
              reference={current?.metrics.find((metric) => metric.metric === 'suelo') ?? null}
            />
            <LiveNaturePanel
              coords={{ lat: entity.lat, lng: entity.lng }}
              reference={current?.metrics.find((metric) => metric.metric === 'biodiversidad') ?? null}
            />
          </>
        ) : null}

        {grouped.general ? (
          <View style={styles.section}>
            <QualityCircle metric={grouped.general} />
            <ProvenanceLine kind="reference" />
          </View>
        ) : null}

        {grouped.categories.length > 0 ? (
          <View style={styles.section}>
            {/*
              "Estado por capa" y no "Índices": para el Ntem son índices sobre
              10, pero para Monte Alén son mediciones crudas —42 AQI, 8,2 pH— y
              llamarlas índices sería falso. El título tiene que valer para las
              dos, porque la fila es la misma.
            */}
            <Text variant="subtitle">Estado por capa</Text>
            <CategoryReadings readings={grouped.categories} />
            {/* Curado: no es dato vivo y lo dice (F4.3 ampliará fuentes). */}
            <ProvenanceLine kind="reference" />
          </View>
        ) : null}

        {grouped.key.length > 0 ? (
          <View style={styles.section}>
            <Text variant="subtitle">Datos clave</Text>
            <MetricCards metrics={grouped.key} />
            <ProvenanceLine kind="reference" />
          </View>
        ) : null}

        {grouped.general === null &&
        grouped.categories.length === 0 &&
        grouped.key.length === 0 ? (
          <View style={styles.section}>
            <Callout tone="info">
              {entity.type === 'lugar'
                ? 'Este lugar todavía no tiene mediciones guardadas en su ficha. Arriba tienes el aire, el suelo y la naturaleza de ahora.'
                : `Esta ${entityTypeLabels[entity.type].toLowerCase()} no tiene mediciones ambientales: las llevan los lugares de Turismo Verde. Lo que la describe es su valoración comunitaria.`}
            </Callout>
          </View>
        ) : null}

        <EntityJobs entity={entity} isAdmin={admin.isAdmin === true} userId={viewerId} />

        {entity.type === 'lugar' ? <PlacePosts entity={entity} viewerId={viewerId} /> : null}

        <View style={styles.section}>
          <View style={styles.ratingsHead}>
            <Text variant="subtitle">Opiniones</Text>
            {current.count > 0 ? (
              <Text variant="caption" color="textSecondary">
                {String(current.average).replace('.', ',')} de 5 · {current.count}
              </Text>
            ) : null}
          </View>

          <RatingList
            ratings={current.ratings}
            hasMore={current.ratings.length < current.count}
            loadingMore={loadingMore}
            onLoadMore={loadMoreRatings}
          />
        </View>
      </View>

      {/*
        La hoja se monta solo cuando se abre, con una clave que incluye la
        valoración propia: así entra siempre rellenada con lo que hay ahora.
      */}
      {sheetOpen ? (
        <RatingSheet
          key={`${current.mine?.score ?? 0}-${current.mine?.comment ?? ''}`}
          visible
          entityName={entity.name}
          current={current.mine}
          busy={rating}
          onClose={() => setSheetOpen(false)}
          onSubmit={submitRating}
        />
      ) : null}
    </Screen>
  );
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
  body: {
    gap: spacing.lg,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
  },
  identity: {
    gap: spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
  section: {
    gap: spacing.md,
  },
  ratingsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
