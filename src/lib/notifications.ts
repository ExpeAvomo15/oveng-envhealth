import type { SupabaseClient } from '@supabase/supabase-js';

import { isMissingTableError } from './entities';
import type { FeedAuthor } from './feed';
import { supabase } from './supabase';

/**
 * Notificaciones de la campana (F4.7, migración `009`).
 *
 * Las escribe la base con triggers —seguir, "me gusta", comentar, enviar una
 * publicación por mensaje—, nunca la app: no hay política de INSERT. Solo las
 * lee y las marca su destinatario. Los mensajes de chat no van aquí: tienen su
 * propio bocadillo, como en Instagram.
 */

export type NotificationType = 'follow' | 'like' | 'comment' | 'share_to_chat';

export type AppNotification = {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
  actor: Pick<FeedAuthor, 'id' | 'username' | 'display_name' | 'avatar_url'>;
  post: { id: string; image_url: string | null; content: string } | null;
  comment: { id: string; content: string } | null;
};

type Raw = {
  id: string;
  type: NotificationType;
  read: boolean;
  created_at: string;
  actor: AppNotification['actor'] | null;
  post: AppNotification['post'];
  comment: AppNotification['comment'];
};

const SELECT = `id, type, read, created_at,
  actor:profiles!notifications_actor_id_fkey ( id, username, display_name, avatar_url ),
  post:posts!notifications_post_id_fkey ( id, image_url, content ),
  comment:comments!notifications_comment_id_fkey ( id, content )`;

// Sin tipos generados para la tabla, como en lib/messages.ts.
const db = supabase as unknown as SupabaseClient;

export const NOTIFICATIONS_LIMIT = 50;

/** Las últimas, la más reciente primero. Vacío si la `009` no está aplicada. */
export async function listNotifications(me: string): Promise<AppNotification[]> {
  const { data, error } = await db
    .from('notifications')
    .select(SELECT)
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .limit(NOTIFICATIONS_LIMIT);
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return ((data ?? []) as unknown as Raw[])
    .filter((row) => row.actor !== null)
    .map((row) => ({
      id: row.id,
      type: row.type,
      read: row.read,
      createdAt: row.created_at,
      actor: row.actor!,
      post: row.post ?? null,
      comment: row.comment ?? null,
    }));
}

/** Cuántas sin leer: el número de la campana. */
export async function countUnreadNotifications(me: string): Promise<number> {
  const { count, error } = await db
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', me)
    .eq('read', false);
  if (error) return 0;
  return count ?? 0;
}

/** Al abrir la pantalla, todas quedan leídas. */
export async function markAllNotificationsRead(me: string): Promise<void> {
  await db.from('notifications').update({ read: true }).eq('user_id', me).eq('read', false);
}

/** La frase de cada fila, en llano: "comentó tu publicación: «…»". */
export function notificationText(notification: AppNotification): string {
  switch (notification.type) {
    case 'follow':
      return 'empezó a seguirte';
    case 'like':
      return 'le gustó tu publicación';
    case 'comment':
      return notification.comment ? `comentó: «${clip(notification.comment.content)}»` : 'comentó tu publicación';
    case 'share_to_chat':
      return 'envió tu publicación por mensaje';
  }
}

/** "Notificaciones, 3 sin leer": el nombre accesible de la campana. */
export function bellLabel(unread: number): string {
  return unread > 0 ? `Notificaciones, ${unread} sin leer` : 'Notificaciones';
}

function clip(text: string, max = 80): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
