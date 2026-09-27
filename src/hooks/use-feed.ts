import { useCallback, useEffect, useRef, useState } from 'react';

import { showToast } from '@/components/ui/toast';
import { fetchFeed, getFollowingIds, type FeedMode, type FeedPost } from '@/lib/feed';

import { useAuth } from './use-auth';

/**
 * Estado del feed de Inicio: primera página, paginación por cursor y refresco.
 *
 * El emisor `refreshFeed()` existe desde F1.4 para que el compositor pueda
 * avisar al publicar sin conocer a quién. Ahora sí hay alguien escuchando.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Avisa de que el feed se ha quedado desactualizado (por ejemplo, al publicar). */
export function refreshFeed(): void {
  for (const listener of listeners) {
    listener();
  }
}

type LoadedFeed = {
  key: string;
  posts: FeedPost[];
  cursor: string | null;
  error: string | null;
};

export function useFeed(mode: FeedMode) {
  const { profile } = useAuth();
  const viewerId = profile?.id ?? null;

  /**
   * Página cargada, etiquetada con la combinación de lector y modo a la que
   * pertenece. Así `loading` se **deriva** —no hay datos para esta clave
   * todavía— en lugar de encenderse con un `setState` dentro de un efecto, que
   * provoca renders en cascada.
   */
  const [loaded, setLoaded] = useState<LoadedFeed | null>(null);

  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const key = `${viewerId ?? 'anon'}|${mode}`;
  const current = loaded?.key === key ? loaded : null;

  const posts = current?.posts ?? [];
  const cursor = current?.cursor ?? null;
  const error = current?.error ?? null;
  // El feed es público desde F2.6: también carga sin cuenta.
  const loading = current === null;

  /** A quién sigue el usuario. Se recuerda para que las páginas siguientes
   *  filtren por la misma lista que la primera. */
  const followingIds = useRef<string[] | null>(null);

  /**
   * Trae la primera página **sin tocar estado**: devuelve datos.
   *
   * La separación no es cosmética — un efecto que llama a algo que hace
   * `setState` provoca renders en cascada (y el linter de React lo señala), así
   * que el `setState` vive siempre en el callback de la promesa o en un
   * manejador de eventos.
   */
  const loadFirstPage = useCallback(async (): Promise<LoadedFeed> => {
    try {
      let authorIds: string[] | undefined;

      // "Siguiendo" sin cuenta no tiene a quién seguir: lista vacía, que es lo
      // que `fetchFeed` traduce en "no hay nada que preguntar". En la pantalla
      // ese modo ni se ofrece sin sesión.
      if (mode === 'siguiendo') {
        authorIds = viewerId ? await getFollowingIds(viewerId) : [];
        followingIds.current = authorIds;
      } else {
        followingIds.current = null;
      }

      const page = await fetchFeed({ viewerId, mode, authorIds });
      return { key, posts: page.posts, cursor: page.cursor, error: null };
    } catch {
      return {
        key,
        posts: [],
        cursor: null,
        error: 'No se ha podido cargar el feed. Desliza hacia abajo para reintentar.',
      };
    }
  }, [viewerId, mode, key]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setLoaded(await loadFirstPage());
    } finally {
      setRefreshing(false);
    }
  }, [loadFirstPage]);

  const loadMore = useCallback(async () => {
    if (cursor === null || loadingMore) return;

    setLoadingMore(true);
    try {
      const page = await fetchFeed({
        viewerId,
        mode,
        cursor,
        authorIds: followingIds.current ?? undefined,
      });

      // Se filtran los repetidos por si algo entró justo en el límite de página.
      setLoaded((previous) => {
        if (previous === null || previous.key !== key) return previous;

        const seen = new Set(previous.posts.map((post) => post.id));
        return {
          ...previous,
          posts: [...previous.posts, ...page.posts.filter((post) => !seen.has(post.id))],
          cursor: page.cursor,
        };
      });
    } catch {
      showToast('No se han podido cargar más publicaciones.');
    } finally {
      setLoadingMore(false);
    }
  }, [viewerId, mode, cursor, loadingMore, key]);

  useEffect(() => {
    let active = true;

    loadFirstPage().then((next) => {
      if (active) setLoaded(next);
    });

    return () => {
      active = false;
    };
  }, [loadFirstPage]);

  // Al publicar, el compositor llama a `refreshFeed()` y esto lo recoge.
  useEffect(() => {
    const listener = () => {
      void refresh();
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [refresh]);

  return {
    posts,
    loading,
    refreshing,
    loadingMore,
    error,
    /** `true` cuando quedan más páginas por pedir. */
    hasMore: cursor !== null,
    refresh,
    loadMore,
  };
}
