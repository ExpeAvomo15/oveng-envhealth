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
          <Button label="Iniciar sesión" size="sm" onPress={() => router.push('/welcome')} />
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
                  onPressBody={() => router.push(`/post/${item.post.id}`)}
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
              <Text variant="caption" color="textMuted">
                No hay más publicaciones.
              </Text>
            </View>
          ) : null
        }
      />

      <TabBar />
    </SafeAreaView>
  );
}

function EmptyFeed({
  mode,
  hasSession,
  onCreate,
}: {
  mode: FeedMode;
  hasSession: boolean;
  onCreate: () => void;
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
          label={hasSession ? 'Crear publicación' : 'Crear cuenta para publicar'}
          onPress={onCreate}
          style={styles.cta}
        />
      ) : null}
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
    paddingVertical: spacing.xl,
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
});
