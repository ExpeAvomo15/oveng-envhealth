import { supabase } from './supabase';

/**
 * Reglas del username.
 *
 * ⚠️ Esta expresión replica el check `profiles_username_format` de
 * `supabase/migrations/001_initial_schema.sql`. Están duplicadas a propósito
 * —la base de datos no puede fiarse del cliente y el cliente no puede consultar
 * el check— pero si cambia una, hay que cambiar la otra.
 */
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** Normaliza lo que se teclea: minúsculas y sin caracteres no permitidos. */
export function normalizeUsername(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_]/g, '');
}

/** Devuelve el problema del username, o `null` si es válido. */
export function validateUsername(username: string): string | null {
  if (username.length === 0) {
    return 'Elige un nombre de usuario.';
  }
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Necesita al menos ${USERNAME_MIN_LENGTH} caracteres.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `No puede pasar de ${USERNAME_MAX_LENGTH} caracteres.`;
  }
  if (!USERNAME_PATTERN.test(username)) {
    return 'Solo minúsculas, números y guion bajo.';
  }
  return null;
}

export type UsernameAvailability = 'available' | 'taken' | 'unknown';

/**
 * Comprueba si el username está libre.
 *
 * Funciona sin sesión porque la política de SELECT de `profiles` es pública.
 * Es una comprobación optimista: entre esta consulta y el registro alguien
 * podría quedarse el nombre, y en ese caso el trigger rechaza el alta. Sirve
 * para avisar antes de rellenar el formulario entero, no como garantía.
 */
export async function checkUsernameAvailability(username: string): Promise<UsernameAvailability> {
  const { data, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    return 'unknown';
  }

  return data === null ? 'available' : 'taken';
}
