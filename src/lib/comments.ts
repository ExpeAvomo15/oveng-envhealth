import type { SupabaseClient } from '@supabase/supabase-js';

import { isMissingTableError } from './entities';
import type { FeedAuthor } from './feed';
import { supabase } from './supabase';

/**
 * Comentarios de una publicación (F4.7, migración `009`).
 *
 * Se leen sin cuenta; se escriben con ella y en nombre propio; los borra quien
 * los escribió o quien escribió la publicación. Todo eso lo impone RLS: esta
 * capa solo pide lo que la base deja hacer.
 *
 * **Sin tiempo real, a propósito.** Se cargan al abrir la publicación y lo
 * propio aparece al instante (optimista). Reutilizar el canal del chat no sale
 * gratis: obliga a meter una tabla **pública** en la publicación de Realtime y
 * a abrir un canal por cada visitante que lee, con o sin cuenta, para algo que
 * no es una conversación. Si los comentarios se vuelven conversación, se
 * replantea (notas, F4.7).
 */

export type Comment = {
  id: string;
  postId: string;
  content: string;
  createdAt: string;
  author: Pick<FeedAuthor, 'id' | 'username' | 'display_name' | 'avatar_url'>;
};

/** Límite de un comentario. El `check` de la tabla dice lo mismo. */
export const COMMENT_MAX = 500;
/** Comentarios por página: los primeros al abrir y luego "Ver más". */
export const COMMENTS_PAGE_SIZE = 30;

type RawComment = {
  id: string;
  post_id: string;
  content: string;
  created_at: string;
  author: Comment['author'] | null;
};

const SELECT = `id, post_id, content, created_at,
  author:profiles!comments_user_id_fkey ( id, username, display_name, avatar_url )`;

// `database.types.ts` no lleva la tabla todavía: el cliente sin genérico, como
// en lib/messages.ts.
const db = supabase as unknown as SupabaseClient;

/** Se lanza al comentar sin que la migración `009` esté aplicada. */
export class CommentsUnavailable extends Error {
  constructor() {
    super('La tabla comments no existe: falta aplicar la migración 009.');
    this.name = 'CommentsUnavailable';
  }
}

function toComment(row: RawComment): Comment | null {
  return row.author
    ? { id: row.id, postId: row.post_id, content: row.content, createdAt: row.created_at, author: row.author }
    : null;
}

export type CommentsPage = {
  comments: Comment[];
  /** `created_at` desde el que pedir los siguientes, o `null` si no hay más. */
  cursor: string | null;
  /** `false` si la tabla no existe todavía: la pantalla lo dice. */
  available: boolean;
};

/**
 * Una página de comentarios, **del más antiguo al más nuevo**, como se leen en
 * Instagram: la conversación de arriba abajo. Cursor por `created_at`, igual
 * que el feed.
 */
export async function listComments(postId: string, cursor: string | null = null): Promise<CommentsPage> {
  let query = db
    .from('comments')
    .select(SELECT)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(COMMENTS_PAGE_SIZE);
  if (cursor) query = query.gt('created_at', cursor);

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return { comments: [], cursor: null, available: false };
    throw error;
  }
  const rows = (data ?? []) as unknown as RawComment[];
  return {
    comments: rows.map(toComment).filter((c): c is Comment => c !== null),
    cursor: rows.length === COMMENTS_PAGE_SIZE ? (rows[rows.length - 1]?.created_at ?? null) : null,
    available: true,
  };
}

export async function addComment(postId: string, userId: string, content: string): Promise<Comment> {
  const text = content.trim();
  if (text.length === 0) throw new Error('El comentario está vacío.');
  if (text.length > COMMENT_MAX) throw new Error(`Un comentario no puede pasar de ${COMMENT_MAX} caracteres.`);

  const { data, error } = await db
    .from('comments')
    .insert({ post_id: postId, user_id: userId, content: text })
    .select(SELECT)
    .single();
  if (error) {
    if (isMissingTableError(error)) throw new CommentsUnavailable();
    throw error;
  }
  const comment = toComment(data as unknown as RawComment);
  if (!comment) throw new Error('No se ha podido publicar el comentario.');
  return comment;
}

/**
 * Borra un comentario. RLS solo deja a su autor o al de la publicación; si no
 * borra nada es que no podías, y se dice.
 */
export async function deleteComment(commentId: string): Promise<void> {
  const { data, error } = await db.from('comments').delete().eq('id', commentId).select('id');
  if (error) throw error;
  if (!data || (data as unknown[]).length === 0) throw new Error('No puedes borrar este comentario.');
}
