import { useEffect, useState } from 'react';

import {
  airCacheKey,
  getAirQuality,
  peekAirQuality,
  type AirQuality,
} from '@/lib/air-quality';

export type LiveAir =
  /** Aún no ha respondido: la pantalla pinta un hueco breve, no se bloquea. */
  | { status: 'loading' }
  | { status: 'live'; air: AirQuality }
  /** La API no respondió: la pantalla cae al dato curado con su etiqueta. */
  | { status: 'unavailable' };

/**
 * Calidad del aire en vivo para una coordenada, sin bloquear el render.
 *
 * Mismo patrón que el resto de cargadores de la app: el resultado se guarda
 * **junto a la clave** a la que pertenece, y lo visible se deriva comparando.
 * Al cambiar de coordenada, lo viejo deja de coincidir sin efecto de limpieza,
 * y una respuesta que llega tarde no se pinta sobre otra celda.
 *
 * Si la celda ya está en caché, se devuelve en el primer render: volver al feed
 * o al mapa no enseña un esqueleto que no hace falta.
 */
export function useLiveAir(coords: { lat: number; lng: number } | null): LiveAir {
  const key = coords ? airCacheKey(coords.lat, coords.lng) : null;
  const [loaded, setLoaded] = useState<{ key: string; air: AirQuality | null } | null>(null);

  const lat = coords?.lat;
  const lng = coords?.lng;

  useEffect(() => {
    if (key === null || lat === undefined || lng === undefined) return;
    let active = true;

    getAirQuality(lat, lng).then((air) => {
      if (active) setLoaded({ key, air });
    });

    return () => {
      active = false;
    };
    // `key` ya resume `lat` y `lng` a la rejilla: moverse dentro de la misma
    // celda no vuelve a pedir nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!coords || key === null) return { status: 'unavailable' };

  const cached = peekAirQuality(coords.lat, coords.lng);
  if (cached) return { status: 'live', air: cached };

  if (loaded?.key !== key) return { status: 'loading' };
  return loaded.air ? { status: 'live', air: loaded.air } : { status: 'unavailable' };
}
