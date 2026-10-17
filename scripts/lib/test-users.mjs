/**
 * Cuentas de prueba (@ovengtest.dev): encontrarlas y borrarlas.
 *
 * Lo usan dos sitios:
 *
 * - **Cada script de verificación y de capturas, al terminar** (`finishTestRun`):
 *   borra lo que ha creado, para que una verificación que acaba bien no deje
 *   ni una cuenta @ovengtest.dev en Auth.
 * - **Y al empezar** (`preCleanTestUsers`), como red de seguridad: recoge lo
 *   que dejó una batería cortada a mitad, que no llegó a su final.
 * - `npm run cleanup:test-users`, la herramienta de emergencia, con simulacro.
 *
 * ## La clave `service_role` sigue viviendo solo en el shell
 *
 * Borrar usuarios de Auth exige la clave de servicio, que salta RLS. No se lee
 * nunca de `.env` (si aparece ahí, se niega a usarla): se exporta en la
 * terminal antes de lanzar la batería. Sin ella, la limpieza previa se omite
 * con un aviso visible y la verificación sigue —una verificación no deja de
 * funcionar por no poder barrer—.
 *
 * **No lanzar dos baterías a la vez**: la limpieza de la segunda borraría las
 * cuentas que la primera está usando.
 */

import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

import { describeKey } from './service-role.mjs';

/**
 * Dominio de las cuentas de prueba. **Deliberadamente fijo en el código**: si
 * fuera un parámetro, una errata podría borrar cuentas reales.
 */
export const TEST_EMAIL_DOMAIN = '@ovengtest.dev';
const BUCKETS = ['avatars', 'post-images'];

/** ¿Está la clave de servicio donde no debe? */
export function serviceKeyInEnvFile() {
  try {
    return /SUPABASE_SERVICE_ROLE_KEY/.test(readFileSync('.env', 'utf8'));
  } catch {
    return false;
  }
}

/** Cliente de servicio. Sin sesión persistente: es un proceso de una vez. */
export function adminClient(url, serviceRoleKey) {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Todas las cuentas cuyo email termina en el dominio de prueba. */
export async function listTestUsers(admin) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`No se ha podido listar usuarios: ${error.message}`);
    users.push(...data.users.filter((user) => user.email?.endsWith(TEST_EMAIL_DOMAIN)));
    if (data.users.length < 200) return users;
  }
}

/**
 * Borra una cuenta de prueba y sus archivos. El storage no cae por cascada; al
 * borrar el usuario caen perfil, publicaciones, likes, follows, conversaciones…
 * por las claves ajenas `on delete cascade`.
 */
export async function deleteTestUser(admin, user) {
  if (!user.email?.endsWith(TEST_EMAIL_DOMAIN)) {
    throw new Error(`${user.email} no es una cuenta de prueba`);
  }
  let files = 0;
  for (const bucket of BUCKETS) {
    const { data } = await admin.storage.from(bucket).list(user.id);
    if (data && data.length > 0) {
      const { error } = await admin.storage.from(bucket).remove(data.map((file) => `${user.id}/${file.name}`));
      if (!error) files += data.length;
    }
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  return { ok: !error, error: error?.message ?? null, files };
}

/**
 * Borra todas las cuentas de prueba, si hay clave de servicio en el shell.
 * Nunca para el proceso: si no puede limpiar, lo dice y sigue. Devuelve cuántas
 * quedan, o `null` si no ha podido mirar.
 */
async function sweep(label) {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const skip = (reason) => {
    console.log(`⚠ ${label} omitida: ${reason}`);
    console.log('  Las cuentas de prueba se quedan en Auth. Para que se borren solas, exporta la');
    console.log("  clave en la terminal: export SUPABASE_SERVICE_ROLE_KEY='sb_secret_…'\n");
    return null;
  };

  if (serviceKeyInEnvFile()) return skip('hay una SUPABASE_SERVICE_ROLE_KEY en .env, y ahí no puede estar. Quítala.');
  if (!url) return skip('falta EXPO_PUBLIC_SUPABASE_URL.');
  if (!key) return skip('no hay SUPABASE_SERVICE_ROLE_KEY en el shell.');
  if (describeKey(key).kind === 'public' || key.trim() === process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()) {
    return skip('la SUPABASE_SERVICE_ROLE_KEY del shell es una clave pública, no la de servicio.');
  }

  try {
    const admin = adminClient(url, key);
    const users = await listTestUsers(admin);
    let deleted = 0;
    let files = 0;
    for (const user of users) {
      const result = await deleteTestUser(admin, user);
      if (result.ok) deleted += 1;
      files += result.files;
    }
    const left = (await listTestUsers(admin)).length;
    console.log(
      `· ${label}: ${deleted}/${users.length} cuentas de prueba borradas` +
        (files > 0 ? `, con ${files} archivo(s)` : '') +
        `; quedan ${left} @ovengtest.dev en Auth.\n`,
    );
    return left;
  } catch (cause) {
    return skip(cause instanceof Error ? cause.message : String(cause));
  }
}

/**
 * Al empezar, antes de crear nada: recoge lo que dejó una batería cortada a
 * mitad. Es la red de seguridad de `finishTestRun`.
 */
export async function preCleanTestUsers() {
  await sweep('Limpieza previa');
}

/**
 * Al terminar, en lugar del `process.exit` final: borra las cuentas que ha
 * creado la propia verificación, para que una que acaba bien no deje residuo.
 * Sale con el mismo código que se le pasa: limpiar no cambia el resultado.
 */
export async function finishTestRun(code) {
  await sweep('Limpieza final');
  process.exit(code);
}
