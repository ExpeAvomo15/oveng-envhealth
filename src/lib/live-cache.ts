/**
 * Caché en memoria para datos en vivo (F4.3), con el mismo comportamiento que
 * la del aire de F4.1:
 *
 * - Un valor vale `ttl` milisegundos.
 * - Las peticiones en vuelo se comparten: dos pantallas que piden la misma
 *   celda a la vez hacen una sola llamada.
 * - Los fallos (`null`) **no** se guardan: la siguiente navegación lo vuelve a
 *   intentar.
 */
export function createLiveCache<T>(ttl: number) {
  type Entry = { at: number; value: T | null; pending?: Promise<T | null> };
  const entries = new Map<string, Entry>();

  function peek(key: string): T | null {
    const entry = entries.get(key);
    if (!entry || entry.value === null || Date.now() - entry.at > ttl) return null;
    return entry.value;
  }

  function get(key: string, fetcher: () => Promise<T | null>): Promise<T | null> {
    const entry = entries.get(key);
    if (entry?.pending) return entry.pending;
    const fresh = peek(key);
    if (fresh !== null) return Promise.resolve(fresh);

    const pending = fetcher()
      .catch(() => null)
      .then((value) => {
        if (value !== null) entries.set(key, { at: Date.now(), value });
        else entries.delete(key);
        return value;
      });

    entries.set(key, { at: Date.now(), value: null, pending });
    return pending;
  }

  return { get, peek };
}

/** `fetch` con tiempo límite. Devuelve `null` si no responde o no es 2xx. */
export async function fetchJson<T>(url: string, timeoutMs = 10_000): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
