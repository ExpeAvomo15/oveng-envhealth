import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PostCard, PostSkeleton } from '@/components/feed';
import { Button, Text } from '@/components/ui';
import { fetchAuthorPosts, type FeedPost } from '@/lib/feed';
import { colors, radius, spacing } from '@/theme';

export type ProfilePostsProps = {
  authorId: string;
  viewerId: string | null;
  /** Es el perfil propio: el vacío invita a publicar. */
  own: boolean;
  onCreate?: () => void;
  /**
   * Cambia cuando cambia el número de publicaciones (el contador del perfil):
   * al volver de publicar, la lista se recarga sola.
   */
  version?: number;
};

/**
 * La lista de publicaciones de un perfil (F5.0).
 *
 * El contador decía "1 Publicaciones" y la lista "Todavía no hay
 * publicaciones": nunca se había construido. Se pintan las mismas tarjetas del
 * feed, a sangre, con su "me gusta" y sus comentarios.
 */
export function ProfilePosts({ authorId, viewerId, own, onCreate, version = 0 }: ProfilePostsProps) {
  const key = `${authorId}|${viewerId ?? ''}|${version}`;
  const [loaded, setLoaded] = useState<{ key: string; posts: FeedPost[] | null } | null>(null);

  useEffect(() => {
    let active = true;
    fetchAuthorPosts(authorId, viewerId)
      .then((posts) => {
        if (active) setLoaded({ key, posts });
      })
      .catch(() => {
        if (active) setLoaded({ key, posts: null });
      });
    return () => {
      active = false;
    };
    // Solo la clave decide: `authorId` y `viewerId` viajan dentro.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loaded?.key === key ? loaded : null;

  if (current === null) {
    return (
      <View style={styles.list}>
        <PostSkeleton />
      </View>
    );
  }

  if (current.posts === null || current.posts.length === 0) {
    const failed = current.posts === null;
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="images-outline" size={28} color={colors.accent} />
        </View>
        <Text variant="subtitle" style={styles.centered}>
          {failed
            ? 'No se han podido cargar las publicaciones'
            : own
              ? 'Todavía no has publicado nada'
              : 'Todavía no hay publicaciones'}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.centered}>
          {failed
            ? 'Comprueba la conexión y vuelve a abrir el perfil.'
            : own
              ? 'Cuenta qué está pasando en tu entorno: una limpieza, un paseo, algo que te preocupa.'
              : 'Cuando esta cuenta publique, lo verás aquí.'}
        </Text>
        {own && !failed && onCreate ? (
          <Button label="Escribir tu primera publicación" size="sm" onPress={onCreate} style={styles.cta} />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {current.posts.map((post, index) => (
        <View key={post.id} style={index > 0 ? styles.separated : null}>
          <PostCard post={post} variant="feed" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
  },
  separated: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  cta: {
    marginTop: spacing.sm,
  },
});
