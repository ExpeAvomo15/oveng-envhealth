import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Callout, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useConversationList } from '@/hooks/use-messages';
import { isChat, isIncomingRequest, type ConversationSummary } from '@/lib/messages';
import { relativeTime } from '@/lib/time';
import { colors, radius, screenPadding, spacing } from '@/theme';

type Tab = 'chats' | 'solicitudes';

/**
 * Bandeja de mensajes (F4.6): Chats y Solicitudes, como Instagram.
 *
 * Lo que alguien te pide y no has aceptado no se mezcla con tus
 * conversaciones: va a Solicitudes, y desde ahí decides. Lo que pides tú sí
 * está en Chats desde el principio, marcado como solicitud enviada.
 */
export default function MessagesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const { items, loading, error } = useConversationList();
  const [tab, setTab] = useState<Tab>('chats');

  const chats = items.filter((c) => isChat(c, me));
  const requests = items.filter((c) => isIncomingRequest(c, me));
  const shown = tab === 'chats' ? chats : requests;

  return (
    <Screen padded={false} scroll={false}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
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
          <Callout tone="error">No hemos podido cargar tus mensajes. Inténtalo de nuevo en un momento.</Callout>
        ) : shown.length === 0 ? (
          <EmptyState tab={tab} />
        ) : (
          shown.map((conversation) => (
            <ConversationRow
              key={conversation.id}
              conversation={conversation}
              me={me}
              onPress={() => router.push({ pathname: '/mensajes/[id]', params: { id: conversation.id } })}
            />
          ))
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
      <Text variant="label" color={active ? 'accent' : 'textSecondary'}>
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
}: {
  conversation: ConversationSummary;
  me: string;
  onPress: () => void;
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

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Conversación con ${name}${unread > 0 ? `, ${unread} sin leer` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Avatar name={name} uri={conversation.other.avatar_url} size="md" />
      <View style={styles.rowTexts}>
        <View style={styles.rowTop}>
          <Text variant={unread > 0 ? 'bodyStrong' : 'body'} numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
          <Text variant="micro" color="textSecondary">
            {relativeTime(last?.createdAt ?? conversation.lastMessageAt)}
          </Text>
        </View>
        {status ? (
          <Text variant="micro" color="warningText">
            {status}
          </Text>
        ) : null}
        <View style={styles.rowTop}>
          <Text
            variant="caption"
            color={unread > 0 ? 'text' : 'textSecondary'}
            numberOfLines={1}
            style={styles.flex}>
            {preview}
          </Text>
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text variant="micro" color="textInverse">
                {unread}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  iconButton: {
    padding: spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
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
    borderBottomColor: colors.accent,
  },
  list: {
    padding: screenPadding,
    gap: spacing.sm,
  },
  loader: {
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowTexts: {
    flex: 1,
    gap: 2,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
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
