import type { EnvironmentalCategory } from '@/theme';

import type {
  Entity,
  EntityMetric,
  EntityMetricName,
  EntityType,
  EnvironmentalCategoryName,
} from './database.types';
import { supabase } from './supabase';

/**
 * Entidades ambientales: lugares, empresas e iniciativas.
 *
 * Todo lo que toca `entities`, `entity_metrics`, `entity_rating_summary` y
 * `entity_follows` pasa por aquí. Las funciones devuelven datos o lanzan; la
 * traducción a mensajes de usuario vive en quien llama.
 */

/**
 * El enumerado de categorías vive en dos sitios que tienen que decir lo mismo:
 * `environmental_category` en la base de datos y `EnvironmentalCategory` en el
 * theme, que además le asigna color e icono.
 *
 * Esta comprobación falla al compilar si uno de los dos cambia sin el otro —
 * por ejemplo, si una migración añade una categoría y nadie le da color. Es
 * gratis y evita descubrirlo con un `undefined` en pantalla.
 */
type CategoriesInSync =
  EnvironmentalCategory extends EnvironmentalCategoryName
    ? EnvironmentalCategoryName extends EnvironmentalCategory
      ? true
      : ['sobran categorías en el theme que la base no conoce']
    : ['faltan categorías en el theme que la base sí tiene'];

const categoriesInSync: CategoriesInSync = true;
void categoriesInSync;

/** Entidad con su valoración comunitaria ya resuelta, lista para una ficha. */
export type EntityResult = Entity & {
  /** Media de las valoraciones, o `null` si todavía no tiene ninguna. */
  ratingAverage: number | null;
  ratingsCount: number;
};

/** Nombre visible de cada tipo, en singular. */
export const entityTypeLabels: Record<EntityType, string> = {
  lugar: 'Lugar',
  empresa: 'Empresa',
  iniciativa: 'Iniciativa',
};

/**
 * Prepara un término para un `ilike` dentro de un filtro `or` de PostgREST.
 *
 * Hay dos gramáticas que respetar y las dos muerden:
 *
 * - **La de PostgREST**: en `or=(a.ilike.x,b.ilike.y)` la coma separa
 *   condiciones y los paréntesis agrupan. Un término con una coma partiría el
 *   filtro en dos condiciones inválidas y la consulta fallaría — buscar "a,b"
 *   devolvería un error en vez de resultados.
 * - **La de SQL `LIKE`**: `%` y `_` son comodines. Sin escaparlos, quien
 *   escribe `%` busca "cualquier cosa" sin querer, y `_` casa con cualquier
 *   carácter.
 *
 * Se eliminan los caracteres estructurales y se escapan los comodines. No es
 * una búsqueda de texto completo: eso llega si hace falta, con `tsvector`.
 */
