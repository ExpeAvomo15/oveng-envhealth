import { AuthError } from '@supabase/supabase-js';

/**
 * Traducción de los errores de Supabase Auth a mensajes en español.
 *
 * Supabase responde en inglés y con textos pensados para quien programa, no
 * para quien usa la app. Aquí se traduce por `code` cuando existe —es estable—
 * y se cae al texto del mensaje solo como respaldo.
 *
 * Los mensajes dicen qué hacer, no solo qué ha fallado.
 */

const MESSAGES: Record<string, string> = {
  invalid_credentials: 'Email o contraseña incorrectos. Revísalos e inténtalo otra vez.',
  email_not_confirmed:
    'Todavía no has confirmado tu email. Busca el mensaje de confirmación en tu bandeja de entrada.',
  user_already_exists: 'Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.',
  email_exists: 'Ya existe una cuenta con ese email. Inicia sesión o recupera tu contraseña.',
  weak_password: 'La contraseña es demasiado débil. Usa al menos 8 caracteres.',
  email_address_invalid: 'Ese email no parece válido. Revísalo.',
  validation_failed: 'Revisa los datos del formulario: hay algún campo mal.',
  signup_disabled: 'El registro está desactivado en este momento.',
  over_request_rate_limit: 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.',
  over_email_send_rate_limit:
    'Se han enviado demasiados emails a esa dirección. Espera unos minutos antes de pedir otro.',
  same_password: 'La contraseña nueva es igual que la anterior. Elige otra.',
  session_expired: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
};

/**
 * El trigger `handle_new_user` falla si el username ya existe o no cumple el
 * formato, y Supabase lo devuelve como un genérico "Database error saving new
 * user". Es, con diferencia, la causa más probable, así que se traduce apuntando
 * al username en vez de dejar un error incomprensible.
 */
const DATABASE_SIGNUP_ERROR =
  'No se ha podido crear la cuenta. Lo más probable es que ese nombre de usuario ya esté ocupado: prueba con otro.';

export function translateAuthError(error: unknown): string {
  if (!(error instanceof AuthError)) {
    return translateUnknownError(error);
  }

  if (error.code && error.code in MESSAGES) {
    return MESSAGES[error.code] as string;
  }

  const message = error.message.toLowerCase();

  if (message.includes('database error saving new user')) {
    return DATABASE_SIGNUP_ERROR;
  }
  if (message.includes('invalid login credentials')) {
    return MESSAGES.invalid_credentials as string;
  }
  if (message.includes('email not confirmed')) {
    return MESSAGES.email_not_confirmed as string;
  }
  if (message.includes('already registered') || message.includes('already been registered')) {
    return MESSAGES.user_already_exists as string;
  }
  if (message.includes('password should be at least')) {
    return MESSAGES.weak_password as string;
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return MESSAGES.over_request_rate_limit as string;
  }
  if (message.includes('failed to fetch') || message.includes('network')) {
    return 'No hay conexión con el servidor. Comprueba tu conexión a internet.';
  }

  return `No se ha podido completar la operación (${error.message}).`;
}

function translateUnknownError(error: unknown): string {
  const message = error instanceof Error ? error.message.toLowerCase() : '';

  if (message.includes('failed to fetch') || message.includes('network request failed')) {
    return 'No hay conexión con el servidor. Comprueba tu conexión a internet.';
  }

  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo en unos segundos.';
}
