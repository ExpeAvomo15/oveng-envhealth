import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Button, Callout, Screen, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { refreshInbox, useConversationList } from '@/hooks/use-messages';
import { isChat, isIncomingRequest, respondToRequest, type ConversationSummary } from '@/lib/messages';
import { relativeTime } from '@/lib/time';
import { colors, radius, screenPadding, spacing } from '@/theme';

type Tab = 'chats' | 'solicitudes';

/**
 * Bandeja de mensajes (F4.6): Chats y Solicitudes, como Instagram.
 *
 * Lo que alguien te pide y no has aceptado no se mezcla con tus
 * conversaciones: va a Solicitudes, y desde ahí decides —también sin abrirla,
 * con Aceptar y Rechazar en la propia fila—. Lo que pides tú sí está en Chats
 * desde el principio, marcado como solicitud enviada.
 *
 * Desde F4.6b, filas a sangre como los DMs de Instagram: avatar grande, nombre,
 * vista previa en una línea y un punto verde en lo que no has leído.
 */
export default function MessagesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const { items, loading, error } = useConversationList();
  const [tab, setTab] = useState<Tab>('chats');
  const [answering, setAnswering] = useState<string | null>(null);

  const chats = items.filter((c) => isChat(c, me));
  const requests = items.filter((c) => isIncomingRequest(c, me));
  const shown = tab === 'chats' ? chats : requests;

  const answer = async (conversation: ConversationSummary, value: 'accepted' | 'declined') => {
    setAnswering(conversation.id);
    try {
      await respondToRequest(conversation.id, value);
      refreshInbox();
      if (value === 'declined') showToast('Solicitud rechazada. No se lo diremos.');
      else router.push({ pathname: '/mensajes/[id]', params: { id: conversation.id } });
    } catch {
      showToast('No se ha podido responder. Inténtalo de nuevo.');
    } finally {
      setAnswering(null);
    }
  };

  return (
    <Screen padded={false} scroll={false} background="surface">
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text variant="title" accessibilityRole="header">
          Mensajes
        </Text>
      </View>

      <View style={styles.tabs} accessibilityRole="tablist">
        <TabButton label="Chats" active={tab === 'chats'} onPress={() => setTab('chats')} />
        <TabButton
          label={requests.length > 0 ? `Solicitudes (${requests.length})` : 'Solicitudes'}
          active={tab === 'solicitudes'}
          onPress={() => setTab('solicitudes')}
        />
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {loading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : error ? (
          <View style={styles.inset}>
            <Callout tone="error">No hemos podido cargar tus mensajes. Inténtalo de nuevo en un momento.</Callout>
          </View>
        ) : shown.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          <>
            {tab === 'solicitudes' ? (
              <Text variant="caption" color="textSecondary" style={styles.hint}>
                Quien te escribe por primera vez no sabe si has leído su mensaje hasta que aceptas. Si
                rechazas, no se lo diremos.
              </Text>
            ) : null}
            {shown.map((conversation) => (
              <ConversationRow
                key={conversation.id}
                conversation={conversation}
                me={me}
                onPress={() => router.push({ pathname: '/mensajes/[id]', params: { id: conversation.id } })}
                request={
                  tab === 'solicitudes'
                    ? {
                        busy: answering === conversation.id,
                        onAccept: () => void answer(conversation, 'accepted'),
                        onDecline: () => void answer(conversation, 'declined'),
                      }
                    : undefined
                }
              />
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={[styles.tab, active && styles.tabActive]}>
      <Text variant="label" color={active ? 'text' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons
          name={tab === 'chats' ? 'chatbubbles-outline' : 'mail-unread-outline'}
          size={28}
          color={colors.accent}
        />
      </View>
      <Text variant="subtitle" style={styles.centered}>
        {tab === 'chats' ? 'Todavía no tienes conversaciones' : 'No tienes solicitudes'}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.centered}>
        {tab === 'chats'
          ? 'Envía una solicitud de mensaje desde el perfil de alguien. Cuando la acepte, podréis hablar aquí.'
          : 'Cuando alguien quiera escribirte por primera vez, te llegará aquí. Tú decides si aceptas.'}
      </Text>
    </View>
  );
}

function ConversationRow({
  conversation,
  me,
  onPress,
  request,
}: {
  conversation: ConversationSummary;
  me: string;
  onPress: () => void;
  request?: { busy: boolean; onAccept: () => void; onDecline: () => void };
}) {
  const name = conversation.other.display_name ?? conversation.other.username;
  const last = conversation.lastMessage;
  const status =
    conversation.requestedBy === me && conversation.status === 'pending'
      ? 'Solicitud enviada'
      : conversation.requestedBy === me && conversation.status === 'declined'
        ? 'No ha aceptado tu solicitud'
        : null;
  const preview = last ? `${last.senderId === me ? 'Tú: ' : ''}${last.body}` : 'Sin mensajes todavía';
  const unread = conversation.unread;
  const when = relativeTime(last?.createdAt ?? conversation.lastMessageAt);

  return (
    <View style={styles.rowWrap}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={`Conversación con ${name}${unread > 0 ? `, ${unread} sin leer` : ''}`}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <Avatar name={name} uri={conversation.other.avatar_url} size="list" />
        <View style={styles.rowTexts}>
          <Text variant="bodyStrong" numberOfLines={1}>
            {name}
          </Text>
          <View style={styles.previewLine}>
            <Text
              variant={unread > 0 ? 'captionStrong' : 'caption'}
              color={status ? 'warningText' : unread > 0 ? 'text' : 'textSecondary'}
              numberOfLines={1}
              style={styles.previewText}>
              {status ?? preview}
            </Text>
            <Text variant="caption" color="textSecondary" numberOfLines={1} style={styles.when}>
              {` · ${when}`}
            </Text>
          </View>
        </View>
        {unread > 0 ? <View style={styles.dot} /> : null}
      </Pressable>

      {request ? (
        <View style={styles.decide}>
          <Button
            label="Aceptar"
            size="sm"
            fullWidth
            loading={request.busy}
            onPress={request.onAccept}
            style={styles.flex}
          />
          <Button
            label="Rechazar"
            variant="tonal"
            size="sm"
            fullWidth
            disabled={request.busy}
            onPress={request.onDecline}
            style={styles.flex}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: screenPadding,
  },
  iconButton: {
    marginLeft: -spacing.xs,
    padding: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: colors.text,
  },
  list: {
    paddingVertical: spacing.sm,
  },
  inset: {
    padding: screenPadding,
  },
  hint: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
  rowWrap: {
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
  },
  rowPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  previewLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewText: {
    flexShrink: 1,
  },
  when: {
    flexShrink: 0,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  decide: {
    flexDirection: 'row',
    gap: spacing.sm,
    // Alineado con el texto de la fila, no con el avatar.
    paddingLeft: screenPadding + 56 + spacing.md,
    paddingRight: screenPadding,
    paddingBottom: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
  },
  centered: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
