/**
 * La batería entera de verificación, en orden y con un solo build.
 *
 *   export SUPABASE_SERVICE_ROLE_KEY='sb_secret_…'   # para que se limpie sola
 *   npm run verify:all
 *   npm run verify:all -- --skip-build               # reutiliza dist/
 *
 * Cada script limpia al empezar y al terminar (scripts/lib/test-users.mjs). Al
 * final, la batería **comprueba** el resultado: consulta `auth.users` y falla
 * si queda alguna cuenta @ovengtest.dev. Sin la clave de servicio no puede
 * mirar, y lo dice.
 *
 * No lanzar dos baterías a la vez: la limpieza de una borraría las cuentas que
 * la otra está usando.
 */

import { execSync, spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { adminClient, listTestUsers, serviceKeyInEnvFile } from './lib/test-users.mjs';

const ROOT = process.cwd();

// verify-auth y verify-f21 no construyen la web: no reciben --skip-build
// (verify-auth tomaría el argumento por un correo).
const SUITE = [
  'auth', 'ui', 'f13', 'f14', 'f15', 'mvp', 'f21', 'f22', 'f23', 'f24',
  'f25', 'f41', 'f42', 'f43', 'f44', 'f45', 'f46', 'demo',
];
const NO_BUILD = new Set(['auth', 'f21']);

if (!process.argv.includes('--skip-build')) {
  console.log('Construyendo el export web una vez para toda la batería…');
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}

const results = [];
for (const name of SUITE) {
  console.log(`\n${'═'.repeat(64)}\nverify:${name}\n${'═'.repeat(64)}`);
  const args = ['--env-file=.env', `scripts/verify-${name}.mjs`, ...(NO_BUILD.has(name) ? [] : ['--skip-build'])];
  const { status } = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  results.push({ name, ok: status === 0 });
}

console.log(`\n${'═'.repeat(64)}\nBATERÍA\n${'═'.repeat(64)}`);
for (const { name, ok } of results) console.log(`  ${ok ? '✓' : '✗'} verify:${name}`);
const failed = results.filter((r) => !r.ok).length;

// La comprobación de residuo: tras una batería, ni una cuenta de prueba en Auth.
let residue = 0;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!key || serviceKeyInEnvFile()) {
  console.log('\n⚠ Sin SUPABASE_SERVICE_ROLE_KEY en el shell no se puede mirar auth.users: residuo sin comprobar.');
} else {
  const left = await listTestUsers(adminClient(process.env.EXPO_PUBLIC_SUPABASE_URL, key));
  residue = left.length;
  if (residue === 0) console.log('\n✓ auth.users: ninguna cuenta @ovengtest.dev tras la batería.');
  else {
    console.log(`\n✗ auth.users: quedan ${residue} cuenta(s) @ovengtest.dev:`);
    for (const user of left) console.log(`    ${user.email}`);
  }
}

console.log(`\nRESULTADO: ${failed === 0 ? 'las' : `${SUITE.length - failed} de`} ${SUITE.length} verificaciones en verde${residue > 0 ? `, con ${residue} cuenta(s) de residuo` : ''}.`);
process.exit(failed === 0 && residue === 0 ? 0 : 1);
