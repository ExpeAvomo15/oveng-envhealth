import type { ColorToken } from '@/theme';

import { createLiveCache, fetchJson } from './live-cache';

/**
 * Humedad del suelo en vivo (F4.3).
 *
 * Fuente: **Open-Meteo Forecast**, variable `soil_moisture_0_to_1cm`. Mundial,
 * pública y sin clave: cumple el criterio de fuentes de docs/08_DATOS_EN_VIVO.md.
 *
 * ## Contrato, comprobado el 2026-10-04
 *
 * `GET /v1/forecast?latitude=1.86&longitude=9.77&current=soil_moisture_0_to_1cm&timezone=GMT`
 * → `{ latitude: 1.8629, longitude: 9.8013, elevation: 24,
 *   current_units: { soil_moisture_0_to_1cm: "m³/m³" },
 *   current: { time: "2026-10-04T14:45", interval: 900, soil_moisture_0_to_1cm: 0.160 } }`.
 *
 * Es agua por volumen de tierra (0,16 = 16 %), cada 15 minutos. **En el mar
 * devuelve 0,000 con elevación 0**: eso no es "seco", es que no hay suelo, y se
 * dice así.
 */

const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';

/** El modelo se actualiza cada 15 minutos; media hora basta para no repetir. */
const cache = createLiveCache<LiveSoil>(30 * 60 * 1000);

export type SoilLevel = 'seco' | 'normal' | 'humedo';

/**
 * Cortes orientativos, en % de agua por volumen. La humedad "normal" depende
 * del tipo de tierra —una arenosa retiene menos que una arcillosa—, así que la
 * explicación lo dice. Lo bastante finos para distinguir un suelo que pide riego
 * de uno empapado, que es lo que le importa a quien lo lee.
 */
export const SOIL_LEVELS: readonly { level: SoilLevel; max: number; label: string; color: ColorToken }[] = [
  { level: 'seco', max: 15, label: 'Seco', color: 'warning' },
  { level: 'normal', max: 30, label: 'Normal', color: 'accentSoft' },
  { level: 'humedo', max: Infinity, label: 'Húmedo', color: 'info' },
];

export type LiveSoil =
  | { kind: 'soil'; percent: number; level: SoilLevel; label: string; updatedAt: string }
  /** El punto es mar o agua: no hay suelo que medir. */
  | { kind: 'water-body'; updatedAt: string };

export function soilLevel(percent: number) {
  return SOIL_LEVELS.find((band) => percent < band.max) ?? SOIL_LEVELS[SOIL_LEVELS.length - 1]!;
}

const keyOf = (lat: number, lng: number) => `${lat.toFixed(1)},${lng.toFixed(1)}`;

export function peekSoil(lat: number, lng: number): LiveSoil | null {
  return cache.peek(keyOf(lat, lng));
}

type Response = {
  elevation?: number;
  current?: { time?: string; soil_moisture_0_to_1cm?: number | null };
};

/** Nunca lanza: `null` si la API no responde, y quien llama lo dice. */
export function getSoil(lat: number, lng: number): Promise<LiveSoil | null> {
  return cache.get(keyOf(lat, lng), async () => {
    const params = new URLSearchParams({
      latitude: lat.toFixed(2),
      longitude: lng.toFixed(2),
      current: 'soil_moisture_0_to_1cm',
      timezone: 'GMT',
    });
    const body = await fetchJson<Response>(`${ENDPOINT}?${params}`);
    const value = body?.current?.soil_moisture_0_to_1cm;
    const time = body?.current?.time;
    if (typeof value !== 'number' || !time) return null;

    const updatedAt = `${time}:00Z`;
    if (value === 0 && (body?.elevation ?? 0) <= 0) return { kind: 'water-body', updatedAt };

    const percent = Math.round(value * 100);
    const band = soilLevel(percent);
    return { kind: 'soil', percent, level: band.level, label: band.label, updatedAt };
  });
}