export function sanitizeSearchTerm(term: string): string {
  return term
    .trim()
    .replace(/[,()"\\]/g, ' ')
    .replace(/[%_]/g, (match) => `\\${match}`)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Columnas de `entities` sobre las que busca el texto libre. */
const SEARCHABLE = ['name', 'description', 'location_name'] as const;

export type EntitySearchOptions = {
  /** Un solo tipo de entidad. Sin él, los tres. */
  type?: EntityType;
  /** Una sola categoría ambiental. Es lo que usan las tarjetas de Sugerencias. */
  category?: EnvironmentalCategoryName;
  limit?: number;
};

/**
 * Busca entidades por texto libre, tipo y/o categoría.
 *
 * Con todo vacío devuelve el directorio entero, que es lo que pide la pantalla
 * cuando se toca un chip de alcance sin haber escrito nada.
 */
export async function searchEntities(
  term: string,
  { type, category, limit = 20 }: EntitySearchOptions = {},
): Promise<EntityResult[]> {
  const clean = sanitizeSearchTerm(term);

  let query = supabase.from('entities').select('*');

  if (clean.length > 0) {
    query = query.or(SEARCHABLE.map((column) => `${column}.ilike.%${clean}%`).join(','));
  }
  if (type) {
    query = query.eq('type', type);
  }
  if (category) {
    query = query.eq('category', category);
  }

  // Las verificadas primero y, dentro de esas, por nombre: un orden estable
  // hace que la misma búsqueda devuelva siempre lo mismo.
  const { data, error } = await query
    .order('verified', { ascending: false })
    .order('name')
    .limit(limit);

  if (error) throw error;
  return withRatings(data ?? []);
}

/** Entidad por slug, la que va en la URL. `null` si no existe. */
export async function getEntityBySlug(slug: string): Promise<EntityResult | null> {
  const { data, error } = await supabase
    .from('entities')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const [result] = await withRatings([data]);
  return result ?? null;
}

/**
 * Añade la valoración comunitaria a una lista de entidades.
 *
 * Una sola consulta para todas, no una por fila: con catorce entidades la
 * diferencia no se nota, con doscientas sí.
 */
async function withRatings(entities: Entity[]): Promise<EntityResult[]> {
  if (entities.length === 0) return [];

  const { data, error } = await supabase
    .from('entity_rating_summary')
    .select('entity_id, average, ratings_count')
    .in(
      'entity_id',
      entities.map((entity) => entity.id),
    );

  if (error) throw error;

  const byId = new Map(data?.map((row) => [row.entity_id, row]) ?? []);

  return entities.map((entity) => {
    const summary = byId.get(entity.id);
    const count = Number(summary?.ratings_count ?? 0);

    return {
      ...entity,
      // Sin valoraciones la media no es 0: es que no hay. Un 0.0 en la ficha
      // se lee como "valorada pésimamente", que es lo contrario de la verdad.
      ratingAverage: count > 0 && summary?.average != null ? Number(summary.average) : null,
      ratingsCount: count,
    };
  });
}

/**
 * Una métrica concreta de varias entidades a la vez, indexada por entidad.
 *
 * La usa el mapa para la tarjeta de calidad del aire: necesita saber qué
 * entidades tienen medición de aire sin pedir las métricas una por una.
 */
export async function getMetricByEntity(
  metric: EntityMetricName,
  entityIds: string[],
): Promise<Map<string, EntityMetric>> {
  if (entityIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from('entity_metrics')
    .select('*')
    .eq('metric', metric)
    .in('entity_id', entityIds);

  if (error) throw error;
  return new Map((data ?? []).map((row) => [row.entity_id, row]));
}

/** Métricas ambientales de una entidad. Vacío si no es un lugar medido. */
export async function getEntityMetrics(entityId: string): Promise<EntityMetric[]> {
  const { data, error } = await supabase
    .from('entity_metrics')
    .select('*')
    .eq('entity_id', entityId)
    .order('metric');

  if (error) throw error;
  return data ?? [];
}

/**
 * ¿Es el error de una tabla que no existe todavía?
 *
 * `entity_follows` la crea la migración `004`, que se aplica a mano. Entre que
 * este código se despliega y alguien ejecuta la migración hay una ventana en la
 * que la tabla no está, y una pantalla de Buscar que revienta entera por no
 * poder pintar un botón sería un precio absurdo: el directorio se puede leer
 * perfectamente sin saber a quién sigues.
 *
 * Postgres devuelve `42P01`; PostgREST, que cachea el esquema, responde
 * `PGRST205` con su propio mensaje. Se miran los dos.
 */
export function isMissingTableError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const code = (error as { code?: string }).code;
  return code === '42P01' || code === 'PGRST205';
}

/** Se lanza cuando se intenta seguir sin que la migración `004` esté aplicada. */
export class EntityFollowsUnavailable extends Error {
  constructor() {
    super('La tabla entity_follows no existe: falta aplicar la migración 004.');
    this.name = 'EntityFollowsUnavailable';
  }
}

/**
 * De las entidades dadas, cuáles sigue ya esta persona.
 *
 * Devuelve un `Set` de ids y en una sola consulta, para que una lista de
 * resultados pinte el estado de todos sus botones sin una petición por fila.
 */
export async function getFollowedEntityIds(
  userId: string,
  entityIds: string[],
): Promise<Set<string>> {
  if (entityIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('entity_follows')
    .select('entity_id')
    .eq('user_id', userId)
    .in('entity_id', entityIds);

  // Sin la migración 004 no se sigue a nadie, que es exactamente lo que
  // devuelve un conjunto vacío. La pantalla sigue funcionando.
  if (error) {
    if (isMissingTableError(error)) return new Set();
    throw error;
  }
  return new Set(data?.map((row) => row.entity_id) ?? []);
}

/** Número de personas que siguen a una entidad. `0` sin la migración `004`. */
export async function getEntityFollowerCount(entityId: string): Promise<number> {
  const { count, error } = await supabase
    .from('entity_follows')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', entityId);

  if (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
  return count ?? 0;
}

/**
 * Seguir una entidad. Idempotente: si ya se seguía, la clave primaria compuesta
 * rechaza el duplicado y se trata como éxito — el estado final es el pedido.
 */
export async function followEntity(userId: string, entityId: string): Promise<void> {
  const { error } = await supabase
    .from('entity_follows')
    .insert({ user_id: userId, entity_id: entityId });

  if (!error || error.code === '23505') return;
  // Escribir sí que no se puede disimular: aquí hay que decirlo.
  if (isMissingTableError(error)) throw new EntityFollowsUnavailable();
  throw error;
}

/** Dejar de seguir. Idempotente: borrar lo que no existe no es un error. */
export async function unfollowEntity(userId: string, entityId: string): Promise<void> {
  const { error } = await supabase
    .from('entity_follows')
    .delete()
    .eq('user_id', userId)
    .eq('entity_id', entityId);

  if (!error) return;
  if (isMissingTableError(error)) throw new EntityFollowsUnavailable();
  throw error;
}
