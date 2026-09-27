import type { EntityResult } from './entities';
import { sanitizeSearchTerm, searchEntities } from './entities';
import type { EnvironmentalCategoryName, Profile } from './database.types';
import { supabase } from './supabase';

/**
 * La sección Buscar: qué se busca, dónde y con qué forma vuelve.
 *
 * Orquesta las consultas de `entities` (en `entities.ts`) y de `profiles`, que
 * son tablas distintas y no se pueden pedir en una sola llamada.
 */

/** Alcance de la búsqueda: el chip seleccionado bajo la barra. */
export type SearchScope = 'todo' | 'empresa' | 'iniciativa' | 'lugar' | 'persona';

export const searchScopes: { key: SearchScope; label: string }[] = [
  { key: 'todo', label: 'Todo' },
  { key: 'empresa', label: 'Empresas' },
  { key: 'iniciativa', label: 'Iniciativas' },
  { key: 'persona', label: 'Personas' },
  { key: 'lugar', label: 'Lugares' },
];

export type SearchResults = {
  empresas: EntityResult[];
  iniciativas: EntityResult[];
  lugares: EntityResult[];
  personas: Profile[];
};

export const EMPTY_RESULTS: SearchResults = {
  empresas: [],
  iniciativas: [],
  lugares: [],
  personas: [],
};

/** ¿Hay algo que enseñar? */
export function hasResults(results: SearchResults): boolean {
  return totalResults(results) > 0;
}

export function totalResults(results: SearchResults): number {
  return (
    results.empresas.length +
    results.iniciativas.length +
    results.lugares.length +
    results.personas.length
  );
}

/**
 * Busca personas por nombre de usuario o nombre visible.
 *
 * El término pasa por el mismo saneado que el de entidades: `profiles` se
 * consulta con el mismo `or` de PostgREST y tiene los mismos caracteres
 * problemáticos.
 */
export async function searchPeople(term: string, limit = 20): Promise<Profile[]> {
  const clean = sanitizeSearchTerm(term);

  // Sin término, las cuentas más recientes. Es el chip "Personas" pulsado sin
  // escribir nada, y devolver vacío ahí sería raro: la visión pide que Buscar
  // resuelva el arranque en frío, y para eso hay que poder ver a quién hay.
  // `profiles` es de lectura pública por RLS, así que no se enseña nada que no
  // se vea ya en cualquier perfil.
  const query =
    clean.length === 0
      ? supabase.from('profiles').select('*').order('created_at', { ascending: false })
      : supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${clean}%,display_name.ilike.%${clean}%`)
          .order('username');

  const { data, error } = await query.limit(limit);

  if (error) throw error;
  return data ?? [];
}

export type SearchParams = {
  term: string;
  scope: SearchScope;
  /** Filtro por categoría, que activan las tarjetas de Sugerencias. */
  category?: EnvironmentalCategoryName;
};

/**
 * Ejecuta la búsqueda que corresponde al alcance.
 *
 * Con alcance `todo` pide las dos tablas en paralelo y reparte las entidades
 * por tipo, porque la pantalla las enseña agrupadas. Con un alcance concreto
 * pide solo lo que hace falta: buscar personas cuando el chip dice "Empresas"
 * es una petición que se tira a la basura.
 *
 * **Las personas no se filtran por categoría.** Una categoría ambiental es una
 * propiedad de las entidades; las personas no la tienen. Así que una búsqueda
 * por categoría no devuelve personas, en vez de devolverlas todas ignorando el
 * filtro.
 */
export async function search({ term, scope, category }: SearchParams): Promise<SearchResults> {
  const clean = sanitizeSearchTerm(term);
  const emptyQuery = clean.length === 0 && !category;

  if (scope === 'persona') {
    // Una categoría ambiental no se aplica a personas: devolver a todo el mundo
    // ignorando el filtro sería peor que no devolver nada.
    if (category) return EMPTY_RESULTS;
    return { ...EMPTY_RESULTS, personas: await searchPeople(term) };
  }

  if (scope !== 'todo') {
    const entities = await searchEntities(term, { type: scope, category });
    return { ...EMPTY_RESULTS, ...groupByType(entities) };
  }

  // Sin término ni categoría no hay búsqueda activa: la pantalla enseña
  // sugerencias y tendencias, no una lista vacía.
  if (emptyQuery) return EMPTY_RESULTS;

  const [entities, personas] = await Promise.all([
    searchEntities(term, { category, limit: 30 }),
    category ? Promise.resolve<Profile[]>([]) : searchPeople(term),
  ]);

  return { ...EMPTY_RESULTS, ...groupByType(entities), personas };
}

function groupByType(entities: EntityResult[]): Omit<SearchResults, 'personas'> {
  return {
    empresas: entities.filter((entity) => entity.type === 'empresa'),
    iniciativas: entities.filter((entity) => entity.type === 'iniciativa'),
    lugares: entities.filter((entity) => entity.type === 'lugar'),
  };
}
