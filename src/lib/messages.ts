import type { SupabaseClient } from '@supabase/supabase-js';

import type { Profile } from './database.types';
import { isMissingTableError } from './entities';
import { supabase } from './supabase';

/**
 * Mensajes 1 a 1 (F4.6, migración `008`).
 *
 * El primer mensaje llega como **solicitud**: el destinatario la acepta o la
 * rechaza antes de poder responder. Con bloqueo. Toda la privacidad la impone
 * RLS —solo las dos personas leen, solo el destinatario acepta, nadie escribe
 * con un bloqueo de por medio—; esta capa solo pide lo que la base deja ver.
 *
 * `database.types.ts` no lleva estas tablas todavía (se regenerarán desde el
 * esquema): aquí se tipan a mano, y las consultas usan `from()` sin tipo.
 */

export type ConversationStatus = 'pending' | 'accepted' | 'declined';

export type ChatPerson = Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>;

export type Conversation = {
  id: string;
  status: ConversationStatus;
  requestedBy: string;
  lastMessageAt: string;
  other: ChatPerson;
};

export type ConversationSummary = Conversation & {
  lastMessage: { body: string; senderId: string; createdAt: string } | null;
  unread: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

/** Límite de un mensaje, por debajo del `check` de 2.000 de la tabla. */
export const MESSAGE_MAX = 2000;

const PERSON = 'id, username, display_name, avatar_url';
const CONVERSATION_SELECT = `id, status, requested_by, last_message_at, user_low, user_high,
  low:profiles!conversations_user_low_fkey ( ${PERSON} ),
  high:profiles!conversations_user_high_fkey ( ${PERSON} )`;

type RawConversation = {
  id: string;
  status: ConversationStatus;
  requested_by: string;
  last_message_at: string;
  user_low: string;
  user_high: string;
  low: ChatPerson;
  high: ChatPerson;
};

// Sin tipos generados para estas tablas: el cliente sin genérico.
const db = supabase as unknown as SupabaseClient;

function toConversation(row: RawConversation, me: string): Conversation {
  return {
    id: row.id,
    status: row.status,
    requestedBy: row.requested_by,
    lastMessageAt: row.last_message_at,
    other: row.user_low === me ? row.high : row.low,
  };
}

/** La pareja ordenada, como la guarda la tabla. */
function pairOf(a: string, b: string) {
  return a < b ? { user_low: a, user_high: b } : { user_low: b, user_high: a };
}

/** Se lanza al usar el chat sin que la migración `008` esté aplicada. */
export class MessagesUnavailable extends Error {
  constructor() {
    super('Las tablas de mensajes no existen: falta aplicar la migración 008.');
  }
}

/**
 * La conversación con otra persona: la que ya existe, o una solicitud nueva.
 * Entre dos personas hay una sola conversación, la empiece quien la empiece.
 */
export async function openConversationWith(me: string, otherId: string): Promise<string> {
  const pair = pairOf(me, otherId);
  const { data: existing, error: findError } = await db
    .from('conversations')
    .select('id')
    .eq('user_low', pair.user_low)
    .eq('user_high', pair.user_high)
    .maybeSingle();
  if (findError) {
    if (isMissingTableError(findError)) throw new MessagesUnavailable();
    throw findError;
  }
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await db
    .from('conversations')
    .insert({ ...pair, requested_by: me, status: 'pending' })
    .select('id')
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

/** Una conversación, o `null` si no existe o no es tuya (RLS no la enseña). */
export async function getConversation(id: string, me: string): Promise<Conversation | null> {
  const { data, error } = await db.from('conversations').select(CONVERSATION_SELECT).eq('id', id).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return data ? toConversation(data as unknown as RawConversation, me) : null;
}

/** Mis conversaciones, la más reciente primero, con su último mensaje y no leídos. */
export async function listConversations(me: string): Promise<ConversationSummary[]> {
  const { data, error } = await db
    .from('conversations')
    .select(CONVERSATION_SELECT)
    .order('last_message_at', { ascending: false })
    .limit(100);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  const conversations = ((data ?? []) as unknown as RawConversation[]).map((row) => toConversation(row, me));
  if (conversations.length === 0) return [];

  // Los mensajes recientes de todas, en una sola consulta: el último de cada
  // una y los que no he leído. Con cien conversaciones y pocos mensajes por
  // ahora, basta; con volumen, una vista o un RPC.
  const { data: messages } = await db
    .from('messages')
    .select('conversation_id, sender_id, body, created_at, read_at')
    .in(
      'conversation_id',
      conversations.map((c) => c.id),
    )
    .order('created_at', { ascending: false })
    .limit(1000);

  const rows = (messages ?? []) as unknown as Message[];
  const summaries = conversations.map((conversation) => {
    const mine = rows.filter((m) => m.conversation_id === conversation.id);
    const last = mine[0];
    return {
      ...conversation,
      lastMessage: last ? { body: last.body, senderId: last.sender_id, createdAt: last.created_at } : null,
      unread: mine.filter((m) => m.sender_id !== me && m.read_at === null).length,
    };
  });
  // Una solicitud sin mensajes todavía no es nada para quien la recibe: quien
  // la pidió abrió la conversación pero aún no ha escrito.
  return summaries.filter((c) => !(isIncomingRequest(c, me) && c.lastMessage === null));
}

/** Me la han pedido y no he respondido. */
export function isIncomingRequest(conversation: Conversation, me: string): boolean {
  return conversation.status === 'pending' && conversation.requestedBy !== me;
}

/**
 * Qué va en la pestaña Chats: todo menos lo que me han pedido y no he aceptado
 * —eso va en Solicitudes— y lo que he rechazado yo.
 */
export function isChat(conversation: Conversation, me: string): boolean {
  if (conversation.requestedBy === me) return true;
  return conversation.status === 'accepted';
}

/** Los mensajes de una conversación, del más antiguo al más nuevo. */
export async function listMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await db
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Message[];
}

export async function sendMessage(conversationId: string, me: string, body: string): Promise<Message> {
  const text = body.trim();
  if (text.length === 0) throw new Error('El mensaje está vacío.');
  const { data, error } = await db
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: me, body: text.slice(0, MESSAGE_MAX) })
    .select('*')
    .single();
  if (error) throw error;
  return data as unknown as Message;
}

