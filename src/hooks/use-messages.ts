import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { showToast } from '@/components/ui/toast';

import {
  getConversation,
  getInboxCounts,
  haveIBlocked,
  isBlockedBetween,
  listConversations,
  listMessages,
  MessagesUnavailable,
  openConversationWith,
  type Conversation,
  type ConversationSummary,
  type InboxCounts,
  type Message,
} from '@/lib/messages';
import { supabase } from '@/lib/supabase';

import { useAuth } from './use-auth';

/**
 * Estado del chat (F4.6) con **tiempo real** de Supabase.
 *
 * Las suscripciones van con el token de la sesión —supabase-js se lo pasa a
 * Realtime al entrar y al refrescarlo—, así que RLS decide también qué cambios
 * llegan: a nadie le llega un mensaje que no puede leer.
 */

type Listener = () => void;
const inboxListeners = new Set<Listener>();

/** Avisa de que los contadores de mensajes pueden haber cambiado (al leer, al aceptar). */
export function refreshInbox(): void {
  for (const listener of inboxListeners) listener();
}

// Cada suscripción necesita un canal con nombre propio: dos pantallas con el
// mismo nombre compartirían canal y se lo cerrarían la una a la otra.
let channelSeq = 0;

type Change = { table: 'messages' | 'conversations'; filter?: string };

/** Escucha cambios de las tablas del chat mientras `enabled`; `onChange` recibe cada uno. */
function useChatChanges(
  enabled: boolean,
  changes: Change[],
  onChange: (table: Change['table'], payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => void,
) {
  const handler = useRef(onChange);
  useEffect(() => {
    handler.current = onChange;
  });
  const signature = changes.map((c) => `${c.table}:${c.filter ?? ''}`).join('|');

  useEffect(() => {
    if (!enabled) return;
    channelSeq += 1;
    const channel = supabase.channel(`chat-${channelSeq}`);
    for (const change of changes) {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: change.table, ...(change.filter ? { filter: change.filter } : {}) },
        (payload) => handler.current(change.table, payload),
      );
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // `signature` resume `changes`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, signature]);
}

const NO_COUNTS: InboxCounts = { unread: 0, requests: 0 };

/** Los contadores del icono de mensajes: sin leer y solicitudes. Cero sin sesión. */
export function useInboxCounts(): InboxCounts {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [loaded, setLoaded] = useState<{ key: string; counts: InboxCounts } | null>(null);
  const [version, setVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Varios cambios seguidos —un mensaje sube su conversación y llegan dos
  // eventos— se resuelven con una sola consulta.
  const bump = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVersion((v) => v + 1), 250);
  }, []);

  useEffect(() => {
    inboxListeners.add(bump);
    return () => {
      inboxListeners.delete(bump);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bump]);

  useChatChanges(userId !== null, [{ table: 'messages' }, { table: 'conversations' }], bump);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getInboxCounts(userId)
      .then((counts) => {
        if (active) setLoaded({ key: userId, counts });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, version]);

  return userId && loaded?.key === userId ? loaded.counts : NO_COUNTS;
}

/** La lista de conversaciones, al día con lo que llegue. */
export function useConversationList() {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [loaded, setLoaded] = useState<{ key: string; items: ConversationSummary[]; error: boolean } | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useChatChanges(userId !== null, [{ table: 'messages' }, { table: 'conversations' }], reload);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    listConversations(userId)
      .then((items) => {
        if (active) setLoaded({ key: userId, items, error: false });
      })
      .catch(() => {
        if (active) setLoaded({ key: userId, items: [], error: true });
      });
    return () => {
      active = false;
    };
  }, [userId, version]);

  const current = userId && loaded?.key === userId ? loaded : null;
  return { items: current?.items ?? [], loading: current === null, error: current?.error ?? false, reload };
}

