import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  FeaturedCard,
  FeedToggle,
  PostCard,
  PostSkeleton,
  ZoneDataCard,
} from '@/components/feed';
import { HomeHeader } from '@/components/navigation/home-header';
import { TabBar } from '@/components/navigation/tab-bar';
import { Button, Callout, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useFeed } from '@/hooks/use-feed';
import { useZone } from '@/hooks/use-zone';
import { buildFeedRows, type FeedRow } from '@/lib/feed-rows';
import type { FeedMode } from '@/lib/feed';
import { colors, maxContentWidth, radius, screenPadding, spacing } from '@/theme';

/** Inicio — el feed. */
/**
 * Inicio — el feed, y la puerta de entrada.
 *
 * **Se ve sin cuenta desde F2.6.** Es el principio de utilidad individual de
 * @docs/07_CRECIMIENTO.md llevado a la pantalla que más se abre: quien llega
 * ve contenido antes de que se le pida nada. Publicar, dar "me gusta", seguir y
 * el filtro "Siguiendo" siguen exigiendo cuenta, y lo dicen en vez de no
 * responder.
 *
 * Como es una ruta de primer nivel y no una pestaña —para poder ser pública sin
 * abrir todo el grupo `(tabs)`—, pinta la barra ella misma, igual que el mapa.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [mode, setMode] = useState<FeedMode>('para-ti');
  const { posts, loading, refreshing, loadingMore, error, hasMore, refresh, loadMore } =
    useFeed(mode);

  /**
   * Los datos de la zona son independientes del feed: viven en su propio hook y
   * no entran en la paginación. Si tardan o fallan, el feed se pinta igual.
   */
  const { data: zone, change: changeZone, locating: locatingZone } = useZone();

  const rows = useMemo(
    () =>
      buildFeedRows(posts, {
        zone: zone !== null,
        featured: zone?.featured != null,
      }),
    [posts, zone],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <HomeHeader />

      <View style={styles.toolbar}>
        {/*
          Sin cuenta no hay a quién seguir, así que el selector no tiene dos
          opciones que ofrecer: se enseña el acceso a la cuenta, que es lo que
          desbloquea la otra mitad.
        */}
        {session === null ? (
          // La cabecera ya ofrece "Entrar": aquí repetirlo era el mismo botón
          // dos veces, y nada decía qué es esto (F5.0, I-2).
          <Text variant="captionStrong" color="textSecondary" style={styles.tagline}>
            La red de quienes cuidan el medioambiente
          </Text>
        ) : (
          <FeedToggle mode={mode} onChange={setMode} />
        )}

        {/* En web no hay gesto de tirar para refrescar: hace falta un botón. */}
        {Platform.OS === 'web' ? (
          <Pressable
            onPress={refresh}
            accessibilityRole="button"
            accessibilityLabel="Refrescar el feed"
            style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.accent} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.accent} />
            )}
          </Pressable>
        ) : null}
      </View>

      <FlatList<FeedRow>
        // Las publicaciones siguen siendo la lista; las tarjetas ambientales son
        // filas derivadas. Ver lib/feed-rows.ts.
        data={loading || error ? [] : rows}
        keyExtractor={(row) => row.key}
        renderItem={({ item }) => {
          switch (item.kind) {
            case 'post':
              return (
                <PostCard
                  post={item.post}
                  variant="feed"
                  onPressBody={() => router.push({ pathname: '/publicacion/[id]', params: { id: item.post.id } })}
                />
              );
            case 'zone':
              return zone === null ? null : (
                <View style={styles.band}>
                  <ZoneDataCard
                    data={zone}
                    onChangeZone={changeZone}
                    locating={locatingZone}
                    onOpenReference={(slug) => router.push(`/entidad/${slug}`)}
                  />
                </View>
              );
            case 'featured':
              return zone?.featured == null ? null : (
                <View style={styles.band}>
                  <FeaturedCard
                    entity={zone.featured}
                    onPress={() => router.push(`/entidad/${zone.featured!.slug}`)}
                  />
                </View>
              );
            case 'empty':
              return (
                <EmptyFeed
                  mode={mode}
                  hasSession={session !== null}
                  onCreate={() => router.push(session === null ? '/welcome' : '/crear')}
                  onExplore={(path) => router.push(path)}
                />
              );
          }
        }}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          Platform.OS === 'web' ? undefined : (
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />
          )
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletons}>
              <PostSkeleton />
              <PostSkeleton />
              <PostSkeleton />
            </View>
          ) : error ? (
            <View style={styles.skeletons}>
              <Callout tone="error">{error}</Callout>
            </View>
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footer}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : posts.length > 0 && !hasMore ? (
            <View style={styles.footer}>
              <Ionicons name="checkmark-circle-outline" size={28} color={colors.accent} />
              <Text variant="captionStrong">Estás al día</Text>
              <ExploreLinks title="Sigue explorando" onExplore={(path) => router.push(path)} />
            </View>
          ) : null
        }
      />

      <TabBar />
    </SafeAreaView>
  );
}

