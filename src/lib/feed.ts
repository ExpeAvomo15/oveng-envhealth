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

/** El lugar de Turismo Verde etiquetado en una publicación (F4.4). */
export type FeedPlace = { id: string; slug: string; name: string };

export type FeedPost = {
  id: string;
  content: string;
  imageUrl: string | null;
  hashtags: string[];
  createdAt: string;
  author: FeedAuthor;
  place: FeedPlace | null;
  likesCount: number;
  likedByViewer: boolean;
  /** Comentarios (F4.7). Cero mientras no esté la migración `009`. */
  commentsCount: number;
};

/** Forma cruda que devuelve PostgREST para el select de abajo. */
type RawFeedRow = {
  id: string;
  content: string;
  image_url: string | null;
  hashtags: string[] | null;
  created_at: string;
  author: FeedAuthor | null;
  place: FeedPlace | null;
  likes_count: { count: number }[];
  /** Ausente sin la migración 009. */
  comments_count?: { count: number }[];
  /** Ausente en el select anónimo: sin lector no hay "mi me gusta". */
  my_like?: { user_id: string }[];
};

/**
 * ¿Existe ya `posts.entity_id` (migración `007`, F4.4)? Se supone que sí y, si
 * PostgREST responde que la relación no existe, se repite la consulta sin el
 * lugar y se recuerda. Así el feed no se cae en la ventana entre desplegar y
 * aplicar la migración a mano —que ya pasó con `entity_follows` en F2.2—.
 */
let placesAvailable = true;
/** Lo mismo para `comments` (migración `009`, F4.7). */
let commentsAvailable = true;

function baseSelect(): string {
  return `
  id, content, image_url, hashtags, created_at,
  author:profiles!posts_author_id_fkey ( id, username, display_name, avatar_url, verified ),
  ${placesAvailable ? 'place:entities!posts_entity_id_fkey ( id, slug, name ),' : ''}
  ${commentsAvailable ? 'comments_count:comments!comments_post_id_fkey ( count ),' : ''}
  likes_count:likes!likes_post_id_fkey ( count )
`;
}

/**
 * Con lector se pide además `my_like`, que se filtra por su id.
 *
 * **Sin lector no se pide.** Un `my_like` sin filtrar devolvería *todos* los
 * "me gusta" de cada publicación, así que pesaría más y además daría
 * `likedByViewer` verdadero para cualquiera. El feed es público desde F2.6 y
 * quien no tiene cuenta no ha dado ningún "me gusta".
 */
function feedSelect(withViewer: boolean): string {
  return withViewer ? `${baseSelect()},\n  my_like:likes!likes_post_id_fkey ( user_id )\n` : baseSelect();
}

type QueryError = { code?: string; message?: string; details?: string };

/**
 * Lo que responde PostgREST cuando la relación o la columna aún no existen.
 * Se mira **qué** falta: con dos migraciones opcionales, un `PGRST200` a secas
 * no dice cuál de las dos es.
 */
function missingRelation(error: QueryError | null, pattern: RegExp): boolean {
  if (!error) return false;
  if (error.code !== 'PGRST200' && error.code !== '42703') return false;
  return pattern.test(`${error.message ?? ''} ${error.details ?? ''}`);
}

function isMissingPlace(error: QueryError | null): boolean {
  return missingRelation(error, /entit/);
}

function isMissingComments(error: QueryError | null): boolean {
  return missingRelation(error, /comments/);
}

type QueryResult = { data: unknown; error: QueryError | null };

/**
 * Ejecuta una consulta del feed y la repite sin el lugar si falta la migración.
 *
 * Se reintenta según **el `select` que usó esta consulta**, no según el estado
 * global: el feed lanza dos a la vez, y si la primera apaga `placesAvailable`
 * antes de que la segunda falle, la segunda no reintentaría y el feed entero
 * se quedaba en "No se ha podido cargar". Lo cazó `verify:f15`.
 */
async function runFeedQuery(build: (select: string) => PromiseLike<QueryResult>, withViewer: boolean) {
  // Como mucho un reintento por cada migración que pueda faltar.
  for (let attempt = 0; ; attempt += 1) {
    const triedPlaces = placesAvailable;
    const triedComments = commentsAvailable;
    const result = await build(feedSelect(withViewer));
    if (attempt < 2 && triedPlaces && isMissingPlace(result.error)) {
      placesAvailable = false;
      continue;
    }
    if (attempt < 2 && triedComments && isMissingComments(result.error)) {
      commentsAvailable = false;
      continue;
    }
    return result;
  }
}

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
    place: row.place ?? null,
    likesCount: row.likes_count[0]?.count ?? 0,
    likedByViewer: (row.my_like?.length ?? 0) > 0,
    commentsCount: row.comments_count?.[0]?.count ?? 0,
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
  /** `null` cuando se lee sin cuenta: el feed es público desde F2.6. */
  viewerId: string | null;
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

  const { data, error } = await runFeedQuery((select) => {
    let query = supabase
      .from('posts')
      .select(select)
      .order('created_at', { ascending: false })
      .limit(FEED_PAGE_SIZE);

    if (viewerId) {
      query = query.eq('my_like.user_id', viewerId);
    }
    if (mode === 'siguiendo' && authorIds) {
      query = query.in('author_id', authorIds);
    }
    if (cursor) {
      query = query.lt('created_at', cursor);
    }
    return query;
  }, viewerId !== null);
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
export async function getPost(postId: string, viewerId: string | null): Promise<FeedPost | null> {
  // Sin lector, igual que el feed: no se pide `my_like` (ver feedSelect).
  const { data, error } = await runFeedQuery((select) => {
    let query = supabase.from('posts').select(select).eq('id', postId);
    if (viewerId) {
      query = query.eq('my_like.user_id', viewerId);
    }
    return query.maybeSingle();
  }, viewerId !== null);

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

/**
 * Las publicaciones etiquetadas en un lugar (F4.4), las más nuevas primero.
 * Para la sección "Publicaciones" del perfil de un lugar de Turismo Verde.
 */
export async function fetchPlacePosts(entityId: string, viewerId: string | null, limit = 20): Promise<FeedPost[]> {
  // Sin la migración 007 no hay publicaciones etiquetadas que pedir.
  if (!placesAvailable) return [];

  const { data, error } = await runFeedQuery((select) => {
    let query = supabase
      .from('posts')
      .select(select)
      .eq('entity_id', entityId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (viewerId) query = query.eq('my_like.user_id', viewerId);
    return query;
  }, viewerId !== null);
  if (error) {
    if (isMissingPlace(error)) return [];
    throw error;
  }

  return ((data ?? []) as unknown as RawFeedRow[])
    .map(toFeedPost)
    .filter((post): post is FeedPost => post !== null);
}
