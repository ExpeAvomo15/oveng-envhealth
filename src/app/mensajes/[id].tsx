import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useIsFocused, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

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
  type SharedPostPreview,
} from '@/lib/messages';
import { shareSnippet } from '@/lib/share';
import { useFontFamily } from '@/hooks/use-fonts';
import { chatStamp } from '@/lib/time';
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
    <Screen padded={false} scroll={false} background="surface" avoidKeyboard>
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
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {name}
          </Text>
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
          <MessageList messages={messages} me={me} other={other} name={name} />
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
          <Button
            label="Aceptar"
            size="sm"
            fullWidth
            loading={answering}
            onPress={() => void answer('accepted')}
            style={styles.flex}
          />
          <Button
            label="Rechazar"
            variant="tonal"
            size="sm"
            fullWidth
            disabled={answering}
            onPress={() => void answer('declined')}
            style={styles.flex}
          />
        </View>
      ) : null}

      {!mine && conversation.status === 'declined' && !blocked ? (
        <View style={styles.decide}>
          <Button label="Aceptar" size="sm" loading={answering} onPress={() => void answer('accepted')} />
        </View>
      ) : null}

      {canWrite ? (
        <View style={styles.composerBar}>
          <View style={styles.composer}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Escribe un mensaje…"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Escribe un mensaje"
              multiline
              // En web, `multiline` es un textarea que nace con dos filas: una
              // basta, y crece con lo que se escribe.
              numberOfLines={1}
              maxLength={MESSAGE_MAX}
              // Con el teclado abierto, el último mensaje tiene que seguir a la vista.
              onFocus={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 300)}
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
              hitSlop={8}
              style={({ pressed }) => [styles.send, pressed && styles.pressed]}>
              {sending ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <Text variant="bodyStrong" color={draft.trim().length === 0 ? 'textMuted' : 'accent'}>
                  Enviar
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

/** Mensajes a menos de este tiempo del anterior van en el mismo bloque, sin marca de hora. */
const BLOCK_GAP_MS = 20 * 60 * 1000;

/**
 * Los mensajes con el patrón de Instagram (F4.6b): los seguidos de una misma
 * persona se agrupan —esquinas pegadas, avatar solo en el último de lo
 * recibido— y la hora sale centrada solo al empezar un bloque nuevo.
 *
 * Se monta cuando la conversación ya ha cargado, así que lo que había al abrir
 * se pinta quieto y solo lo que llega después entra deslizándose desde abajo.
 */
function MessageList({
  messages,
  me,
  other,
  name,
}: {
  messages: Message[];
  me: string;
  other: { avatar_url: string | null };
  name: string;
}) {
  const [initial] = useState(() => new Set(messages.map((m) => m.id)));
  const lastMine = [...messages].reverse().find((m) => m.sender_id === me);

  return (
    <>
      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const next = messages[index + 1];
        const time = new Date(message.created_at).getTime();
        const newBlock = !previous || time - new Date(previous.created_at).getTime() > BLOCK_GAP_MS;
        const nextNewBlock = !next || new Date(next.created_at).getTime() - time > BLOCK_GAP_MS;
        const first = newBlock || previous.sender_id !== message.sender_id;
        const last = nextNewBlock || next.sender_id !== message.sender_id;
        const mine = message.sender_id === me;
        return (
          <View key={message.id}>
            {newBlock ? (
              <Text variant="micro" color="textSecondary" style={styles.stamp}>
                {chatStamp(message.created_at)}
              </Text>
            ) : null}
            <Bubble
              message={message}
              mine={mine}
              first={first}
              last={last}
              author={mine ? 'Tú' : name}
              avatar={!mine && last ? <Avatar name={name} uri={other.avatar_url} size="xs" /> : null}
              animate={!initial.has(message.id)}
            />
            {mine && message.id === lastMine?.id && message.read_at ? (
              <Text variant="micro" color="textSecondary" style={styles.seen}>
                Visto
              </Text>
            ) : null}
          </View>
        );
      })}
    </>
  );
}

