import type { Entity, Job, JobType } from './database.types';
import { isMissingTableError, sanitizeSearchTerm } from './entities';
import { supabase } from './supabase';

/**
 * Ofertas de empleo de las páginas (F4.4, migración `006`).
 *
 * Lectura libre: las activas las ve cualquiera, sin cuenta. Escribir solo
 * puede un administrador aprobado de la entidad, en su propio nombre: lo
 * impone RLS, y la app solo enseña el formulario a quien lo es.
 *
 * Las ofertas con `created_by` nulo son **de ejemplo**: las carga el seed para
 * que la demo tenga algo que enseñar, y la app las marca como tales.
 */

export type JobEntity = Pick<Entity, 'id' | 'slug' | 'name' | 'type' | 'category' | 'location_name'>;

export type JobWithEntity = Job & { entity: JobEntity };

/** Palabra llana de cada tipo de oferta. */
export const jobTypeLabels: Record<JobType, string> = {
  completa: 'Jornada completa',
  parcial: 'Media jornada',
  voluntariado: 'Voluntariado',
  practicas: 'Prácticas',
};

export const jobTypes: JobType[] = ['completa', 'parcial', 'voluntariado', 'practicas'];

/** ¿Es contenido de ejemplo cargado por el seed? */
export function isExampleJob(job: Job): boolean {
  return job.created_by === null;
}

const SELECT = `*, entity:entities!jobs_entity_id_fkey ( id, slug, name, type, category, location_name )`;

/** Se lanza al escribir sin que la migración `006` esté aplicada. */
export class JobsUnavailable extends Error {
  constructor() {
    super('La tabla jobs no existe: falta aplicar la migración 006.');
  }
}

/**
 * Ofertas activas, las más nuevas primero. Con término, filtra por título,
 * descripción y ubicación con el mismo saneado que el directorio.
 */
export async function listActiveJobs(term = '', limit = 30): Promise<JobWithEntity[]> {
  let query = supabase.from('jobs').select(SELECT).eq('active', true).order('created_at', { ascending: false }).limit(limit);

  const clean = sanitizeSearchTerm(term);
  if (clean.length > 0) {
    query = query.or(
      `title.ilike.%${clean}%,description.ilike.%${clean}%,location_name.ilike.%${clean}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data ?? []) as unknown as JobWithEntity[];
}

/**
 * Las ofertas de una página. Para quien la administra incluye sus propias
 * inactivas —RLS solo se las enseña a quien las creó—, para poder reactivarlas.
 */
export async function listEntityJobs(entityId: string): Promise<JobWithEntity[]> {
  const { data, error } = await supabase
    .from('jobs')
    .select(SELECT)
    .eq('entity_id', entityId)
    .order('active', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
  return (data ?? []) as unknown as JobWithEntity[];
}

export async function getJob(id: string): Promise<JobWithEntity | null> {
  const { data, error } = await supabase.from('jobs').select(SELECT).eq('id', id).maybeSingle();
  if (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
  return (data as unknown as JobWithEntity | null) ?? null;
}

export type JobDraft = {
  title: string;
  description: string;
  location_name: string;
  type: JobType;
  how_to_apply: string;
};

/** Límites de la interfaz, por debajo de los `check` de la tabla. */
export const JOB_LIMITS = { title: 120, description: 2000, location: 80, howToApply: 300 };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;

/** "Cómo aplicar" tiene que ser un email o un enlace que empiece por http. */
export function applyKind(value: string): 'email' | 'url' | null {
  const clean = value.trim();
  if (EMAIL.test(clean)) return 'email';
  if (URL_RE.test(clean)) return 'url';
  return null;
}

/** El enlace al que lleva "Cómo aplicar". */
export function applyHref(value: string): string | null {
  const kind = applyKind(value);
  if (kind === 'email') return `mailto:${value.trim()}`;
  if (kind === 'url') return value.trim();
  return null;
}

/** Errores del formulario, en llano. Vacío si todo está bien. */
export function validateJob(draft: JobDraft): Partial<Record<keyof JobDraft, string>> {
  const errors: Partial<Record<keyof JobDraft, string>> = {};
  if (draft.title.trim().length < 3) errors.title = 'Pon un título de al menos 3 letras.';
  if (draft.description.trim().length < 20)
    errors.description = 'Cuenta un poco más: al menos 20 caracteres sobre el trabajo.';
  if (!applyKind(draft.how_to_apply))
    errors.how_to_apply = 'Pon un email (nombre@dominio.com) o un enlace que empiece por https://';
  return errors;
}

function toRow(draft: JobDraft) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    location_name: draft.location_name.trim() || null,
    type: draft.type,
    how_to_apply: draft.how_to_apply.trim(),
  };
}

export async function createJob(entityId: string, userId: string, draft: JobDraft): Promise<Job> {
  const { data, error } = await supabase
    .from('jobs')
    .insert({ ...toRow(draft), entity_id: entityId, created_by: userId })
    .select()
    .single();
  if (error) {
    if (isMissingTableError(error)) throw new JobsUnavailable();
    throw error;
  }
  return data;
}

/**
 * Actualiza una oferta propia. RLS filtra en vez de rechazar, así que una
 * actualización ajena "funciona" y no cambia nada: se pide la fila de vuelta y
 * una respuesta vacía es un error explícito (como en `updateProfile`).
 */
export async function updateJob(id: string, changes: Partial<JobDraft> & { active?: boolean }): Promise<Job> {
  const row = { ...(changes.title !== undefined ? toRow(changes as JobDraft) : {}), ...('active' in changes ? { active: changes.active } : {}) };
  const { data, error } = await supabase.from('jobs').update(row).eq('id', id).select();
  if (error) throw error;
  const updated = data?.[0];
  if (!updated) throw new Error('No tienes permiso para cambiar esta oferta.');
  return updated;
}
