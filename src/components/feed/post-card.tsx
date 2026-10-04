import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { likePost, unlikePost, type FeedPost } from '@/lib/feed';
import { postUrl } from '@/lib/site';
import { relativeTime } from '@/lib/time';
import { colors, radius, screenPadding, spacing } from '@/theme';

import { PostText } from './post-text';

export type PostCardProps = {
  post: FeedPost;
  /** Si se pasa, el cuerpo de la tarjeta lleva al detalle. */
  onPressBody?: () => void;
  /**
   * `feed` (F4.4): a sangre, como en el mockup 1 —sin radio, borde ni margen,
   * y la imagen de lado a lado—, para que las publicaciones se encadenen sin
   * huecos. `card`: la tarjeta de siempre, para el detalle.
   */
  variant?: 'feed' | 'card';
};

export function PostCard({ post, onPressBody, variant = 'card' }: PostCardProps) {
  const flush = variant === 'feed';
  const router = useRouter();
  // La raíz de la app se deduce de la ruta actual; ver lib/site.ts.
  const pathname = usePathname();
  const { profile } = useAuth();

  /**
   * Estado optimista del "me gusta", con la publicación a la que pertenece.
   *
   * Guardarlos juntos permite **derivarlo**: si la tarjeta pasa a mostrar otra
   * publicación —FlatList recicla componentes— el estado deja de coincidir y se
   * vuelve solo al valor del servidor, sin sincronizar con un efecto.
   */
  const [optimistic, setOptimistic] = useState<{
    postId: string;
    liked: boolean;
    likes: number;
  } | null>(null);

  const current = optimistic?.postId === post.id ? optimistic : null;
  const liked = current?.liked ?? post.likedByViewer;
  const likes = current?.likes ?? post.likesCount;

  const [busy, setBusy] = useState(false);

  const authorName = post.author.display_name?.trim() || post.author.username;

  async function toggleLike() {
    // Sin cuenta el feed se ve pero no se valora: se dice a dónde ir en vez de
    // no responder al toque. El feed es público desde F2.6.
    if (!profile) {
      router.push('/welcome');
      return;
    }
    if (busy) return;

    const next = !liked;
    setBusy(true);
    setOptimistic({
      postId: post.id,
      liked: next,
      likes: Math.max(0, likes + (next ? 1 : -1)),
    });

    try {
      if (next) {
        await likePost(profile.id, post.id);
      } else {
        await unlikePost(profile.id, post.id);
      }
    } catch {
      // Revertir es lo único honesto: el número que se ve tiene que ser el real.
      setOptimistic({ postId: post.id, liked: !next, likes });
      showToast('No se ha podido guardar tu "me gusta".');
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = postUrl(post.id, pathname);

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
    <View style={flush ? styles.flush : styles.card}>
      <View style={[styles.headerRow, flush && styles.inset]}>
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

      {/*
        Lugar de Turismo Verde etiquetado (F4.4): una línea con su pin que lleva
        a su perfil. Pulsable propio, hermano del autor y del cuerpo.
      */}
      {post.place ? (
        <Pressable
          onPress={() => router.push(`/entidad/${post.place!.slug}`)}
          accessibilityRole="link"
          accessibilityLabel={`En ${post.place.name}. Ver el lugar`}
          style={({ pressed }) => [styles.place, flush && styles.inset, pressed && styles.pressed]}>
          <Ionicons name="location" size={14} color={colors.accent} />
          <Text variant="caption" color="accent" numberOfLines={1} style={styles.placeName}>
            {post.place.name}
          </Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={onPressBody}
        disabled={!onPressBody}
        accessibilityRole={onPressBody ? 'link' : undefined}
        accessibilityLabel={onPressBody ? 'Ver la publicación' : undefined}
        style={styles.body}>
        <View style={flush && styles.inset}>
          <PostText content={post.content} />
        </View>

        {post.imageUrl ? (
          <Image
            source={{ uri: post.imageUrl }}
            style={[styles.image, flush && styles.imageFlush]}
            contentFit="cover"
            transition={150}
            accessibilityLabel="Imagen de la publicación"
          />
        ) : null}
      </Pressable>

      <View style={[styles.actions, flush && styles.inset]}>
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
    // Borde fino además de la sombra: en los mockups las tarjetas se separan
    // del fondo por una línea, no solo por una sombra difusa.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  /** En el feed: sin tarjeta. El aire lo dan los rellenos de dentro. */
  flush: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  /** Solo el texto, la cabecera y las acciones llevan margen lateral. */
  inset: {
    paddingHorizontal: screenPadding,
  },
  headerRow: {
    flexDirection: 'row',
  },
  place: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: -spacing.xs,
  },
  placeName: {
    flexShrink: 1,
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
    // 16:10 como en los mockups. A 4:3 la foto se comía la pantalla y dejaba
    // una sola publicación visible.
    aspectRatio: 16 / 10,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  imageFlush: {
    borderRadius: 0,
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
