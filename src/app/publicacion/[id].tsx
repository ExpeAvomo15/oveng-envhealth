import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CommentComposer, CommentRow } from '@/components/comments';
import { PostCard } from '@/components/feed';
import { Button, Screen, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import {
  addComment,
  CommentsUnavailable,
  deleteComment,
  listComments,
  type Comment,
} from '@/lib/comments';
import { getPost, type FeedPost } from '@/lib/feed';
import { colors, radius, screenPadding, spacing } from '@/theme';

type Loaded = {
  id: string;
  viewerId: string | null;
  post: FeedPost | null;
  comments: Comment[];
  cursor: string | null;
  /** `false` sin la migración 009: se dice, no se finge una lista vacía. */
  available: boolean;
  /** Comentarios añadidos menos borrados aquí, para el número de la tarjeta. */
  delta: number;
};

/**
 * Una publicación con sus comentarios (F4.7). Es el enlace que se comparte:
 * pública, se abre en frío sin cuenta —también por el `404.html` de Pages— y
 * si la publicación ya no existe lo dice con una salida.
 *
 * Los comentarios se cargan al abrir, del más antiguo al más nuevo, y lo que
 * escribes aparece al instante (optimista). Sin tiempo real: ver lib/comments.
 */
export default function PublicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const viewerId = profile?.id ?? null;

  // Guardado con su id y su lector, como el detalle de antes: así `loading` se
  // deriva y la versión anónima no se pinta mientras llega la de la sesión.
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const input = useRef<TextInput>(null);
  const scroll = useRef<ScrollView>(null);

  const current = loaded?.id === id && loaded.viewerId === viewerId ? loaded : null;

  useEffect(() => {
    if (!id) return;
    let active = true;
    Promise.all([getPost(id, viewerId), listComments(id).catch(() => null)])
      .then(([post, page]) => {
        if (!active) return;
        setLoaded({
          id,
          viewerId,
          post,
          comments: page?.comments ?? [],
          cursor: page?.cursor ?? null,
          available: page?.available ?? true,
          delta: 0,
        });
      })
      .catch(() => {
        if (active) setLoaded({ id, viewerId, post: null, comments: [], cursor: null, available: true, delta: 0 });
      });
    return () => {
      active = false;
    };
  }, [id, viewerId]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (current === null) {
    return (
      <Screen scroll={false} center>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  const { post, comments, cursor, available, delta } = current;

  if (!post) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <View style={styles.notFoundIcon}>
            <Ionicons name="document-text-outline" size={28} color={colors.accent} />
          </View>
          <Text variant="title">Esta publicación no existe</Text>
          <Text variant="body" color="textSecondary">
            Puede que quien la escribió la haya borrado, o que el enlace esté incompleto.
          </Text>
          <Button
            label={router.canGoBack() ? 'Volver' : 'Ir al inicio'}
            variant="secondary"
            onPress={back}
          />
        </View>
      </Screen>
    );
  }

  // El número de la tarjeta: con todos cargados, los que hay; si no, el de la
  // base más lo que haya cambiado aquí.
  const commentsCount = cursor === null ? comments.length : Math.max(0, post.commentsCount + delta);
  const shownPost = { ...post, commentsCount };

  const update = (change: (previous: Loaded) => Loaded) =>
    setLoaded((previous) => (previous && previous.id === id ? change(previous) : previous));

  async function submit() {
    const text = draft.trim();
    if (!profile || !text || sending) return;

    // Optimista: el comentario sale ya, en gris, y se cambia por el de la base.
    const temp: Comment = {
      id: `temp-${Date.now()}`,
      postId: id,
      content: text,
      createdAt: new Date().toISOString(),
      author: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
      },
    };
    setSending(true);
    setDraft('');
    setPending((previous) => new Set(previous).add(temp.id));
    update((previous) => ({ ...previous, comments: [...previous.comments, temp] }));
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);

    try {
      const saved = await addComment(id, profile.id, text);
      update((previous) => ({
        ...previous,
        comments: previous.comments.map((c) => (c.id === temp.id ? saved : c)),
        delta: previous.delta + 1,
      }));
    } catch (caught) {
      update((previous) => ({ ...previous, comments: previous.comments.filter((c) => c.id !== temp.id) }));
      setDraft(text);
      showToast(
        caught instanceof CommentsUnavailable
          ? 'Los comentarios todavía no están disponibles.'
          : 'No se ha podido publicar tu comentario.',
      );
    } finally {
      setPending((previous) => {
        const next = new Set(previous);
        next.delete(temp.id);
        return next;
      });
      setSending(false);
    }
  }

  async function remove(comment: Comment) {
    const index = comments.findIndex((c) => c.id === comment.id);
    update((previous) => ({ ...previous, comments: previous.comments.filter((c) => c.id !== comment.id) }));
    try {
      await deleteComment(comment.id);
      update((previous) => ({ ...previous, delta: previous.delta - 1 }));
      showToast('Comentario borrado');
    } catch {
      // Se vuelve a poner donde estaba: lo que se ve tiene que ser lo real.
      update((previous) => {
        const next = [...previous.comments];
        next.splice(Math.max(0, index), 0, comment);
        return { ...previous, comments: next };
      });
      showToast('No se ha podido borrar el comentario.');
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listComments(id, cursor);
      update((previous) => {
        const known = new Set(previous.comments.map((c) => c.id));
        return {
          ...previous,
          comments: [...previous.comments, ...page.comments.filter((c) => !known.has(c.id))],
          cursor: page.cursor,
        };
      });
    } catch {
      showToast('No se han podido cargar más comentarios.');
    } finally {
      setLoadingMore(false);
    }
  }

  const viewerName = profile ? profile.display_name?.trim() || profile.username : null;

  return (
    <Screen padded={false} scroll={false} background="surface" avoidKeyboard>
      <View style={styles.header}>
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle" accessibilityRole="header">
          Publicación
        </Text>
      </View>

      <ScrollView ref={scroll} style={styles.flex} contentContainerStyle={styles.content}>
        <PostCard post={shownPost} variant="feed" onPressComments={() => input.current?.focus()} />

        <View style={styles.comments}>
          <Text variant="bodyStrong" accessibilityRole="header" style={styles.commentsTitle}>
            {commentsCount === 0 ? 'Comentarios' : `Comentarios (${commentsCount})`}
          </Text>

          {!available ? (
            <Text variant="caption" color="textSecondary" style={styles.inset}>
              Los comentarios todavía no están disponibles.
            </Text>
          ) : comments.length === 0 ? (
            <Text variant="caption" color="textSecondary" style={styles.inset}>
              {profile
                ? 'Aún no hay comentarios. Escribe el primero.'
                : 'Aún no hay comentarios. Entra para escribir el primero.'}
            </Text>
          ) : (
            comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                pending={pending.has(comment.id)}
                canDelete={viewerId !== null && (comment.author.id === viewerId || post.author.id === viewerId)}
                onDelete={(target) => void remove(target)}
              />
            ))
          )}

          {cursor ? (
            <View style={styles.inset}>
              <Button
                label="Ver más comentarios"
                variant="ghost"
                size="sm"
                loading={loadingMore}
                onPress={() => void loadMore()}
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      {available ? (
        <CommentComposer
          ref={input}
          viewer={viewerName ? { name: viewerName, avatarUrl: profile?.avatar_url ?? null } : null}
          value={draft}
          onChange={setDraft}
          onSubmit={() => void submit()}
          sending={sending}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: screenPadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    width: 40,
    height: 40,
    marginLeft: -spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  comments: {
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  commentsTitle: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.xs,
  },
  inset: {
    paddingHorizontal: screenPadding,
    alignItems: 'flex-start',
  },
  notFound: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.md,
  },
  notFoundIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