function Bubble({
  message,
  mine,
  first,
  last,
  author,
  avatar,
  animate,
}: {
  message: Message;
  mine: boolean;
  first: boolean;
  last: boolean;
  author: string;
  avatar: ReactNode;
  animate: boolean;
}) {
  const [progress] = useState(() => new Animated.Value(animate ? 0 : 1));
  useEffect(() => {
    if (!animate) return;
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [animate, progress]);

  const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(message.created_at),
  );
  // La esquina hacia quien escribe va menos redondeada; la de arriba solo en
  // el primero del grupo, para que los seguidos se lean pegados.
  const corners = mine
    ? { borderTopRightRadius: first ? BUBBLE_RADIUS : BUBBLE_JOINED, borderBottomRightRadius: BUBBLE_JOINED }
    : { borderTopLeftRadius: first ? BUBBLE_RADIUS : BUBBLE_JOINED, borderBottomLeftRadius: BUBBLE_JOINED };

  return (
    <Animated.View
      style={[
        styles.bubbleRow,
        mine ? styles.bubbleRowMine : styles.bubbleRowOther,
        last && styles.bubbleRowLast,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
        },
      ]}>
      {mine ? null : <View style={styles.avatarSlot}>{avatar}</View>}
      {message.shared_post ? (
        <SharedPostBubble post={message.shared_post} author={author} time={time} corners={corners} />
      ) : (
        <View
          accessibilityLabel={`${author}, ${time}: ${message.body}`}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, corners]}>
          <Text variant="body" color={mine ? 'textInverse' : 'text'}>
            {message.body}
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

/**
 * Una publicación enviada por mensaje (F4.7): mini-tarjeta con la imagen
 * pequeña, el autor y el inicio del texto, que lleva a la publicación. Blanca
 * con borde en los dos lados de la conversación: es contenido, no texto de
 * quien la envía.
 */
function SharedPostBubble({
  post,
  author,
  time,
  corners,
}: {
  post: SharedPostPreview;
  author: string;
  time: string;
  corners: object;
}) {
  const router = useRouter();
  const by = post.author?.username ?? 'alguien';
  const snippet = shareSnippet(post.content, 90);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/publicacion/[id]', params: { id: post.id } })}
      accessibilityRole="link"
      accessibilityLabel={`${author}, ${time}: publicación de @${by}: ${snippet}. Abrir la publicación`}
      style={({ pressed }) => [styles.bubble, styles.sharedPost, corners, pressed && styles.pressed]}>
      <View style={styles.sharedAuthor}>
        <Avatar name={post.author?.display_name ?? by} uri={post.author?.avatar_url ?? null} size="xs" />
        <Text variant="captionStrong" numberOfLines={1} style={styles.flex}>
          {by}
        </Text>
      </View>
      <View style={styles.sharedBody}>
        {post.image_url ? (
          <Image source={{ uri: post.image_url }} style={styles.sharedImage} contentFit="cover" />
        ) : null}
        <Text variant="caption" numberOfLines={3} style={styles.flex}>
          {snippet}
        </Text>
      </View>
      <Text variant="micro" color="textSecondary">
        Ver publicación
      </Text>
    </Pressable>
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

const BUBBLE_RADIUS = 18;
const BUBBLE_JOINED = 4;

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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  centered: {
    textAlign: 'center',
  },
  stamp: {
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  seen: {
    textAlign: 'right',
    marginTop: 2,
    marginRight: spacing.xs,
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginTop: 2,
  },
  bubbleRowMine: {
    justifyContent: 'flex-end',
  },
  bubbleRowOther: {
    justifyContent: 'flex-start',
  },
  bubbleRowLast: {
    marginBottom: spacing.sm,
  },
  avatarSlot: {
    width: 28,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: BUBBLE_RADIUS,
  },
  bubbleMine: {
    backgroundColor: colors.accent,
  },
  bubbleOther: {
    backgroundColor: colors.surfaceMuted,
  },
  sharedPost: {
    width: 260,
    gap: spacing.sm,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sharedAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sharedBody: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  sharedImage: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  decide: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  composerBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    minHeight: 44,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    flex: 1,
    maxHeight: 120,
    paddingVertical: 10,
    color: colors.text,
  },
  send: {
    height: 42,
    justifyContent: 'center',
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