export type ConversationState = {
  loading: boolean;
  conversation: Conversation | null;
  messages: Message[];
  /** La he bloqueado yo. */
  iBlocked: boolean;
  /** Hay un bloqueo entre las dos, en cualquier sentido (no dice quién). */
  blocked: boolean;
  /** Añade un mensaje propio recién enviado sin esperar al evento. */
  append: (message: Message) => void;
  setStatus: (status: Conversation['status']) => void;
  setBlockedByMe: (value: boolean) => void;
};

type LoadedConversation = {
  key: string;
  conversation: Conversation | null;
  messages: Message[];
  iBlocked: boolean;
  blocked: boolean;
};

/** Una conversación con sus mensajes, que llegan solos mientras está abierta. */
export function useConversation(conversationId: string): ConversationState {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const key = `${conversationId}|${userId ?? ''}`;
  const [loaded, setLoaded] = useState<LoadedConversation | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      const conversation = await getConversation(conversationId, userId);
      if (!conversation) return { key, conversation: null, messages: [], iBlocked: false, blocked: false };
      const [messages, iBlocked, blocked] = await Promise.all([
        listMessages(conversationId),
        haveIBlocked(userId, conversation.other.id),
        isBlockedBetween(userId, conversation.other.id),
      ]);
      return { key, conversation, messages, iBlocked, blocked };
    })()
      .then((value) => {
        if (active) setLoaded(value);
      })
      .catch(() => {
        if (active) setLoaded({ key, conversation: null, messages: [], iBlocked: false, blocked: false });
      });
    return () => {
      active = false;
    };
    // `key` resume la conversación y la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const append = useCallback(
    (message: Message) =>
      setLoaded((previous) => {
        if (!previous || previous.key !== key) return previous;
        const index = previous.messages.findIndex((m) => m.id === message.id);
        const messages =
          index === -1
            ? [...previous.messages, message]
            : previous.messages.map((m, i) => (i === index ? message : m));
        return { ...previous, messages };
      }),
    [key],
  );

  const setStatus = useCallback(
    (status: Conversation['status']) =>
      setLoaded((previous) =>
        previous?.conversation && previous.key === key
          ? { ...previous, conversation: { ...previous.conversation, status } }
          : previous,
      ),
    [key],
  );

  const setBlockedByMe = useCallback(
    (value: boolean) =>
      setLoaded((previous) =>
        previous && previous.key === key ? { ...previous, iBlocked: value, blocked: value } : previous,
      ),
    [key],
  );

  const current = loaded?.key === key ? loaded : null;
  const exists = current?.conversation != null;

  useChatChanges(
    exists,
    [
      { table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      { table: 'conversations', filter: `id=eq.${conversationId}` },
    ],
    (table, payload) => {
      if (payload.eventType === 'DELETE') return;
      if (table === 'messages') append(payload.new as unknown as Message);
      else setStatus((payload.new as { status: Conversation['status'] }).status);
    },
  );

  return {
    loading: current === null,
    conversation: current?.conversation ?? null,
    messages: current?.messages ?? [],
    iBlocked: current?.iBlocked ?? false,
    blocked: current?.blocked ?? false,
    append,
    setStatus,
    setBlockedByMe,
  };
}

/**
 * Empezar a chatear con alguien desde cualquier sitio donde salga una persona:
 * su perfil, una ficha de Buscar, una publicación. Abre la conversación que ya
 * hubiera o crea la solicitud. Sin cuenta, lleva a la bienvenida, como seguir.
 */
export function useStartChat() {
  const router = useRouter();
  const { profile } = useAuth();
  const me = profile?.id ?? null;
  const [opening, setOpening] = useState<string | null>(null);

  const start = useCallback(
    async (otherId: string) => {
      if (!me) {
        router.push('/welcome');
        return;
      }
      if (otherId === me) return;
      setOpening(otherId);
      try {
        const id = await openConversationWith(me, otherId);
        router.push({ pathname: '/mensajes/[id]', params: { id } });
      } catch (caught) {
        showToast(
          caught instanceof MessagesUnavailable
            ? 'Los mensajes todavía no están disponibles.'
            : 'No se ha podido abrir la conversación.',
        );
      } finally {
        setOpening(null);
      }
    },
    [me, router],
  );

  return { start, opening, me };
}
