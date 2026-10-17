import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Button, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { refreshInbox, useConversationList } from '@/hooks/use-messages';
import type { FeedPost } from '@/lib/feed';
import { MessagesUnavailable, sendSharedPost, type ConversationSummary } from '@/lib/messages';
import { canShareNatively, copyLink, shareLink, shareSnippet } from '@/lib/share';
import { postUrl } from '@/lib/site';
import { colors, radius, spacing } from '@/theme';

export type ShareSheetProps = {
  post: FeedPost;
  visible: boolean;
  onClose: () => void;
};

/**
 * Compartir una publicación (F4.7), con los dos alcances de Instagram:
 *
 * - **Dentro de OVENG**: "Enviar por mensaje" a una de tus conversaciones
 *   aceptadas. Llega como una mini-tarjeta que lleva a la publicación.
 * - **Fuera**: la hoja del sistema (Web Share) con el enlace directo, o
 *   copiarlo cuando el navegador no tiene hoja —un escritorio—.
 */
export function ShareSheet({ post, visible, onClose }: ShareSheetProps) {
  const pathname = usePathname();
  const url = postUrl(post.id, pathname);
  const native = canShareNatively();
  const authorName = post.author.display_name?.trim() || post.author.username;

  async function shareOutside() {
    const outcome = await shareLink({
      url,
      title: `Publicación de ${authorName} en OVENG`,
      text: shareSnippet(post.content),
    });
    if (outcome === 'copied') showToast('Enlace copiado');
    else if (outcome === 'failed') showToast('No se ha podido compartir el enlace.');
    if (outcome !== 'cancelled') onClose();
  }

  async function copy() {
    showToast((await copyLink(url)) ? 'Enlace copiado' : 'No se ha podido copiar el enlace.');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {/* Tocar fuera cierra, como en cualquier hoja. */}
        <Pressable style={styles.fill} onPress={onClose} accessibilityLabel="Cerrar" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text variant="subtitle" style={styles.fill}>
              Compartir
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text variant="label" color="textSecondary">
            Enviar por mensaje
          </Text>
          {visible ? <SendToChat post={post} onClose={onClose} /> : null}

          <View style={styles.divider} />

          {native ? (
            <SheetAction icon="share-social-outline" label="Compartir en otras apps" onPress={shareOutside} />
          ) : null}
          <SheetAction icon="link-outline" label="Copiar enlace" onPress={copy} />
        </View>
      </View>
    </Modal>
  );
}

/** Tus conversaciones aceptadas, cada una con su "Enviar". */
function SendToChat({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const router = useRouter();
  const { profile } = useAuth();
  const { items, loading } = useConversationList();
  const [sent, setSent] = useState<Set<string>>(() => new Set());
  const [sending, setSending] = useState<string | null>(null);

  if (!profile) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" color="textSecondary">
          Con una cuenta puedes enviarla a las personas con las que hablas.
        </Text>
        <Button
          label="Entra para enviarla"
          variant="tonal"
          size="sm"
          onPress={() => {
            onClose();
            router.push('/welcome');
          }}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.empty}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const chats = items.filter((c) => c.status === 'accepted');
  if (chats.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" color="textSecondary">
          Aún no tienes conversaciones. Cuando alguien acepte hablar contigo, podrás enviarle publicaciones.
        </Text>
        <Button
          label="Buscar personas"
          variant="tonal"
          size="sm"
          onPress={() => {
            onClose();
            router.push('/buscar');
          }}
        />
      </View>
    );
  }

  async function send(conversation: ConversationSummary) {
    if (!profile || sending) return;
    setSending(conversation.id);
    try {
      await sendSharedPost(conversation.id, profile.id, post.id);
      setSent((previous) => new Set(previous).add(conversation.id));
      refreshInbox();
      showToast(`Enviada a ${conversation.other.display_name ?? conversation.other.username}`);
    } catch (caught) {
      showToast(
        caught instanceof MessagesUnavailable
          ? 'Enviar publicaciones por mensaje todavía no está disponible.'
          : 'No se ha podido enviar. Inténtalo de nuevo.',
      );
    } finally {
      setSending(null);
    }
  }

  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
      {chats.map((conversation) => {
        const name = conversation.other.display_name ?? conversation.other.username;
        const done = sent.has(conversation.id);
        return (
          <View key={conversation.id} style={styles.chatRow}>
            <Avatar name={name} uri={conversation.other.avatar_url} size="md" />
            <View style={styles.fill}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="caption" color="textSecondary" numberOfLines={1}>
                @{conversation.other.username}
              </Text>
            </View>
            <Button
              label={done ? 'Enviada' : 'Enviar'}
              accessibilityLabel={done ? `Enviada a ${name}` : `Enviar a ${name}`}
              variant={done ? 'tonal' : 'primary'}
              size="sm"
              disabled={done}
              loading={sending === conversation.id}
              onPress={() => void send(conversation)}
            />
          </View>
        );
      })}
    </ScrollView>
  );
}

function SheetAction({
  icon,
  label,
  onPress,
}: {
  icon: 'share-social-outline' | 'link-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={20} color={colors.text} />
      </View>
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  fill: {
    flex: 1,
  },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 640,
    maxHeight: '85%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  close: {
    padding: spacing.xs,
  },
  empty: {
    gap: spacing.md,
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
  },
  list: {
    maxHeight: 280,
    flexGrow: 0,
  },
  listContent: {
    gap: spacing.md,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
