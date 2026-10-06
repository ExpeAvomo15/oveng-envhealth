import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Avatar, Button, Screen, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { refreshInbox, useConversation } from '@/hooks/use-messages';
import {
  block,
  markRead,
  MESSAGE_MAX,
  respondToRequest,
  sendMessage,
  unblock,
  type Message,
} from '@/lib/messages';
import { useFontFamily } from '@/hooks/use-fonts';
import { colors, noWebFocusRing, radius, screenPadding, spacing, typography } from '@/theme';

type Menu = 'closed' | 'open' | 'confirm-block';

/**
 * Una conversación 1 a 1 (F4.6). Los mensajes llegan en tiempo real.
 *
 * Qué se puede hacer depende del estado, y la pantalla lo dice siempre en vez
 * de dejar un campo que falla al enviar:
 *   · solicitud mía pendiente → escribo, y se avisa de que espera respuesta;
 *   · solicitud que me han hecho → leo y decido: Aceptar o Rechazar;
 *   · rechazada o con un bloqueo de por medio → no hay campo para escribir.
 */
export default function ConversationScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const me = profile?.id ?? '';
  const state = useConversation(id);
  const { conversation, messages, loading, blocked, iBlocked } = state;

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [menu, setMenu] = useState<Menu>('closed');
  const scroll = useRef<ScrollView>(null);
  const fontFamily = useFontFamily();

  // Lo que me han escrito queda leído en cuanto lo tengo delante: al abrir y
  // con cada mensaje que llega mientras miro. Solo con la pantalla enfocada;
  // debajo de otra, nadie lo está leyendo.
  const unreadFromOther = messages.filter((m) => m.sender_id !== me && m.read_at === null).length;
  useEffect(() => {
    if (!focused || !conversation || unreadFromOther === 0) return;
    markRead(conversation.id, me)
      .then(refreshInbox)
      .catch(() => undefined);
  }, [focused, conversation, unreadFromOther, me]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/mensajes'));

  if (loading) {
    return (
      <Screen center>
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!conversation) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text variant="title">No encontramos esta conversación</Text>
          <Text variant="body" color="textSecondary">
            No existe, o no es tuya. Las conversaciones solo las ven las dos personas que hablan.
          </Text>
          <Button label="Ir a mis mensajes" variant="secondary" onPress={() => router.replace('/mensajes')} />
        </View>
      </Screen>
    );
  }

  const other = conversation.other;
  const name = other.display_name ?? other.username;
  const mine = conversation.requestedBy === me;
  const incoming = !mine && conversation.status === 'pending';
  const canWrite =
    !blocked && (conversation.status === 'accepted' || (conversation.status === 'pending' && mine));

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const message = await sendMessage(conversation.id, me, text);
      state.append(message);
      setDraft('');
    } catch {
      showToast('No se ha podido enviar. Inténtalo de nuevo.');
    } finally {
      setSending(false);
    }
  };

  const answer = async (value: 'accepted' | 'declined') => {
    setAnswering(true);
    try {
      await respondToRequest(conversation.id, value);
      state.setStatus(value);
      refreshInbox();
      if (value === 'declined') showToast('Solicitud rechazada. No se lo diremos.');
    } catch {
      showToast('No se ha podido responder. Inténtalo de nuevo.');
    } finally {
      setAnswering(false);
    }
  };

  const toggleBlock = async () => {
    try {
      if (iBlocked) {
        await unblock(me, other.id);
        state.setBlockedByMe(false);
        showToast(`Has desbloqueado a ${name}.`);
      } else {
        await block(me, other.id);
        state.setBlockedByMe(true);
        showToast(`Has bloqueado a ${name}.`);
      }
    } catch {
      showToast('No se ha podido completar. Inténtalo de nuevo.');
    } finally {
      setMenu('closed');
    }
  };

  return (
    <Screen padded={false} scroll={false} avoidKeyboard>
      <View style={styles.header}>
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/user/[username]', params: { username: other.username } })}
          accessibilityRole="link"
          accessibilityLabel={`Perfil de ${name}`}
          style={({ pressed }) => [styles.person, pressed && styles.pressed]}>
          <Avatar name={name} uri={other.avatar_url} size="sm" />
          <View style={styles.flex}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {name}
            </Text>
            <Text variant="micro" color="textSecondary" numberOfLines={1}>
              @{other.username}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setMenu(menu === 'closed' ? 'open' : 'closed')}
          accessibilityRole="button"
          accessibilityLabel="Opciones de la conversación"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>
      </View>

      {menu !== 'closed' ? (
        <View style={styles.menu}>
          {menu === 'open' ? (
            iBlocked ? (
              <Button label={`Desbloquear a ${name}`} variant="secondary" size="sm" onPress={toggleBlock} />
            ) : (
              <Button
                label={`Bloquear a ${name}`}
                variant="secondary"
                size="sm"
                onPress={() => setMenu('confirm-block')}
              />
            )
          ) : (
            <>
              <Text variant="caption">
                {name} no podrá escribirte, ni tú a {name}. No le avisaremos. Puedes desbloquear cuando quieras.
              </Text>
              <View style={styles.row}>
                <Button label="Sí, bloquear" size="sm" onPress={toggleBlock} />
                <Button label="Cancelar" variant="ghost" size="sm" onPress={() => setMenu('closed')} />
              </View>
            </>
          )}
        </View>
      ) : null}

      <ScrollView
        ref={scroll}
        style={styles.flex}
        contentContainerStyle={styles.messages}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        {messages.length === 0 ? (
          <Text variant="caption" color="textSecondary" style={styles.centered}>
            {mine
              ? `Escribe tu primer mensaje. A ${name} le llegará como solicitud, y decidirá si acepta.`
              : 'Todavía no hay mensajes.'}
          </Text>
        ) : (
          messages.map((message) => <Bubble key={message.id} message={message} mine={message.sender_id === me} />)
        )}
      </ScrollView>

      <StatusBanner
        name={name}
        mine={mine}
        status={conversation.status}
        blocked={blocked}
        iBlocked={iBlocked}
        hasMessages={messages.length > 0}
      />

      {incoming && !blocked ? (
        <View style={styles.decide}>
          <Button label="Aceptar" size="sm" loading={answering} onPress={() => void answer('accepted')} />
          <Button
            label="Rechazar"
            variant="secondary"
            size="sm"
            disabled={answering}
            onPress={() => void answer('declined')}
          />
        </View>
      ) : null}

      {!mine && conversation.status === 'declined' && !blocked ? (
        <View style={styles.decide}>
          <Button label="Aceptar" size="sm" loading={answering} onPress={() => void answer('accepted')} />
        </View>
      ) : null}

      {canWrite ? (
        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escribe un mensaje"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Escribe un mensaje"
            multiline
            maxLength={MESSAGE_MAX}
            onKeyPress={(event) => {
              // En web, Intro envía y Mayús+Intro salta de línea, como en
              // cualquier chat de escritorio.
              const native = event.nativeEvent as { key: string; shiftKey?: boolean };
              if (native.key === 'Enter' && !native.shiftKey) {
                (event as unknown as { preventDefault?: () => void }).preventDefault?.();
                void send();
              }
            }}
            style={[styles.input, noWebFocusRing, { fontFamily: fontFamily('400') }]}
          />
          <Pressable
            onPress={() => void send()}
            disabled={sending || draft.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Enviar"
            accessibilityState={{ disabled: sending || draft.trim().length === 0 }}
            style={({ pressed }) => [
              styles.send,
              (sending || draft.trim().length === 0) && styles.sendInactive,
              pressed && styles.pressed,
            ]}>
            {sending ? (
              <ActivityIndicator size="small" color={colors.textInverse} />
            ) : (
              <Ionicons name="send" size={18} color={colors.textInverse} />
            )}
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

function Bubble({ message, mine }: { message: Message; mine: boolean }) {
  const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(message.created_at),
  );
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
      <Text variant="body" color={mine ? 'textInverse' : 'text'}>
        {message.body}
      </Text>
      <Text variant="micro" color={mine ? 'textInverse' : 'textSecondary'} style={styles.time}>
        {time}
        {mine && message.read_at ? ' · Visto' : ''}
      </Text>
    </View>
  );
}

/** Lo que pasa con la conversación, dicho en llano. */
function StatusBanner({
  name,
  mine,
  status,
  blocked,
  iBlocked,
  hasMessages,
}: {
  name: string;
  mine: boolean;
  status: 'pending' | 'accepted' | 'declined';
  blocked: boolean;
  iBlocked: boolean;
  hasMessages: boolean;
}) {
  let text: string | null = null;
  if (iBlocked) text = `Has bloqueado a ${name}. No podéis escribiros.`;
  else if (blocked) text = 'No puedes enviar mensajes en esta conversación.';
  else if (status === 'pending' && mine && hasMessages)
    text = `Esperando a que acepte tu solicitud. ${name} ya puede leer tus mensajes.`;
  else if (status === 'pending' && !mine)
    text = `${name} quiere hablar contigo. Si aceptas, podréis escribiros. Si rechazas, no se lo diremos.`;
  else if (status === 'declined' && mine) text = `${name} no ha aceptado tu solicitud.`;
  else if (status === 'declined' && !mine) text = 'Rechazaste esta solicitud. Puedes aceptarla si cambias de idea.';
  if (!text) return null;

  return (
    <View style={styles.banner}>
      <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
      <Text variant="caption" color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconButton: {
    padding: spacing.xs,
  },
  person: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  menu: {
    gap: spacing.sm,
    padding: spacing.md,
    marginHorizontal: screenPadding,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  messages: {
    padding: screenPadding,
    gap: spacing.sm,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  centered: {
    textAlign: 'center',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.accent,
    borderBottomRightRadius: radius.sm,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderBottomLeftRadius: radius.sm,
  },
  time: {
    alignSelf: 'flex-end',
    opacity: 0.8,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  decide: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    flex: 1,
    maxHeight: 120,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
    color: colors.text,
  },
  send: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  sendInactive: {
    opacity: 0.4,
  },
  notFound: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.6,
  },
});
