import { useCallback, useEffect, useState } from 'react';

import { getStoredZone, storeZone } from '@/lib/preferences';
import { DEFAULT_ZONE, loadZoneData, zoneById, type ZoneData, type ZoneId } from '@/lib/zones';

/**
 * La zona activa del feed y sus datos.
 *
 * La zona guardada se lee una vez al montar; mientras, se usa la de por
 * defecto, así que la tarjeta no parpadea ni aparece vacía. Cambiarla escribe
 * en el dispositivo y recarga los datos.
 *
 * Los datos y el error se guardan **junto a la zona a la que pertenecen**, así
 * que `data` y `error` se derivan en vez de limpiarse a mano al cambiar de
 * zona: nada puede quedarse enseñando el aire de la zona anterior.
 */
export function useZone() {
  const [zoneId, setZoneId] = useState<ZoneId>(DEFAULT_ZONE);
  const [loaded, setLoaded] = useState<{ zoneId: ZoneId; data: ZoneData } | null>(null);
  const [failed, setFailed] = useState<ZoneId | null>(null);

  // La preferencia se resuelve una vez; `restored` evita volver a leerla y
  // pisar una elección que la persona acabe de hacer.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let live = true;

    getStoredZone()
      .then((stored) => {
        if (!live) return;
        if (stored) setZoneId(zoneById(stored).id);
        setRestored(true);
      })
      .catch(() => {
        if (live) setRestored(true);
      });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    let live = true;

    loadZoneData(zoneId)
      .then((data) => {
        if (live) setLoaded({ zoneId, data });
      })
      .catch(() => {
        if (live) setFailed(zoneId);
      });

    return () => {
      live = false;
    };
  }, [zoneId, restored]);

  const change = useCallback((next: ZoneId) => {
    setZoneId(next);
    void storeZone(next);
  }, []);

  const data = loaded !== null && loaded.zoneId === zoneId ? loaded.data : null;
  const error = failed === zoneId;

  return { zoneId, data, error, change };
}
