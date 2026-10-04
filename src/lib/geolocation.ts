/**
 * La ubicación de quien mira, **solo si la pide** (F4.2).
 *
 * ## Privacidad
 *
 * La posición vive en memoria, en el cliente, y solo sirve para pedir el dato
 * de su punto. **No se guarda en la base, ni en el dispositivo, ni se manda a
 * OVENG.** Lo único que sale es la coordenada **redondeada a dos decimales**
 * (algo más de un kilómetro) hacia Open-Meteo, que es quien da el aire; su
 * rejilla es de 0,1°, así que redondear no cambia el dato y sí la precisión que
 * se comparte.
 *
 * ## Nunca sin permiso
 *
 * - `permissionState` consulta el permiso **sin** abrir el diálogo del
 *   navegador. Es lo que usa la primera carga del mapa para decidir si centra
 *   en la zona de quien mira: solo si ya lo concedió antes.
 * - `locate` sí puede abrir el diálogo, y por eso solo se llama al pulsar
 *   "Mi ubicación" o "Usar mi ubicación".
 *
 * Solo web: en iOS y Android haría falta `expo-location`, que no está
 * instalado; allí devuelve `unsupported` y la app lo dice.
 */

/** Un punto en grados. */
export type Coords = { lat: number; lng: number };

export type LocationPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

export type LocateResult =
  | { ok: true; coords: Coords; accuracy: number }
  | { ok: false; reason: 'denied' | 'unavailable' | 'timeout' | 'unsupported' };

function geolocation(): Geolocation | null {
  if (typeof navigator === 'undefined') return null;
  return navigator.geolocation ?? null;
}

/** El permiso de ubicación, sin pedirlo. */
export async function permissionState(): Promise<LocationPermission> {
  if (!geolocation()) return 'unsupported';
  try {
    if (!navigator.permissions?.query) return 'prompt';
    const status = await navigator.permissions.query({ name: 'geolocation' });
    return status.state;
  } catch {
    return 'prompt';
  }
}

/** Dos decimales: lo que se comparte con la API del aire. */
function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * La posición actual. Puede abrir el diálogo de permiso: llamarla solo desde
 * un gesto de la persona.
 */
export function locate(): Promise<LocateResult> {
  const geo = geolocation();
  if (!geo) return Promise.resolve({ ok: false, reason: 'unsupported' });

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (position) =>
        resolve({
          ok: true,
          coords: { lat: rounded(position.coords.latitude), lng: rounded(position.coords.longitude) },
          accuracy: position.coords.accuracy,
        }),
      (error) =>
        resolve({
          ok: false,
          reason:
            error.code === error.PERMISSION_DENIED
              ? 'denied'
              : error.code === error.TIMEOUT
                ? 'timeout'
                : 'unavailable',
        }),
      // Precisión de barrio basta para el aire, y gasta menos batería.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  });
}

/** Lo que se le dice a la persona cuando no se pudo, sin insistir. */
export function locateFailureMessage(reason: Extract<LocateResult, { ok: false }>['reason']): string {
  switch (reason) {
    case 'denied':
      return 'Sin permiso de ubicación. Puedes buscar tu ciudad en el mapa.';
    case 'timeout':
      return 'Tu ubicación tarda demasiado. Prueba otra vez o busca tu ciudad.';
    case 'unsupported':
      return 'Este dispositivo no nos da tu ubicación. Busca tu ciudad en el mapa.';
    default:
      return 'No hemos podido saber dónde estás. Busca tu ciudad en el mapa.';
  }
}

/** Microtexto de privacidad, el mismo en el mapa y en el feed. */
export const LOCATION_PRIVACY_NOTE =
  'Tu ubicación se usa solo en este dispositivo para pedir el dato del aire. OVENG no la guarda ni la recibe.';
