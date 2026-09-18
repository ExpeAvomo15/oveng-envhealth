import { supabase } from './supabase';

/**
 * Lectura del feed.
 *
 * ## Por qué una sola consulta y no una vista ni un RPC
 *
 * Cada tarjeta necesita cuatro cosas: la publicación, su autor, cuántos "me
 * gusta" tiene y si yo le he dado. Se resuelve con un `select` anidado de
 * PostgREST, que genera un único viaje al servidor:
 *
 * - `author:profiles!posts_author_id_fkey(...)` incrusta el perfil del autor;
 * - `likes_count:likes(count)` devuelve el agregado, no las filas;
 * - `my_like:likes(user_id)` con `.eq('my_like.user_id', …)` devuelve un array
 *   vacío o con una fila. Filtrar un recurso incrustado **no** descarta la
 *   publicación padre: comprobado contra la base real antes de construir esto.
 *
 * Se descartó una vista o una función porque exigirían una migración, y en este
 * proyecto las migraciones las aplica el autor a mano: añadir fricción de
 * despliegue para ahorrar una anidación no compensa. Si el feed crece en
 * complejidad —ranking, mezcla de fuentes— el sitio natural es un RPC.
 */

export const FEED_PAGE_SIZE = 20;

export type FeedMode = 'para-ti' | 'siguiendo';

export type FeedAuthor = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  verified: boolean;
};

export type FeedPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  hashtags: string[];
  createdAt: string;
  author: FeedAuthor;
  likesCount: number;
  likedByViewer: boolean;
};

/** Forma cruda que devuelve PostgREST para el select de abajo. */
type RawFeedRow = {
  id: string;
  content: string;
  image_url: string | null;
  hashtags: string[] | null;
  created_at: string;
  author: FeedAuthor | null;
  likes_count: { count: number }[];
  my_like: { user_id: string }[];
};

const FEED_SELECT = `
  id, content, image_url, hashtags, created_at,
  author:profiles!posts_author_id_fkey ( id, username, display_name, avatar_url, verified ),
  likes_count:likes!likes_post_id_fkey ( count ),
  my_like:likes!likes_post_id_fkey ( user_id )
`;

function toFeedPost(row: RawFeedRow): FeedPost | null {
  // Sin autor no hay tarjeta que pintar. No debería pasar —la FK lo impide—
  // pero el tipo lo admite y es mejor descartar que romper el feed entero.
  if (!row.author) return null;

  return {
    id: row.id,
    content: row.content,
    imageUrl: row.image_url,
    hashtags: row.hashtags ?? [],
    createdAt: row.created_at,
    author: row.author,
    likesCount: row.likes_count[0]?.count ?? 0,
    likedByViewer: row.my_like.length > 0,
  };
}

/** A quién sigue una cuenta. Necesario para el modo "Siguiendo". */
export async function getFollowingIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (error) throw error;
  return (data ?? []).map((row) => row.following_id);
}

export type FeedPage = {
  posts: FeedPost[];
  /** `created_at` desde el que pedir la página siguiente, o `null` si se acabó. */
  cursor: string | null;
};

export type FetchFeedOptions = {
  viewerId: string;
  mode: FeedMode;
  /** `created_at` de la última publicación de la página anterior. */
  cursor?: string | null;
  /** Ids a los que limitar el feed. Solo en modo "Siguiendo". */
  authorIds?: string[];
};

/**
 * Una página del feed, más reciente primero.
 *
 * La paginación es por cursor sobre `created_at`, no por `offset`: con offset,
 * publicar algo mientras alguien baja por el feed le repite una tarjeta.
 */
export async function fetchFeed({
  viewerId,
  mode,
  cursor = null,
  authorIds,
}: FetchFeedOptions): Promise<FeedPage> {
  // En "Siguiendo" sin nadie a quien seguir no hay nada que preguntar.
  if (mode === 'siguiendo' && (!authorIds || authorIds.length === 0)) {
    return { posts: [], cursor: null };
  }

  let query = supabase
    .from('posts')
    .select(FEED_SELECT)
    .eq('my_like.user_id', viewerId)
    .order('created_at', { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (mode === 'siguiendo' && authorIds) {
    query = query.in('author_id', authorIds);
  }
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawFeedRow[];
  const posts = rows.map(toFeedPost).filter((post): post is FeedPost => post !== null);

  return {
    posts,
    // Si la página viene incompleta, no hay más que pedir.
    cursor: rows.length === FEED_PAGE_SIZE ? (rows[rows.length - 1]?.created_at ?? null) : null,
  };
}

/** Una publicación suelta, con la misma forma que las del feed. */
export async function getPost(postId: string, viewerId: string): Promise<FeedPost | null> {
  const { data, error } = await supabase
    .from('posts')
    .select(FEED_SELECT)
    .eq('id', postId)
    .eq('my_like.user_id', viewerId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return toFeedPost(data as unknown as RawFeedRow);
}

/** Dar "me gusta". Idempotente: repetirlo choca con la PK y da igual. */
export async function likePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase.from('likes').insert({ user_id: userId, post_id: postId });
  if (error && error.code !== '23505') throw error;
}

/** Quitar el "me gusta". Idempotente: borrar lo que no existe no es un error. */
export async function unlikePost(userId: string, postId: string): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('post_id', postId);

  if (error) throw error;
}
