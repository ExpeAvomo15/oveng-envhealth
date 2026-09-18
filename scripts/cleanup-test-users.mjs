/**
 * Borra las cuentas de prueba que dejan los scripts de verificación.
 *
 * ## La clave `service_role` no vive en el repositorio
 *
 * Esta clave **salta RLS**: con ella se puede leer y borrar cualquier cosa del
 * proyecto. Por eso se lee **solo** de una variable del shell, nunca de `.env`
 * ni de ningún fichero versionable, y este script se ejecuta sin `--env-file`.
 * Si aparece en `.env`, el script se niega a funcionar hasta que se quite.
 *
 * ## Uso
 *
 *   SUPABASE_SERVICE_ROLE_KEY='...' npm run cleanup:test-users            # simulacro
 *   SUPABASE_SERVICE_ROLE_KEY='...' npm run cleanup:test-users -- --confirm
 *
 * Sin `--confirm` solo enumera lo que borraría.
 */

import { readFileSync } from 'node:fs';

import { createClient } from '@supabase/supabase-js';

/**
 * Dominio de las cuentas de prueba. **Deliberadamente fijo en el código**: si
 * fuera un parámetro, una errata podría borrar cuentas reales.
 */
const TEST_EMAIL_DOMAIN = '@ovengtest.dev';
const BUCKETS = ['avatars', 'post-images'];

const confirmed = process.argv.includes('--confirm');

// --- Comprobaciones de seguridad ---------------------------------------------
let envFile = '';
try {
  envFile = readFileSync('.env', 'utf8');
} catch {
  // Sin .env no pasa nada: la URL puede venir del shell.
}

if (/SUPABASE_SERVICE_ROLE_KEY/.test(envFile)) {
  console.error('✗ Hay una SUPABASE_SERVICE_ROLE_KEY en .env.\n');
  console.error('  Esa clave salta RLS y no debe estar en un fichero del proyecto,');
  console.error('  ni siquiera en uno ignorado por git. Quítala de .env y pásala');
  console.error('  por el shell al ejecutar este script.');
  process.exit(1);
}

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('✗ Falta SUPABASE_SERVICE_ROLE_KEY en el entorno.\n');
  console.error('  Está en Supabase → Project Settings → API → service_role.');
  console.error('  Pásala solo al ejecutar, sin guardarla en ningún fichero:\n');
  console.error("    SUPABASE_SERVICE_ROLE_KEY='eyJ...' npm run cleanup:test-users\n");
  console.error('  Añade -- --confirm cuando quieras que borre de verdad.');
  process.exit(1);
}

const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  envFile.match(/^EXPO_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim();

if (!url) {
  console.error('✗ No se ha encontrado EXPO_PUBLIC_SUPABASE_URL (ni en el entorno ni en .env).');
  process.exit(1);
}

// --- Trabajo ------------------------------------------------------------------
const admin = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

console.log(`Proyecto : ${url}`);
console.log(`Modo     : ${confirmed ? 'BORRADO REAL' : 'simulacro (añade -- --confirm para borrar)'}`);
console.log(`Criterio : cuentas cuyo email termina en ${TEST_EMAIL_DOMAIN}\n`);

const testUsers = [];
let page = 1;

for (;;) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });

  if (error) {
    console.error(`✗ No se ha podido listar usuarios: ${error.message}`);
    process.exit(1);
  }

  testUsers.push(...data.users.filter((user) => user.email?.endsWith(TEST_EMAIL_DOMAIN)));

  if (data.users.length < 200) break;
  page += 1;
}

if (testUsers.length === 0) {
  console.log('No hay cuentas de prueba que borrar.');
  process.exit(0);
}

console.log(`Cuentas de prueba encontradas: ${testUsers.length}`);
for (const user of testUsers) {
  console.log(`  ${user.email}  (${user.id})`);
}

if (!confirmed) {
  console.log('\nSimulacro: no se ha borrado nada.');
  console.log('Vuelve a ejecutarlo con -- --confirm para borrarlas.');
  process.exit(0);
}

console.log('\nBorrando…');
let deleted = 0;
let storageRemoved = 0;

for (const user of testUsers) {
  // El storage NO cae por cascade: hay que vaciar la carpeta del usuario antes.
  for (const bucket of BUCKETS) {
    const { data: files } = await admin.storage.from(bucket).list(user.id);

    if (files && files.length > 0) {
      const paths = files.map((file) => `${user.id}/${file.name}`);
      const { error } = await admin.storage.from(bucket).remove(paths);
      if (error) console.log(`  ! ${bucket}/${user.id}: ${error.message}`);
      else storageRemoved += paths.length;
    }
  }

  // Al borrar el usuario caen perfil, publicaciones, likes y follows por la
  // cascada de claves ajenas definida en 001_initial_schema.sql.
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.log(`  ✗ ${user.email}: ${error.message}`);
  } else {
    deleted += 1;
    console.log(`  ✓ ${user.email}`);
  }
}

console.log(`\n${deleted}/${testUsers.length} cuentas borradas · ${storageRemoved} archivo(s) de storage eliminados.`);
process.exit(deleted === testUsers.length ? 0 : 1);