/** Adónde lleva el feed vacío: lo que sirve sin conocer a nadie todavía. */
const EXPLORE = [
  {
    path: '/mapa',
    icon: 'map-outline',
    title: 'Cómo está tu entorno',
    detail: 'Aire, agua y naturaleza en el mapa, en vivo.',
  },
  {
    path: '/turismo-verde',
    icon: 'leaf-outline',
    title: 'Turismo Verde',
    detail: 'Rincones naturales cerca de ti y cómo llegar.',
  },
  {
    path: '/buscar',
    icon: 'people-outline',
    title: 'Iniciativas para seguir',
    detail: 'Empresas, ONG y proyectos verdes, y sus ofertas de empleo.',
  },
] as const;

type ExplorePath = (typeof EXPLORE)[number]['path'];

/**
 * El feed vacío (F5.0, I-1). Con la red recién nacida es lo primero que ve casi
 * todo el mundo, así que no puede ser solo "publica tú": invita a publicar
 * **y** abre lo que funciona sin conocer a nadie —el mapa, Turismo Verde y el
 * directorio—, que es la utilidad individual de @docs/07_CRECIMIENTO.md.
 */
function EmptyFeed({
  mode,
  hasSession,
  onCreate,
  onExplore,
}: {
  mode: FeedMode;
  hasSession: boolean;
  onCreate: () => void;
  onExplore: (path: ExplorePath) => void;
}) {
  const forYou = mode === 'para-ti';

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={forYou ? 'leaf-outline' : 'people-outline'} size={40} color={colors.accent} />
      </View>

      <Text variant="title" style={styles.centered}>
        {forYou ? 'Sé el primero en publicar' : 'Aún no sigues a nadie'}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.centered}>
        {forYou
          ? 'Cuenta qué está pasando en tu entorno y abre la conversación.'
          : 'Cuando sigas a personas, empresas e iniciativas, sus publicaciones se verán aquí.'}
      </Text>

      {forYou ? (
        <Button
          // No "Crear publicación": es el nombre del botón central de la barra, y
          // dos botones con el mismo nombre confunden al lector de pantalla.
          label={hasSession ? 'Escribir la primera publicación' : 'Crear cuenta para publicar'}
          onPress={onCreate}
          style={styles.cta}
        />
      ) : null}

      <ExploreLinks title="Mientras tanto, explora" onExplore={onExplore} />
    </View>
  );
}

/**
 * Lo que sirve sin conocer a nadie: al final de un feed corto ("Estás al día")
 * y en el vacío. En Instagram, un feed nunca termina en un callejón sin salida.
 */
function ExploreLinks({ title, onExplore }: { title: string; onExplore: (path: ExplorePath) => void }) {
  return (
    <View style={styles.explore}>
      <Text variant="label" color="textSecondary">
        {title}
      </Text>
      {EXPLORE.map((item) => (
        <Pressable
          key={item.path}
          onPress={() => onExplore(item.path)}
          accessibilityRole="link"
          accessibilityLabel={`${item.title}: ${item.detail}`}
          style={({ pressed }) => [styles.exploreRow, pressed && styles.pressed]}>
          <View style={styles.exploreIcon}>
            <Ionicons name={item.icon} size={22} color={colors.accent} />
          </View>
          <View style={styles.exploreTexts}>
            <Text variant="bodyStrong">{item.title}</Text>
            <Text variant="caption" color="textSecondary">
              {item.detail}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  /**
   * El feed es una columna blanca continua (F4.4): las publicaciones van a
   * sangre y se separan por una línea, no por huecos de fondo gris, como en el
   * mockup 1. En escritorio la columna se queda centrada en su ancho máximo.
   */
  list: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
    backgroundColor: colors.surface,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  /**
   * Las tarjetas ambientales sí siguen siendo tarjetas, sobre una franja del
   * fondo de la app: se distinguen de las publicaciones sin abrir un hueco
   * grande en la columna.
   */
  band: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
  },
  skeletons: {
    gap: spacing.md,
    padding: screenPadding,
  },
  footer: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xl,
    paddingHorizontal: screenPadding,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: screenPadding,
  },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.sm,
  },
  tagline: {
    flex: 1,
  },
  explore: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  exploreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
  },
  exploreIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreTexts: {
    flex: 1,
    gap: 2,
  },
});
