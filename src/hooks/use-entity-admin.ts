import { useCallback, useEffect, useState } from 'react';

import { claimEntity, getEntityAdminCount, isEntityAdmin, leaveEntity } from '@/lib/entity-admins';

import { useAuth } from './use-auth';

export type EntityAdminState = {
  /** `null` mientras se consulta. */
  isAdmin: boolean | null;
  count: number;
  claim: () => Promise<void>;
  leave: () => Promise<void>;
};

/**
 * ¿Administra quien mira esta página? (F4.4)
 *
 * El estado se guarda junto a la entidad y la persona a las que pertenece, así
 * que cambiar de página o de sesión no enseña el de antes.
 */
export function useEntityAdmin(entityId: string | null): EntityAdminState {
  const { profile } = useAuth();
  const userId = profile?.id ?? null;
  const key = `${entityId ?? ''}|${userId ?? ''}`;

  const [loaded, setLoaded] = useState<{ key: string; isAdmin: boolean; count: number } | null>(null);

  useEffect(() => {
    if (!entityId) return;
    let active = true;
    Promise.all([
      userId ? isEntityAdmin(entityId, userId) : Promise.resolve(false),
      getEntityAdminCount(entityId),
    ])
      .then(([isAdmin, count]) => {
        if (active) setLoaded({ key, isAdmin, count });
      })
      .catch(() => {
        if (active) setLoaded({ key, isAdmin: false, count: 0 });
      });
    return () => {
      active = false;
    };
    // `key` resume la entidad y la persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const claim = useCallback(async () => {
    if (!entityId || !userId) return;
    await claimEntity(entityId, userId);
    setLoaded((previous) => ({ key, isAdmin: true, count: (previous?.count ?? 0) + 1 }));
  }, [entityId, userId, key]);

  const leave = useCallback(async () => {
    if (!entityId || !userId) return;
    await leaveEntity(entityId, userId);
    setLoaded((previous) => ({ key, isAdmin: false, count: Math.max(0, (previous?.count ?? 1) - 1) }));
  }, [entityId, userId, key]);

  const current = loaded?.key === key ? loaded : null;
  return { isAdmin: current ? current.isAdmin : null, count: current?.count ?? 0, claim, leave };
}
