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

export function useFeed(mode: FeedMode) {
  const { profile } = useAuth();
  const viewerId = profile?.id ?? null;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** A quién sigue el usuario. Se recuerda para que las páginas siguientes
   *  filtren por la misma lista que la primera. */
  const followingIds = useRef<string[] | null>(null);

  const loadFirstPage = useCallback(
    async ({ silent = false } = {}) => {
      if (!viewerId) return;

      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        let authorIds: string[] | undefined;

        if (mode === 'siguiendo') {
          authorIds = await getFollowingIds(viewerId);
          followingIds.current = authorIds;
        } else {
          followingIds.current = null;
        }

        const page = await fetchFeed({ viewerId, mode, authorIds });
        setPosts(page.posts);
        setCursor(page.cursor);
      } catch {
        setError('No se ha podido cargar el feed. Desliza hacia abajo para reintentar.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [viewerId, mode],
  );

  const loadMore = useCallback(async () => {
    if (!viewerId || cursor === null || loadingMore) return;

    setLoadingMore(true);
    try {
      const page = await fetchFeed({
        viewerId,
        mode,
        cursor,
        authorIds: followingIds.current ?? undefined,
      });

      // Se filtran los repetidos por si algo entró justo en el límite de página.
      setPosts((current) => {
        const seen = new Set(current.map((post) => post.id));
        return [...current, ...page.posts.filter((post) => !seen.has(post.id))];
      });
      setCursor(page.cursor);
    } catch {
      showToast('No se han podido cargar más publicaciones.');
    } finally {
      setLoadingMore(false);
    }
  }, [viewerId, mode, cursor, loadingMore]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  useEffect(() => {
    const listener = () => {
      void loadFirstPage({ silent: true });
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [loadFirstPage]);

  return {
    posts,
    loading,
    refreshing,
    loadingMore,
    error,
    /** `true` cuando quedan más páginas por pedir. */
    hasMore: cursor !== null,
    refresh: () => loadFirstPage({ silent: true }),
    loadMore,
  };
}
