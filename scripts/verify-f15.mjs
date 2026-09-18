/**
 * Verificación de F1.5: feed, likes, filtro "Siguiendo" y paginación.
 *
 * Siembra tres cuentas y 28 publicaciones para que la segunda página exista de
 * verdad, y luego recorre el feed en el navegador comprobando contra la base de
 * datos lo que la interfaz dice.
 *
 *   npm run verify:f15                  # construye y verifica
 *   npm run verify:f15 -- --skip-build  # reutiliza dist/
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/f1');
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
const makeAccount = (role, name) => ({
  email: `oveng-f15-${role}-${stamp}@ovengtest.dev`,
  password: `Verif-${role}-${stamp}-2026`,
  username: `f15${role}${stamp}`.slice(0, 30).toLowerCase(),
  displayName: name,
});

const alice = makeAccount('a', 'Alicia Lectora');
const bruno = makeAccount('b', 'Bruno Seguido');
const carla = makeAccount('c', 'Carla NoSeguida');

async function signUp(acc) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signUp({
    email: acc.email,
    password: acc.password,
    options: { data: { username: acc.username, display_name: acc.displayName } },
  });
  if (error) throw new Error(`no se pudo crear ${acc.username}: ${error.message}`);
  if (!data.session) throw new Error('el registro no devolvió sesión: ¿"Confirm email" activado?');
  return { client, id: data.user.id };
}

// --- Semilla -----------------------------------------------------------------
step('1. Cuentas y publicaciones de prueba');

const a = await signUp(alice);
const b = await signUp(bruno);
const c = await signUp(carla);
ok(`creadas @${alice.username} (lectora), @${bruno.username} (seguida), @${carla.username} (no seguida)`);

const POSTS_B = 25;
const minutesAgo = (n) => new Date(Date.now() - n * 60_000).toISOString();

{
  // Marcas de tiempo explícitas y distintas: el cursor pagina por `created_at`,
  // y con 25 filas insertadas en el mismo milisegundo el orden sería arbitrario.
  const rows = Array.from({ length: POSTS_B }, (_, index) => ({
    author_id: b.id,
    content: `Publicación ${index + 1} de prueba B #Reforestación`,
    hashtags: ['reforestación'],
    created_at: minutesAgo(100 - index),
  }));

  const { error } = await b.client.from('posts').insert(rows);
  if (error) bad(`no se pudieron sembrar las publicaciones de B: ${error.message}`);
  else ok(`${POSTS_B} publicaciones de @${bruno.username}`);

  const { error: errorC } = await c.client.from('posts').insert(
    Array.from({ length: 3 }, (_, index) => ({
      author_id: c.id,
      content: `Publicación ${index + 1} de prueba C`,
      created_at: minutesAgo(5 - index),
    })),
  );
  if (errorC) bad(`no se pudieron sembrar las publicaciones de C: ${errorC.message}`);
  else ok('3 publicaciones de @' + carla.username);

  const { error: followError } = await a.client
    .from('follows')
    .insert({ follower_id: a.id, following_id: b.id });
  if (followError) bad(`A no pudo seguir a B: ${followError.message}`);
  else ok(`@${alice.username} sigue a @${bruno.username} (y no a @${carla.username})`);
}

// --- Build -------------------------------------------------------------------
step('2. Construyendo el export web');
if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}

const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) {
  ok('el bundle apunta al Supabase del .env');
} else {
  bad('el bundle no apunta al Supabase del .env (¿caché de Metro?)');
}

mkdirSync(SHOTS, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4177 });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

const visible = (text) =>
  page
    .getByText(text, { exact: false })
    .first()
    .isVisible()
    .catch(() => false);

async function scrollFeed(times) {
  for (let i = 0; i < times; i += 1) {
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(700);
  }
}

try {
  // --- Feed poblado ----------------------------------------------------------
  step('3. Feed "Para ti"');

  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(alice.email);
  await page.getByPlaceholder('Tu contraseña').fill(alice.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(4000);

  if (await visible('Publicación 3 de prueba C')) ok('el feed muestra publicaciones de C');
  else bad('el feed no muestra las publicaciones de C');

  if (await visible(`@${carla.username}`)) ok('las tarjetas muestran autor y antigüedad');
  else bad('no se ve el autor en las tarjetas');

  if (await visible('#Reforestación')) ok('las etiquetas se ven dentro del texto');
  else bad('no se ven las etiquetas en el texto');

  await shot('20-feed-para-ti');

  // --- Paginación ------------------------------------------------------------
  step('4. Paginación (28 publicaciones, páginas de 20)');

  // La más antigua de B solo puede estar en la segunda página.
  if (await visible('Publicación 1 de prueba B')) {
    bad('la publicación más antigua ya se veía sin paginar: la primera página trae de más');
  } else {
    ok('la publicación más antigua no está en la primera página');
  }

  await scrollFeed(12);

  if (await visible('Publicación 1 de prueba B')) {
    ok('al bajar se carga la segunda página');
  } else {
    bad('la segunda página no llegó a cargarse');
  }

  if (await visible('No hay más publicaciones')) ok('el pie avisa de que no queda más');
  else info('el pie de "no hay más" no era visible en ese punto del scroll');

  await shot('21-feed-pagina-2');

  // --- Like ------------------------------------------------------------------
  step('5. "Me gusta" y su persistencia');

  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);

  await page.getByRole('button', { name: 'Me gusta' }).first().click();
  await page.waitForTimeout(2500);

  {
    const { data: likes } = await a.client.from('likes').select('post_id').eq('user_id', a.id);
    if (likes?.length === 1) ok('el "me gusta" quedó guardado en la base de datos');
    else bad(`la base de datos tiene ${likes?.length ?? 0} "me gusta", se esperaba 1`);
  }

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);

  if (await page.getByRole('button', { name: 'Quitar me gusta' }).first().isVisible()) {
    ok('tras recargar, el corazón sigue relleno');
  } else {
    bad('tras recargar se perdió el estado del "me gusta"');
  }
  await shot('22-feed-like');

  // --- Siguiendo -------------------------------------------------------------
  step('6. Filtro "Siguiendo"');

  await page.getByRole('tab', { name: 'Siguiendo' }).click();
  await page.waitForTimeout(3000);

  if (await visible('Publicación 25 de prueba B')) ok('se ven las publicaciones de la cuenta seguida');
  else bad('no se ven las publicaciones de B en "Siguiendo"');

  if (await visible('Publicación 3 de prueba C')) {
    bad('¡se cuelan publicaciones de una cuenta que no se sigue!');
  } else {
    ok('no se cuelan publicaciones de la cuenta no seguida');
  }
  await shot('23-feed-siguiendo');

  // --- Publicar y ver el post arriba -----------------------------------------
  step('7. Al publicar, la publicación nueva aparece arriba');

  await page.getByRole('tab', { name: 'Para ti' }).click();
  await page.waitForTimeout(2000);

  const textoNuevo = `Recién publicado ${stamp} #Agua`;
  await page.getByRole('button', { name: 'Crear publicación' }).click();
  await page.waitForTimeout(1500);
  await page.getByLabel('Texto de la publicación').fill(textoNuevo);
  await page.getByText('Publicar', { exact: true }).first().click();
  await page.waitForTimeout(4500);

  {
    const primeraTarjeta = await page
      .getByLabel('Ver la publicación')
      .first()
      .innerText()
      .catch(() => '');

    if (primeraTarjeta.includes(`Recién publicado ${stamp}`)) {
      ok('la publicación nueva encabeza el feed');
    } else {
      bad(`la primera tarjeta no es la nueva: "${primeraTarjeta.slice(0, 60)}"`);
    }
  }
  await shot('24-feed-tras-publicar');

  // --- Navegación a perfil y detalle -----------------------------------------
  step('8. Navegación desde la tarjeta');

  await page.getByRole('link', { name: `Perfil de ${bruno.displayName}` }).first().click();
  await page.waitForTimeout(3000);

  if (new URL(page.url()).pathname.endsWith(`/user/${bruno.username}`)) {
    ok('el avatar lleva al perfil público del autor');
  } else {
    bad(`el avatar llevó a ${new URL(page.url()).pathname}`);
  }

  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByLabel('Ver la publicación').first().click();
  await page.waitForTimeout(3000);

  if (new URL(page.url()).pathname.includes('/post/')) ok('el cuerpo de la tarjeta lleva al detalle');
  else bad(`el cuerpo llevó a ${new URL(page.url()).pathname}`);

  if (await visible('Los comentarios llegan pronto')) ok('el detalle reserva el sitio de comentarios');
  else bad('el detalle no muestra el aviso de comentarios');

  await shot('25-detalle-post');
} catch (error) {
  bad(`recorrido interrumpido: ${error.message.split('\n')[0]}`);
  await shot('99-f15-estado-al-fallar');
} finally {
  await browser.close();
  server.close();
}

// --- Limpieza ----------------------------------------------------------------
step('9. Limpieza de los datos de prueba');
for (const [acc, session] of [
  [alice, a],
  [bruno, b],
  [carla, c],
]) {
  try {
    await session.client.from('likes').delete().eq('user_id', session.id);
    await session.client.from('follows').delete().eq('follower_id', session.id);
    await session.client.from('posts').delete().eq('author_id', session.id);
    await session.client.from('profiles').delete().eq('id', session.id);
    ok(`@${acc.username} y sus datos eliminados`);
  } catch (error) {
    bad(`no se pudo limpiar @${acc.username}: ${error.message}`);
  }
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('\nQuedan 3 usuarios en Authentication → Users (borrarlos requiere service_role):');
for (const acc of [alice, bruno, carla]) console.log(`  ${acc.email}`);
process.exit(failures === 0 ? 0 : 1);
