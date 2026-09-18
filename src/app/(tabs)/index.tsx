import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
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

import { FeedToggle, PostCard, PostSkeleton } from '@/components/feed';
import { HomeHeader } from '@/components/navigation/home-header';
import { Button, Callout, Text } from '@/components/ui';
import { useFeed } from '@/hooks/use-feed';
import type { FeedMode, FeedPost } from '@/lib/feed';
import { colors, maxContentWidth, radius, screenPadding, spacing } from '@/theme';

/** Inicio — el feed. */
export default function HomeScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<FeedMode>('para-ti');
  const { posts, loading, refreshing, loadingMore, error, hasMore, refresh, loadMore } =
    useFeed(mode);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <HomeHeader />

      <View style={styles.toolbar}>
        <FeedToggle mode={mode} onChange={setMode} />

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

      <FlatList<FeedPost>
        data={posts}
        keyExtractor={(post) => post.id}
        renderItem={({ item }) => (
          <PostCard post={item} onPressBody={() => router.push(`/post/${item.id}`)} />
        )}
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
            <Callout tone="error">{error}</Callout>
          ) : (
            <EmptyFeed mode={mode} onCreate={() => router.push('/crear')} />
          )
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
    </SafeAreaView>
  );
}

function EmptyFeed({ mode, onCreate }: { mode: FeedMode; onCreate: () => void }) {
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
        <Button label="Crear publicación" onPress={onCreate} style={styles.cta} />
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
  list: {
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  separator: {
    height: spacing.md,
  },
  skeletons: {
    gap: spacing.md,
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
