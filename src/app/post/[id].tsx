import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/feed';
import { Button, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { getPost, type FeedPost } from '@/lib/feed';
import { colors, radius, spacing } from '@/theme';

/** Detalle de una publicación. Los comentarios llegan después del MVP. */
export default function PostDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();

  // Se guarda junto al id al que pertenece para poder derivar `loading`.
  const [loaded, setLoaded] = useState<{ id: string; post: FeedPost | null } | null>(null);

  const viewerId = profile?.id ?? null;
  const current = loaded?.id === id ? loaded : null;
  const post = current?.post ?? null;
  const loading = current === null;
  const notFound = current !== null && current.post === null;

  // El efecto solo encadena la promesa y deja el `setState` en el callback: una
  // función que hiciera ambas cosas provoca renders en cascada (y lo avisa el
  // linter de React).
  useEffect(() => {
    if (!id || !viewerId) return;

    let active = true;

    getPost(id, viewerId)
      .then((found) => {
        if (active) setLoaded({ id, post: found });
      })
      .catch(() => {
        if (active) setLoaded({ id, post: null });
      });

    return () => {
      active = false;
    };
  }, [id, viewerId]);

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={styles.centeredFill}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (notFound || !post) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text variant="title">Esta publicación no existe</Text>
          <Text variant="body" color="textSecondary">
            Puede que se haya borrado.
          </Text>
          <Button
            label="Volver"
            variant="secondary"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Publicación</Text>
      </View>

      <PostCard post={post} />

      <View style={styles.comments}>
        <View style={styles.commentsIcon}>
          <Ionicons name="chatbubbles-outline" size={24} color={colors.accent} />
        </View>
        <Text variant="bodyStrong">Los comentarios llegan pronto</Text>
        <Text variant="caption" color="textSecondary" style={styles.centered}>
          Aquí se podrá responder y conversar sobre lo que ocurre en el entorno.
        </Text>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.6,
  },
  comments: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  commentsIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    textAlign: 'center',
  },
});
