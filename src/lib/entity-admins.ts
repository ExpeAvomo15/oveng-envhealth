import type { Entity } from './database.types';
import { isMissingTableError } from './entities';
import { supabase } from './supabase';

/**
 * Administradores de páginas (F4.4, migración `005`): el modelo LinkedIn
 * adaptado. Solo hay cuentas de personas; una entidad es una página que
 * gestionan personas que la reclaman.
 *
 * **La aprobación es automática por ahora.** La política de RLS solo deja
 * crear la fila con `role = 'admin'` y `status = 'approved'`; la verificación
 * de verdad (email corporativo, revisión, revocar) llega después de F3. La app
 * lo dice antes de confirmar y en la propia página.
 */

/** Se lanza al reclamar sin que la migración `005` esté aplicada. */
export class EntityAdminsUnavailable extends Error {
  constructor() {
    super('La tabla entity_admins no existe: falta aplicar la migración 005.');
  }
}

/** ¿Administra esta persona esta página? Sin la tabla, no. */
export async function isEntityAdmin(entityId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('entity_admins')
    .select('entity_id')
    .eq('entity_id', entityId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
  return data !== null;
}

/** Cuántas personas administran la página: se enseña junto al botón. */
export async function getEntityAdminCount(entityId: string): Promise<number> {
  const { count, error } = await supabase
    .from('entity_admins')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', entityId)
    .eq('status', 'approved');

  if (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

/**
 * Reclamar la página. Idempotente: si ya la administra, la clave primaria
 * choca (`23505`) y se trata como éxito, porque el estado final es el pedido.
 */
export async function claimEntity(entityId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('entity_admins').insert({ entity_id: entityId, user_id: userId });
  if (!error || error.code === '23505') return;
  if (isMissingTableError(error)) throw new EntityAdminsUnavailable();
  throw error;
}

/** Dejar de administrar. Borrar lo que no existe no es un error. */
export async function leaveEntity(entityId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('entity_admins')
    .delete()
    .eq('entity_id', entityId)
    .eq('user_id', userId);
  if (error && !isMissingTableError(error)) throw error;
}

export type AdministeredPage = Pick<Entity, 'id' | 'slug' | 'name' | 'type' | 'category'>;

/** Las páginas que administra una persona, para su perfil. */
export async function getAdministeredPages(userId: string): Promise<AdministeredPage[]> {
  const { data, error } = await supabase
    .from('entity_admins')
    .select('created_at, entity:entities!entity_admins_entity_id_fkey ( id, slug, name, type, category )')
    .eq('user_id', userId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }

  return (data ?? [])
    .map((row) => (row as unknown as { entity: AdministeredPage | null }).entity)
    .filter((entity): entity is AdministeredPage => entity !== null);
}
