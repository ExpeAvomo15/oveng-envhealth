import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Preferencias de visualización, guardadas en el dispositivo.
 *
 * ## Por qué no van en la base de datos
 *
 * Se valoró una tabla `user_preferences` y se descartó por coste frente a
 * beneficio:
 *
 * - Es **una migración más**, y en este proyecto las aplica una persona a mano:
 *   esquema, RLS, documentación y verificación para guardar un identificador de
 *   zona.
 * - **No quitaría el almacenamiento local.** La zona tiene que funcionar sin
 *   cuenta —el feed y el mapa se ven sin sesión desde F2.3—, así que habría que
 *   mantener los dos caminos y decidir cuál gana al entrar. Dos caminos para
 *   una preferencia.
 * - Y es **preferencia de vista, no dato compartido**: que sea por dispositivo
 *   es defendible, incluso mejor — la zona que te interesa en el móvil no tiene
 *   que ser la del portátil.
 *
 * Si algún día hay que sincronizarla entre dispositivos, entonces sí toca
 * tabla. Hoy no lo pide nada.
 *
 * ## Dónde se guarda
 *
 * `localStorage` en web y `expo-secure-store` en nativo, que es lo que ya hay
 * instalado. No se trocea como la sesión porque un identificador de zona son
 * veinte caracteres, muy por debajo del límite de 2048 bytes.
 *
 * Todo se protege con try/catch y devuelve `null` al fallar: en el render
 * estático del export web no hay `window`, y un modo privado puede negar el
 * acceso. Quedarse sin preferencia guardada significa usar la de por defecto,
 * que no es un error.
 */

const ZONE_KEY = 'oveng.feed.zone';

async function read(key: string): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return null;
      return window.localStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function write(key: string, value: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      window.localStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Que no se pueda recordar la zona no debe romper la pantalla.
  }
}

/** Zona guardada, o `null` si no hay ninguna. */
export function getStoredZone(): Promise<string | null> {
  return read(ZONE_KEY);
}

export function storeZone(zoneId: string): Promise<void> {
  return write(ZONE_KEY, zoneId);
}
