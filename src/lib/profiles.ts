import type { Profile, TablesUpdate } from './database.types';
import { supabase } from './supabase';

/**
 * Consultas de perfiles, contadores y seguimiento.
 *
 * Todo lo que toca `profiles` y `follows` pasa por aquí: las pantallas no
 * escriben consultas sueltas. Las funciones devuelven datos o lanzan; la
 * traducción a mensajes de usuario vive en quien llama.
 */

export type ProfileCounts = {
  posts: number;
  followers: number;
  following: number;
};

export const EMPTY_COUNTS: ProfileCounts = { posts: 0, followers: 0, following: 0 };

/** Perfil por nombre de usuario. `null` si no existe. */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Perfil por id. `null` si no existe. */
export async function getProfileById(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Los tres contadores del perfil.
 *
 * Se piden con `head: true` y `count: 'exact'`: solo viaja el número, no las
 * filas. Las tres consultas van en paralelo porque no dependen entre sí.
 */
export async function getProfileCounts(userId: string): Promise<ProfileCounts> {
  const [posts, followers, following] = await Promise.all([
    supabase.from('posts').select('*', { count: 'exact', head: true }).eq('author_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
  ]);

  return {
    posts: posts.count ?? 0,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
  };
}

/** ¿`followerId` sigue a `followingId`? */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
}

/**
 * Seguir. Idempotente: si ya se seguía, la clave primaria compuesta rechaza el
 * duplicado y se trata como éxito — el estado final es el que se pedía.
 */
export async function followUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });

  if (error && error.code !== '23505') throw error;
}

/** Dejar de seguir. Idempotente: borrar lo que no existe no es un error. */
export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);

  if (error) throw error;
}

export type ProfileEdit = Pick<TablesUpdate<'profiles'>, 'display_name' | 'bio' | 'location' | 'avatar_url'>;

/**
 * Actualiza el perfil propio y devuelve la fila resultante.
 *
 * RLS solo deja escribir sobre `auth.uid() = id`: intentar editar el perfil de
 * otra cuenta no devuelve filas, y eso se trata como error explícito en vez de
 * dejar pasar un "éxito" silencioso.
 */
export async function updateProfile(userId: string, changes: ProfileEdit): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(changes)
    .eq('id', userId)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('No se ha podido actualizar el perfil: la base de datos no permitió el cambio.');
  }

  return data;
}

/** Mes y año en que se creó la cuenta: "marzo de 2026". */
export function joinedLabel(createdAt: string): string {
  const date = new Date(createdAt);
  const formatted = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
  return `Se unió en ${formatted}`;
}

/** Nombre visible con respaldo: display_name → @username. */
export function profileName(profile: Pick<Profile, 'display_name' | 'username'>): string {
  const name = profile.display_name?.trim();
  return name && name.length > 0 ? name : profile.username;
}