/** Aceptar o rechazar una solicitud. Solo el destinatario puede (RLS). */
export async function respondToRequest(conversationId: string, answer: 'accepted' | 'declined'): Promise<void> {
  const { data, error } = await db.from('conversations').update({ status: answer }).eq('id', conversationId).select('id');
  if (error) throw error;
  if (!data || (data as unknown[]).length === 0) throw new Error('No puedes responder a esta solicitud.');
}

/** Marca como leídos los mensajes que me han enviado en esta conversación. */
export async function markRead(conversationId: string, me: string): Promise<void> {
  await db
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', me)
    .is('read_at', null);
}

/**
 * ¿Hay un bloqueo entre las dos personas, en cualquier sentido? La función de
 * la base solo responde a quien es parte de la pareja, y no dice quién bloqueó
 * a quién.
 */
export async function isBlockedBetween(a: string, b: string): Promise<boolean> {
  const { data, error } = await db.rpc('is_blocked_between', { a, b });
  if (error) return false;
  return data === true;
}

/** ¿La he bloqueado yo? (Solo se ven los bloqueos propios.) */
export async function haveIBlocked(me: string, otherId: string): Promise<boolean> {
  const { data } = await db.from('blocks').select('blocked_id').eq('blocker_id', me).eq('blocked_id', otherId);
  return ((data ?? []) as unknown[]).length > 0;
}

export async function block(me: string, otherId: string): Promise<void> {
  const { error } = await db.from('blocks').insert({ blocker_id: me, blocked_id: otherId });
  if (error && error.code !== '23505') throw error;
}

export async function unblock(me: string, otherId: string): Promise<void> {
  const { error } = await db.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', otherId);
  if (error) throw error;
}

export type InboxCounts = { unread: number; requests: number };

/**
 * Lo que enseña el icono de mensajes: los mensajes sin leer en conversaciones
 * aceptadas, y las solicitudes que me han llegado y no he respondido.
 */
export async function getInboxCounts(me: string): Promise<InboxCounts> {
  const summaries = await listConversations(me);
  return {
    unread: summaries.filter((c) => c.status === 'accepted').reduce((total, c) => total + c.unread, 0),
    requests: summaries.filter((c) => isIncomingRequest(c, me)).length,
  };
}

/** "Mensajes, 2 sin leer, 1 solicitud": el nombre accesible del icono. */
export function inboxLabel({ unread, requests }: InboxCounts): string {
  const parts = [
    unread > 0 ? `${unread} sin leer` : null,
    requests > 0 ? `${requests} ${requests === 1 ? 'solicitud' : 'solicitudes'}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? `Mensajes, ${parts.join(', ')}` : 'Mensajes';
}
