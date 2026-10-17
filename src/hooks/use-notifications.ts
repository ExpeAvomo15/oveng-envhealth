import { useCallback, useEffect, useRef, useState } from 'react';

import { countUnreadNotifications } from '@/lib/notifications';

import { useAuth } from './use-auth';
import { useChatChanges } from './use-messages';

/**
 * El número de la campana (F4.7), al día en tiempo real.
 *
 * Reutiliza el canal del chat: `notifications` está en la publicación de
 * Realtime y Realtime aplica su RLS, así que a cada cual solo le llegan las
 * suyas. El mismo patrón que el contador del bocadillo.
 */

type Listener = () => void;
const listeners = new Set<Listener>();

/** Avisa de que el contador puede haber cambiado (al marcar como leídas). */
export function refreshNotifications(): void {
  for (const listener of listeners) listener();
}

export function useUnreadNotifications(): number {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const [loaded, setLoaded] = useState<{ key: string; count: number } | null>(null);
  const [version, setVersion] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Una ráfaga de eventos (marcar leídas cambia muchas filas) es una consulta.
  const bump = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVersion((v) => v + 1), 250);
  }, []);

  useEffect(() => {
    listeners.add(bump);
    return () => {
      listeners.delete(bump);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [bump]);

  useChatChanges(userId !== null, [{ table: 'notifications', filter: `user_id=eq.${userId}` }], bump);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    countUnreadNotifications(userId)
      .then((count) => {
        if (active) setLoaded({ key: userId, count });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [userId, version]);

  return userId && loaded?.key === userId ? loaded.count : 0;
}
