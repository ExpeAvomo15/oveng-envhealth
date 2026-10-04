import { useEffect, useState } from 'react';

import { getNature, peekNature, type LiveNature } from '@/lib/live-nature';
import { getSoil, peekSoil, type LiveSoil } from '@/lib/live-soil';

export type Live<T> = { status: 'loading' } | { status: 'live'; value: T } | { status: 'unavailable' };

type Source<T> = {
  get: (lat: number, lng: number) => Promise<T | null>;
  peek: (lat: number, lng: number) => T | null;
};

/**
 * Un dato en vivo para una coordenada, sin bloquear el render (F4.3).
 *
 * El mismo patrón que `useLiveAir`: el resultado se guarda junto a la clave a
 * la que pertenece y lo visible se deriva comparando, y lo que ya está en
 * caché se devuelve en el primer render. `coords = null` no pide nada: sirve
 * para no consultar una fuente cuya categoría no está elegida.
 */
function useLive<T>(source: Source<T>, coords: { lat: number; lng: number } | null): Live<T> {
  const key = coords ? `${coords.lat.toFixed(3)},${coords.lng.toFixed(3)}` : null;
  const [loaded, setLoaded] = useState<{ key: string; value: T | null } | null>(null);

  const lat = coords?.lat;
  const lng = coords?.lng;

  useEffect(() => {
    if (key === null || lat === undefined || lng === undefined) return;
    let active = true;
    source.get(lat, lng).then((value) => {
      if (active) setLoaded({ key, value });
    });
    return () => {
      active = false;
    };
    // `source` es una constante del módulo; `key` resume la coordenada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!coords || key === null) return { status: 'unavailable' };
  const cached = source.peek(coords.lat, coords.lng);
  if (cached !== null) return { status: 'live', value: cached };
  if (loaded?.key !== key) return { status: 'loading' };
  return loaded.value !== null ? { status: 'live', value: loaded.value } : { status: 'unavailable' };
}

const soilSource: Source<LiveSoil> = { get: getSoil, peek: peekSoil };
const natureSource: Source<LiveNature> = { get: getNature, peek: peekNature };

/** Humedad del suelo en vivo (Open-Meteo). */
export function useLiveSoil(coords: { lat: number; lng: number } | null): Live<LiveSoil> {
  return useLive(soilSource, coords);
}

/** Naturaleza registrada en 10 km (GBIF). */
export function useLiveNature(coords: { lat: number; lng: number } | null): Live<LiveNature> {
  return useLive(natureSource, coords);
}
