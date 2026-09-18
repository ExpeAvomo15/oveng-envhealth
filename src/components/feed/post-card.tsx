import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { likePost, unlikePost, type FeedPost } from '@/lib/feed';
import { postUrl } from '@/lib/site';
import { relativeTime } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';

import { PostText } from './post-text';

export type PostCardProps = {
  post: FeedPost;
  /** Si se pasa, el cuerpo de la tarjeta lleva al detalle. */
  onPressBody?: () => void;
};

export function PostCard({ post, onPressBody }: PostCardProps) {
  const router = useRouter();
  const { profile } = useAuth();

  // Estado optimista propio de la tarjeta: se reinicia si cambia de publicación
  // (FlatList recicla componentes) o si el servidor trae otra cosa al refrescar.
  const [liked, setLiked] = useState(post.likedByViewer);
  const [likes, setLikes] = useState(post.likesCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(post.likedByViewer);
    setLikes(post.likesCount);
  }, [post.id, post.likedByViewer, post.likesCount]);

  const authorName = post.author.display_name?.trim() || post.author.username;

  async function toggleLike() {
    if (!profile || busy) return;

    const next = !liked;
    setBusy(true);
    setLiked(next);
    setLikes((current) => Math.max(0, current + (next ? 1 : -1)));

    try {
      if (next) {
        await likePost(profile.id, post.id);
      } else {
        await unlikePost(profile.id, post.id);
      }
    } catch {
      // Revertir es lo único honesto: el número que se ve tiene que ser el real.
      setLiked(!next);
      setLikes((current) => Math.max(0, current + (next ? -1 : 1)));
      showToast('No se ha podido guardar tu "me gusta".');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = postUrl(post.id);

    if (Platform.OS !== 'web') {
      await Share.share({ message: `${post.content}\n\n${url}` });
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast('Enlace copiado al portapapeles.');
    } catch {
      showToast('No se ha podido copiar el enlace.');
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.push(`/user/${post.author.username}`)}
          accessibilityRole="link"
          accessibilityLabel={`Perfil de ${authorName}`}
          style={({ pressed }) => [styles.author, pressed && styles.pressed]}>
          <Avatar name={authorName} uri={post.author.avatar_url} size="md" />

          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {authorName}
              </Text>
              {post.author.verified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={colors.accent}
                  accessibilityLabel="Cuenta verificada"
                />
              ) : null}
            </View>

            <Text variant="caption" color="textSecondary" numberOfLines={1}>
              @{post.author.username} · {relativeTime(post.createdAt)}
            </Text>
          </View>
        </Pressable>
      </View>

      <Pressable
        onPress={onPressBody}
        disabled={!onPressBody}
        accessibilityRole={onPressBody ? 'link' : undefined}
        accessibilityLabel={onPressBody ? 'Ver la publicación' : undefined}
        style={styles.body}>
        <PostText content={post.content} />

        {post.imageUrl ? (
          <Image
            source={{ uri: post.imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={150}
            accessibilityLabel="Imagen de la publicación"
          />
        ) : null}
      </Pressable>

      <View style={styles.actions}>
        <Action
          icon={liked ? 'heart' : 'heart-outline'}
          color={liked ? colors.danger : colors.textSecondary}
          label={String(likes)}
          accessibilityLabel={liked ? 'Quitar me gusta' : 'Me gusta'}
          onPress={toggleLike}
        />

        <Action
          icon="chatbubble-outline"
          color={colors.textMuted}
          label="0"
          accessibilityLabel="Comentarios (próximamente)"
          onPress={() => showToast('Los comentarios llegan pronto.')}
        />

        <Action
          icon="share-outline"
          color={colors.textSecondary}
          accessibilityLabel="Compartir"
          onPress={share}
        />
      </View>
    </View>
  );
}

function Action({
  icon,
  color,
  label,
  accessibilityLabel,
  onPress,
}: {
  icon: 'heart' | 'heart-outline' | 'chatbubble-outline' | 'share-outline';
  color: string;
  label?: string;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={spacing.sm}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={color} />
      {label !== undefined ? (
        <Text variant="label" style={{ color }}>
          {label}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 1,
  },
  authorText: {
    flexShrink: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  body: {
    gap: spacing.md,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxl,
    paddingTop: spacing.xs,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
