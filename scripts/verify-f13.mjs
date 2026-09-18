/**
 * Verificación de F1.3: perfiles completos, subida de avatar y seguimiento.
 *
 * Comprueba las dos capas, porque una sin la otra engaña:
 * - en la base de datos, que RLS deja hacer lo que debe y bloquea lo que no;
 * - en el navegador, que la app hace lo que dice la interfaz.
 *
 *   npm run verify:f13                  # construye y verifica
 *   npm run verify:f13 -- --skip-build  # reutiliza dist/
 *
 * Crea dos cuentas de prueba y las limpia al terminar (ver LIMPIEZA abajo).
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/f1');
const TMP = join(ROOT, '.tmp-verify');
const skipBuild = process.argv.includes('--skip-build');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ✗ ${m}`);
};
const info = (m) => console.log(`  · ${m}`);
const step = (m) => console.log(`\n${m}`);

const stamp = Date.now().toString(36);
const makeAccount = (role) => ({
  email: `oveng-f13-${role}-${stamp}@ovengtest.dev`,
  password: `Verif-${role}-${stamp}-2026`,
  username: `f13${role}${stamp}`.slice(0, 30).toLowerCase(),
  displayName: role === 'a' ? 'Cuenta A de prueba' : 'Cuenta B de prueba',
});

const alice = makeAccount('a');
const bob = makeAccount('b');

const clientFor = () =>
  createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

async function signUpAccount(account) {
  const client = clientFor();
  const { data, error } = await client.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { username: account.username, display_name: account.displayName } },
  });

  if (error) throw new Error(`no se pudo crear ${account.username}: ${error.message}`);
  if (!data.session) throw new Error('el registro no devolvió sesión: ¿"Confirm email" activado?');

  return { client, id: data.user.id };
}

// --- Cuentas -----------------------------------------------------------------
step('1. Cuentas de prueba');

const a = await signUpAccount(alice);
const b = await signUpAccount(bob);
ok(`creadas @${alice.username} y @${bob.username}`);

// --- RLS ---------------------------------------------------------------------
step('2. RLS sobre perfiles y seguimiento');

{
  const { data } = await a.client
    .from('profiles')
    .update({ display_name: 'SECUESTRADO' })
    .eq('id', b.id)
    .select();

  if (!data || data.length === 0) {
    ok('A no puede editar el perfil de B');
  } else {
    bad('¡A ha editado el perfil de B! Revisa las políticas de profiles');
  }

  const { data: bProfile } = await a.client
    .from('profiles')
    .select('display_name')
    .eq('id', b.id)
    .maybeSingle();

  if (bProfile?.display_name === bob.displayName) {
    ok('el perfil de B sigue intacto');
  } else {
    bad(`el display_name de B cambió a "${bProfile?.display_name}"`);
  }
}

{
  const { error } = await a.client
    .from('follows')
    .insert({ follower_id: b.id, following_id: a.id });

  if (error) {
    ok('A no puede crear un seguimiento en nombre de B');
  } else {
    bad('¡A ha creado un follow en nombre de B!');
  }
}

{
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const { error } = await a.client.storage
    .from('avatars')
    .upload(`${b.id}/intruso.jpg`, bytes, { contentType: 'image/jpeg' });

  if (error) {
    ok('A no puede subir a la carpeta de avatares de B');
  } else {
    bad('¡A ha escrito en la carpeta de B en storage!');
  }
}

// --- Seguir en la base de datos ----------------------------------------------
step('3. Seguir y dejar de seguir (capa de datos)');

{
  const { error } = await a.client
    .from('follows')
    .insert({ follower_id: a.id, following_id: b.id });
  if (error) bad(`A no ha podido seguir a B: ${error.message}`);
  else ok('A sigue a B');

  const { count: followers } = await a.client
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', b.id);
  if (followers === 1) ok('B tiene 1 seguidor en la base de datos');
  else bad(`B tiene ${followers} seguidores, se esperaba 1`);

  const { error: dup } = await a.client
    .from('follows')
    .insert({ follower_id: a.id, following_id: b.id });
  if (dup?.code === '23505') ok('no se puede seguir dos veces (clave primaria compuesta)');
  else bad('el seguimiento duplicado no fue rechazado');

  await a.client.from('follows').delete().eq('follower_id', a.id).eq('following_id', b.id);
  const { count: after } = await a.client
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', b.id);
  if (after === 0) ok('dejar de seguir borra la fila');
  else bad(`quedan ${after} seguidores tras dejar de seguir`);
}

// --- Build y navegador -------------------------------------------------------
step('4. Construyendo el export web');

if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}

const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
const { readdirSync } = await import('node:fs');
const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) {
  ok('el bundle apunta al Supabase del .env');
} else {
  bad('el bundle no apunta al Supabase del .env (¿caché de Metro?)');
}

mkdirSync(SHOTS, { recursive: true });
mkdirSync(TMP, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4174 });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

// Una imagen de verdad, dibujada por el propio navegador: 800 px para que el
// redimensionado a 512 tenga algo que hacer.
const avatarPath = join(TMP, 'avatar-prueba.jpg');
{
  const canvasPage = await context.newPage();
  const dataUrl = await canvasPage.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(0, 0, 800, 800);
    ctx.fillStyle = '#A5D6A7';
    ctx.beginPath();
    ctx.arc(400, 400, 260, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 220px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', 400, 480);
    return canvas.toDataURL('image/jpeg', 0.9);
  });
  writeFileSync(avatarPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await canvasPage.close();
  ok('imagen de prueba generada (800×800 JPEG)');
}

try {
  // --- Entrar como A ---------------------------------------------------------
  step('5. Perfil propio en el navegador');

  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(alice.email);
  await page.getByPlaceholder('Tu contraseña').fill(alice.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  await page.getByRole('tab', { name: 'Perfil' }).click();
  await page.waitForTimeout(1500);

  const seen = (t) => page.getByText(t, { exact: false }).first();
  const expectVisible = async (text, label) => {
    try {
      await seen(text).waitFor({ state: 'visible', timeout: 8000 });
      ok(label);
    } catch {
      bad(`${label} — no apareció "${text}"`);
    }
  };

  await expectVisible(`@${alice.username}`, 'la cabecera muestra el @username');
  await expectVisible('Se unió en', 'muestra la fecha de alta');
  await expectVisible('Publicaciones', 'muestra los contadores');
  await expectVisible('Tu impacto ambiental', 'muestra la tarjeta de impacto');
  await expectVisible('Puntos OVENG', 'muestra la tarjeta de puntos');
  await shot('12-perfil-propio');

  // --- Editar perfil ---------------------------------------------------------
  step('6. Editar perfil');

  await page.getByText('Editar perfil', { exact: true }).first().click();
  await page.waitForTimeout(1200);

  const nuevoNombre = 'Alicia Ribera';
  const nuevaBio = 'Restauro riberas y cuento lo que aprendo.';
  const nuevaUbicacion = 'Valencia';

  await page.getByPlaceholder('Tu nombre').fill(nuevoNombre);
  await page.getByPlaceholder('Cuenta en una línea qué te mueve').fill(nuevaBio);
  await page.getByPlaceholder('Dónde vives o dónde actúas').fill(nuevaUbicacion);
  await shot('13-editar-perfil');

  // Avatar: expo-image-picker abre un input de archivo en web.
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    page.getByText('Cambiar foto', { exact: true }).first().click(),
  ]);
  await chooser.setFiles(avatarPath);
  await page.waitForTimeout(6000);

  await page.getByText('Guardar cambios', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  const { data: savedProfile } = await a.client
    .from('profiles')
    .select('display_name, bio, location, avatar_url')
    .eq('id', a.id)
    .maybeSingle();

  if (savedProfile?.display_name === nuevoNombre) ok('el nombre visible persiste en la base de datos');
  else bad(`display_name quedó como "${savedProfile?.display_name}"`);

  if (savedProfile?.bio === nuevaBio) ok('la biografía persiste');
  else bad(`bio quedó como "${savedProfile?.bio}"`);

  if (savedProfile?.location === nuevaUbicacion) ok('la ubicación persiste');
  else bad(`location quedó como "${savedProfile?.location}"`);

  if (savedProfile?.avatar_url?.includes(`${a.id}/avatar-`)) {
    ok('avatar_url apunta a la carpeta del propio usuario');

    const response = await page.request.get(savedProfile.avatar_url);
    const length = Number(response.headers()['content-length'] ?? 0);
    if (response.ok()) ok(`el avatar se sirve público (HTTP ${response.status()}, ${length} bytes)`);
    else bad(`el avatar no se puede descargar (HTTP ${response.status()})`);
  } else {
    bad(`avatar_url inesperado: ${savedProfile?.avatar_url}`);
  }

  await page.waitForTimeout(1500);
  await shot('14-perfil-actualizado');

  // --- Perfil de otra cuenta y seguir ---------------------------------------
  step('7. Perfil público y seguimiento');

  await page.goto(`${origin}/user/${bob.username}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  await expectVisible(`@${bob.username}`, 'carga el perfil de la otra cuenta');
  await expectVisible('Seguir', 'ofrece el botón Seguir');
  await shot('15-perfil-publico');

  await page.getByText('Seguir', { exact: true }).first().click();
  await page.waitForTimeout(2500);

  const { count: followersAfter } = await a.client
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', b.id);

  if (followersAfter === 1) ok('el seguimiento quedó registrado en la base de datos');
  else bad(`la base de datos dice ${followersAfter} seguidores, se esperaba 1`);

  await expectVisible('Siguiendo', 'el botón pasa a "Siguiendo"');
  await shot('16-siguiendo');

  // El contador de la pantalla tiene que reflejar la base, no el optimismo.
  const followersShown = await page
    .getByLabel(/^\d+ Seguidores$/)
    .first()
    .getAttribute('aria-label');
  if (followersShown?.startsWith('1 ')) ok(`el contador en pantalla dice "${followersShown}"`);
  else bad(`el contador en pantalla dice "${followersShown}", se esperaba 1`);

  await page.getByText('Siguiendo', { exact: true }).first().click();
  await page.waitForTimeout(2500);

  const { count: followersFinal } = await a.client
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', b.id);

  if (followersFinal === 0) ok('dejar de seguir se refleja en la base de datos');
  else bad(`quedan ${followersFinal} seguidores tras dejar de seguir`);
} catch (error) {
  bad(`recorrido interrumpido: ${error.message.split('\n')[0]}`);
  await shot('99-f13-estado-al-fallar');
} finally {
  await browser.close();
  server.close();
}

// --- LIMPIEZA ----------------------------------------------------------------
step('8. Limpieza de los datos de prueba');

for (const [account, session] of [
  [alice, a],
  [bob, b],
]) {
  try {
    const { data: files } = await session.client.storage.from('avatars').list(session.id);
    if (files && files.length > 0) {
      await session.client.storage
        .from('avatars')
        .remove(files.map((f) => `${session.id}/${f.name}`));
      info(`borrados ${files.length} archivo(s) de avatars/${account.username}`);
    }

    await session.client.from('follows').delete().eq('follower_id', session.id);
    await session.client.from('posts').delete().eq('author_id', session.id);
    await session.client.from('profiles').delete().eq('id', session.id);
    ok(`perfil @${account.username} eliminado`);
  } catch (error) {
    bad(`no se pudo limpiar @${account.username}: ${error.message}`);
  }
}

rmSync(TMP, { recursive: true, force: true });

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('\nQuedan 2 usuarios en Authentication → Users (borrarlos requiere');
console.log('service_role, que no está en el repositorio):');
console.log(`  ${alice.email}`);
console.log(`  ${bob.email}`);
process.exit(failures === 0 ? 0 : 1);
