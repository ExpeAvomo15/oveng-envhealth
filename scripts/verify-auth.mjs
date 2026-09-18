/**
 * Verificación de F1.1 contra el proyecto Supabase real, sin navegador.
 *
 * Comprueba, en orden: que el esquema de 001 está aplicado, que RLS deniega
 * escrituras anónimas, que el trigger crea el perfil al registrarse, y que el
 * ciclo cerrar sesión → volver a entrar funciona.
 *
 *   node --env-file=.env scripts/verify-auth.mjs
 *   node --env-file=.env scripts/verify-auth.mjs tu-correo-real@ejemplo.com
 *
 * ⚠️ Crea una cuenta de prueba en tu proyecto. Para borrarla:
 *    Supabase → Authentication → Users → seleccionar → Delete user.
 *    (El perfil se borra solo: la FK es `on delete cascade`.)
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error('✗ Faltan EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  console.error('  Ejecuta con: node --env-file=.env scripts/verify-auth.mjs');
  process.exit(1);
}

const stamp = Date.now().toString(36);
/**
 * Supabase rechaza `example.com` y otros dominios reservados con "Email address
 * is invalid". Se prueban varios hasta que uno sea aceptado; el primero que
 * cuele es el que se usa para el resto de la verificación.
 */
const TEST_DOMAINS = ['ovengtest.dev', 'oveng-envhealth.com', 'mailinator.com', 'proton.me'];
const explicitEmail = process.argv[2];
const password = `Verif-${stamp}-2026`;
const username = `test_${stamp}`.slice(0, 30);
const displayName = 'Cuenta de prueba F1.1';
let email = explicitEmail ?? `oveng-f11-${stamp}@${TEST_DOMAINS[0]}`;

// Sin persistencia: cada ejecución parte de cero, como un navegador limpio.
const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  failures += 1;
  console.log(`  ✗ ${msg}`);
};
const info = (msg) => console.log(`  · ${msg}`);
const step = (msg) => console.log(`\n${msg}`);

console.log(`Proyecto : ${url}`);
console.log(`Username : ${username}`);

// --- 1. ¿Está aplicada la migración 001? -------------------------------------
step('1. Esquema (migración 001)');

for (const table of ['profiles', 'posts', 'follows', 'likes']) {
  const { error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    if (error.code === '42P01') {
      bad(`la tabla "${table}" no existe — 001 no está aplicada`);
    } else {
      bad(`"${table}": ${error.message}`);
    }
  } else {
    ok(`"${table}" existe y la lectura pública funciona`);
  }
}

if (failures > 0) {
  console.log('\nAplica supabase/migrations/001_initial_schema.sql antes de seguir.');
  console.log('Instrucciones: docs/03_MODELO_DATOS.md → «Cómo aplicarlas».');
  process.exit(1);
}

// --- 2. RLS deniega escrituras anónimas --------------------------------------
step('2. RLS bloquea al visitante anónimo');

const { error: anonInsert } = await supabase
  .from('posts')
  .insert({ author_id: '00000000-0000-0000-0000-000000000000', content: 'no debería entrar' });

if (anonInsert) {
  ok(`denegado como se esperaba (${anonInsert.code ?? 'sin código'})`);
} else {
  bad('¡un anónimo ha podido escribir en "posts"! Revisa las políticas de RLS');
}

// --- 3. Registro y trigger ---------------------------------------------------
step('3. Registro y creación automática del perfil');

const candidates = explicitEmail
  ? [explicitEmail]
  : TEST_DOMAINS.map((domain) => `oveng-f11-${stamp}@${domain}`);

let signUpData = null;
let signUpError = null;

for (const candidate of candidates) {
  const attempt = await supabase.auth.signUp({
    email: candidate,
    password,
    options: { data: { username, display_name: displayName } },
  });

  if (!attempt.error) {
    email = candidate;
    signUpData = attempt.data;
    signUpError = null;
    info(`email aceptado: ${candidate}`);
    break;
  }

  signUpError = attempt.error;

  if (/email address .* is invalid|email_address_invalid/i.test(attempt.error.message)) {
    info(`dominio rechazado por Supabase: ${candidate.split('@')[1]}`);
    continue;
  }

  break;
}

if (signUpError || !signUpData) {
  bad(`signUp falló: ${signUpError?.message ?? 'sin datos'}`);
  if (signUpError?.message.toLowerCase().includes('database error saving new user')) {
    info('Eso apunta al trigger on_auth_user_created: revisa que 001 se aplicó entera.');
  }
  process.exit(1);
}

if (signUpData.user?.identities?.length === 0) {
  bad('ese email ya estaba registrado; vuelve a ejecutar sin pasar email');
  process.exit(1);
}

ok(`usuario creado: ${signUpData.user?.id}`);

const emailConfirmationRequired = signUpData.session === null;

