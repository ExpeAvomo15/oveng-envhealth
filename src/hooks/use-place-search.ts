import { useEffect, useState } from 'react';

import { MIN_PLACE_QUERY, searchPlaces, type Place } from '@/lib/geocoding';

/** Espera tras la última tecla antes de preguntar a la API. */
const DEBOUNCE_MS = 400;

export type PlaceSearch =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; places: Place[] }
  | { status: 'error' };

/**
 * Lugares del mundo para un texto, con debounce (F4.2).
 *
 * El resultado se guarda junto a la consulta a la que pertenece: una respuesta
 * lenta no se pinta sobre otra búsqueda, y `loading` se deriva —es "aún no hay
 * respuesta para lo que hay escrito"— en vez de encenderse y apagarse a mano.
 */
export function usePlaceSearch(term: string): PlaceSearch {
  const query = term.trim();
  const [settled, setSettled] = useState('');
  const [loaded, setLoaded] = useState<
    { query: string; places: Place[] } | { query: string; error: true } | null
  >(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (settled.length < MIN_PLACE_QUERY) return;
    let active = true;

    searchPlaces(settled)
      .then((places) => {
        if (active) setLoaded({ query: settled, places });
      })
      .catch(() => {
        if (active) setLoaded({ query: settled, error: true });
      });

    return () => {
      active = false;
    };
  }, [settled]);

  if (query.length < MIN_PLACE_QUERY) return { status: 'idle' };
  if (loaded === null || loaded.query !== query) return { status: 'loading' };
  if ('error' in loaded) return { status: 'error' };
  return { status: 'done', places: loaded.places };
}
