import { useCallback, useEffect, useState } from 'react';

import { showToast } from '@/components/ui/toast';
import {
  locate,
  locateFailureMessage,
  LOCATION_PRIVACY_NOTE,
  permissionState,
  type Coords,
} from '@/lib/geolocation';
import { getStoredZone, storeZone } from '@/lib/preferences';
import {
  DEFAULT_ZONE,
  isZoneId,
  loadZoneData,
  MY_LOCATION,
  type ZoneData,
  type ZoneId,
} from '@/lib/zones';

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
 *
 * ## "Usar mi ubicación" (F4.2)
 *
 * Se guarda **la elección**, nunca las coordenadas. Al volver, la ubicación se
 * vuelve a pedir **solo si el permiso sigue concedido** —sin abrir el diálogo—;
 * si no, se usa la zona por defecto. Elegirla en el selector sí puede abrir el
 * diálogo, porque es un gesto de la persona; si lo deniega, se le dice y la
 * zona no cambia.
 */
export function useZone() {
  const [zoneId, setZoneId] = useState<ZoneId>(DEFAULT_ZONE);
  const [here, setHere] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [loaded, setLoaded] = useState<{ zoneId: ZoneId; data: ZoneData } | null>(null);
  const [failed, setFailed] = useState<ZoneId | null>(null);

  // La preferencia se resuelve una vez; `restored` evita volver a leerla y
  // pisar una elección que la persona acabe de hacer.
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let live = true;

    async function restore() {
      const stored = await getStoredZone();
      if (!isZoneId(stored)) return;
      if (stored !== MY_LOCATION) {
        if (live) setZoneId(stored);
        return;
      }
      if ((await permissionState()) !== 'granted') return;
      const result = await locate();
      if (live && result.ok) {
        setHere(result.coords);
        setZoneId(MY_LOCATION);
      }
    }

    restore()
      .catch(() => undefined)
      .finally(() => {
        if (live) setRestored(true);
      });

    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!restored) return;
    if (zoneId === MY_LOCATION && !here) return;
    let live = true;

    loadZoneData(zoneId, here ?? undefined)
      .then((data) => {
        if (live) setLoaded({ zoneId, data });
      })
      .catch(() => {
        if (live) setFailed(zoneId);
      });

    return () => {
      live = false;
    };
  }, [zoneId, restored, here]);

  const change = useCallback(async (next: ZoneId) => {
    if (next !== MY_LOCATION) {
      setZoneId(next);
      void storeZone(next);
      return;
    }

    setLocating(true);
    // Se dice antes de que salga el diálogo del navegador, no después.
    if ((await permissionState()) === 'prompt') showToast(LOCATION_PRIVACY_NOTE);
    const result = await locate();
    setLocating(false);

    if (!result.ok) {
      showToast(locateFailureMessage(result.reason));
      return;
    }

    setHere(result.coords);
    setZoneId(MY_LOCATION);
    void storeZone(MY_LOCATION);
  }, []);

  const data = loaded !== null && loaded.zoneId === zoneId ? loaded.data : null;
  const error = failed === zoneId;

  return { zoneId, data, error, change, locating };
}