if (emailConfirmationRequired) {
  info('Supabase NO ha devuelto sesión → "Confirm email" está ACTIVADO en el proyecto.');
} else {
  ok('sesión devuelta en el registro ("Confirm email" desactivado)');
}

// El trigger se dispara al insertar en auth.users, esté o no confirmado el email.
await new Promise((resolve) => setTimeout(resolve, 1200));

const { data: profile, error: profileError } = await supabase
  .from('profiles')
  .select('id, username, display_name, verified, created_at')
  .eq('username', username)
  .maybeSingle();

if (profileError) {
  bad(`no se ha podido leer el perfil: ${profileError.message}`);
} else if (!profile) {
  bad('el trigger NO ha creado la fila en "profiles"');
} else {
  ok(`perfil creado por el trigger: @${profile.username}`);
  if (profile.id !== signUpData.user?.id) bad('el id del perfil no coincide con el del usuario');
  else ok('el id del perfil coincide con el del usuario');
  if (profile.display_name === displayName) ok(`display_name leído de los metadatos: "${profile.display_name}"`);
  else bad(`display_name incorrecto: "${profile.display_name}" (esperado "${displayName}")`);
  if (profile.verified === false) ok('verified arranca en false');
}

// --- 4. Username ocupado ------------------------------------------------------
step('4. La comprobación de username detecta el ocupado');

const { data: taken } = await supabase
  .from('profiles')
  .select('username')
  .eq('username', username)
  .maybeSingle();
if (taken) ok('un username existente se detecta sin sesión (política SELECT pública)');
else bad('la comprobación de disponibilidad no ve el perfil recién creado');

// --- 5. Ciclo cerrar sesión / volver a entrar --------------------------------
step('5. Ciclo cerrar sesión → volver a entrar');

if (emailConfirmationRequired) {
  info('SALTADO: sin confirmar el email, Supabase no permite iniciar sesión.');
  info('Para completar esta prueba, elige una de las dos:');
  info('  a) Authentication → Sign In / Providers → desactivar "Confirm email" (demo).');
  info('  b) Authentication → Users → abrir la cuenta → confirmar el email a mano.');
} else {
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) bad(`signOut falló: ${signOutError.message}`);
  else ok('sesión cerrada');

  const { data: afterSignOut } = await supabase.auth.getSession();
  if (afterSignOut.session === null) ok('ya no hay sesión activa');
  else bad('la sesión sigue activa después de cerrar sesión');

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    bad(`signIn falló: ${signInError.message}`);
  } else if (signInData.session) {
    ok('inicio de sesión correcto, sesión nueva emitida');
    ok(`el token caduca en ${Math.round((signInData.session.expires_in ?? 0) / 60)} min`);

    const { data: ownProfile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', signInData.user.id)
      .maybeSingle();
    if (ownProfile) ok(`el perfil se lee con sesión: @${ownProfile.username}`);
    else bad('no se ha podido leer el perfil propio con sesión iniciada');

    // Escritura propia permitida por RLS.
    const { error: ownPost } = await supabase
      .from('posts')
      .insert({ author_id: signInData.user.id, content: 'Publicación de verificación F1.1' });
    if (ownPost) bad(`no se ha podido publicar en nombre propio: ${ownPost.message}`);
    else ok('RLS permite escribir en nombre propio');

    // Escritura suplantando a otro, denegada.
    const { error: foreignPost } = await supabase
      .from('posts')
      .insert({
        author_id: '00000000-0000-0000-0000-000000000000',
        content: 'suplantación',
      });
    if (foreignPost) ok('RLS deniega publicar en nombre de otra cuenta');
    else bad('¡se ha podido publicar en nombre de otra cuenta! Revisa las políticas');

    await supabase.auth.signOut();
  }
}

// --- 6. Storage (migración 002) ----------------------------------------------
step('6. Storage (migración 002)');

for (const bucket of ['avatars', 'post-images']) {
  const { error } = await supabase.storage.from(bucket).list('', { limit: 1 });
  if (error) {
    if (/not found/i.test(error.message)) bad(`el bucket "${bucket}" no existe — falta 002`);
    else info(`"${bucket}": ${error.message} (puede ser normal sin sesión)`);
  } else {
    ok(`el bucket "${bucket}" existe y es legible`);
  }
}

// --- Resumen ------------------------------------------------------------------
console.log('\n' + '─'.repeat(64));
if (failures === 0) {
  console.log('RESULTADO: todo correcto.');
  if (emailConfirmationRequired) {
    console.log('Nota: el paso 5 quedó pendiente por la confirmación de email.');
  }
} else {
  console.log(`RESULTADO: ${failures} comprobación(es) fallida(s).`);
}
console.log(`\nBorra la cuenta de prueba (${email}) en Authentication → Users.`);
process.exit(failures === 0 ? 0 : 1);
