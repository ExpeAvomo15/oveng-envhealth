import { useCallback, useEffect, useState } from 'react';

import type { Post } from '@/lib/database.types';

/**
 * Feed de Inicio.
 *
 * **Todavía no lee nada: es el punto de enganche de F1.5.** Existe ya para que
 * el compositor de publicaciones tenga a quién avisar cuando se publica algo,
 * en vez de que F1.5 tenga que ir a buscar dónde meter esa llamada.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/** Avisa de que el feed se ha quedado desactualizado (por ejemplo, al publicar). */
export function refreshFeed(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function useFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    // F1.5: aquí irá la consulta de las publicaciones de las cuentas seguidas.
    setLoading(false);
    setPosts([]);
  }, []);

  useEffect(() => {
    void load();

    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);

  return { posts, loading, refresh: load };
}
