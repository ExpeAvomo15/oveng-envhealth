/**
 * Verificación de F4.7: comentarios y compartir (fuera con el enlace, dentro
 * por mensaje).
 *
 *   npm run verify:f47                  # construye y verifica
 *   npm run verify:f47 -- --skip-build  # reutiliza dist/
 *
 * Necesita las migraciones 008 y 009 aplicadas. Crea tres cuentas de prueba:
 * A publica, B comenta y comparte (y habla con A), C es una tercera que no
 * debe poder borrar lo ajeno. Las limpia al terminar: borrar el perfil arrastra
 * publicaciones, comentarios, conversaciones y mensajes (`on delete cascade`).
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';
import { finishTestRun, preCleanTestUsers } from './lib/test-users.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

// Antes de crear nada: recoge las cuentas de prueba de baterías anteriores.
await preCleanTestUsers();

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/f47');
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

const client = () =>
  createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const anon = client();

// --- 1. La base está lista ---------------------------------------------------------------
step('1. Migración 009 aplicada');
{
  // GET y no HEAD: una consulta HEAD a una tabla que no existe no da error.
  const comments = await anon.from('comments').select('*').limit(1);
  const shared = await anon.from('messages').select('shared_post_id').limit(1);
  if (comments.error || shared.error) {
    if (comments.error) bad(`comments no responde (${comments.error.code}): falta la migración 009`);
    if (shared.error) bad(`messages.shared_post_id no existe (${shared.error.code}): falta la migración 009`);
    console.log('\nRESULTADO: la base no está lista. Aplica la migración 009 (docs/03_MODELO_DATOS.md).');
    process.exit(1);
  }
  ok('comments y messages.shared_post_id existen');
}

// --- 2. Cuentas y datos ------------------------------------------------------------------
step('2. Cuentas de prueba, una publicación y una conversación aceptada');
const stamp = Date.now().toString(36);
const accounts = {};
const users = {};
const ids = {};
for (const key of ['a', 'b', 'c']) {
  accounts[key] = {
    email: `oveng-f47${key}-${stamp}@ovengtest.dev`,
    password: `Verif-${stamp}-${key.toUpperCase()}`,
    username: `f47${key}${stamp}`,
    name: `Cuenta ${key.toUpperCase()} F4.7`,
  };
  users[key] = client();
  const { data, error } = await users[key].auth.signUp({
    email: accounts[key].email,
    password: accounts[key].password,
    options: { data: { username: accounts[key].username, display_name: accounts[key].name } },
  });
  if (error || !data.session) {
    bad(`no se pudo crear la cuenta ${key}: ${error?.message ?? 'sin sesión'}`);
    process.exit(1);
  }
  ids[key] = data.user.id;
}
ok(`A @${accounts.a.username}, B @${accounts.b.username} y C @${accounts.c.username}`);

const POST_TEXT = `Limpieza del río Ntem este sábado ${stamp}. ¡Os esperamos! #Ntem`;
const { data: post, error: postError } = await users.a
  .from('posts')
  .insert({ author_id: ids.a, content: POST_TEXT, hashtags: ['ntem'] })
  .select('id')
  .single();
if (postError) {
  bad(`A no pudo publicar: ${postError.message}`);
  process.exit(1);
}
ok(`A publica (${post.id})`);

// B pide hablar con A y A acepta: es la conversación a la que B enviará la publicación.
const pair = ids.a < ids.b ? { user_low: ids.a, user_high: ids.b } : { user_low: ids.b, user_high: ids.a };
const { data: convo, error: convoError } = await users.b
  .from('conversations')
  .insert({ ...pair, requested_by: ids.b, status: 'pending' })
  .select('id')
  .single();
if (convoError) {
  bad(`B no pudo pedir la conversación: ${convoError.message}`);
  process.exit(1);
}
await users.b.from('messages').insert({ conversation_id: convo.id, sender_id: ids.b, body: 'Hola, ¿vamos al Ntem?' });
await users.a.from('conversations').update({ status: 'accepted' }).eq('id', convo.id);
ok('B y A tienen una conversación aceptada');

// --- 3. RLS ----------------------------------------------------------------------------------
step('3. RLS de comentarios');
let cComment = null;
{
  const anonWrite = await anon.from('comments').insert({ post_id: post.id, user_id: ids.b, content: 'sin cuenta' });
  if (anonWrite.error) ok('sin cuenta no se comenta');
  else bad('un anónimo ha comentado');

  const asOther = await users.c.from('comments').insert({ post_id: post.id, user_id: ids.b, content: 'soy B' });
  if (asOther.error) ok('nadie comenta en nombre de otro');
  else bad('C ha comentado en nombre de B');

  const empty = await users.b.from('comments').insert({ post_id: post.id, user_id: ids.b, content: '   ' });
  const long = await users.b.from('comments').insert({ post_id: post.id, user_id: ids.b, content: 'x'.repeat(501) });
  if (empty.error && long.error) ok('ni vacío ni de más de 500 caracteres (check de la tabla)');
  else bad('la tabla acepta un comentario vacío o demasiado largo');

  const { data: mine, error } = await users.c
    .from('comments')
    .insert({ post_id: post.id, user_id: ids.c, content: `Comentario de C ${stamp}` })
    .select('id')
    .single();
  if (error) bad(`C no puede comentar en su nombre: ${error.message}`);
  else {
    cComment = mine.id;
    ok('C comenta en su nombre');
  }

  const { data: read } = await anon.from('comments').select('id').eq('post_id', post.id);
  if ((read ?? []).length === 1) ok('sin cuenta se leen los comentarios (lectura libre)');
  else bad(`un anónimo lee ${read?.length ?? 0} comentarios, se esperaba 1`);

  const { data: edited } = await users.c.from('comments').update({ content: 'editado' }).eq('id', cComment).select();
  if (!edited || edited.length === 0) ok('nadie edita un comentario, ni su autor');
  else bad('C ha editado su comentario');

  const { data: bDeletes } = await users.b.from('comments').delete().eq('id', cComment).select();
  if (!bDeletes || bDeletes.length === 0) ok('B no puede borrar el comentario de C en la publicación de A');
  else bad('B ha borrado un comentario ajeno');
}

// --- 4. Build ------------------------------------------------------------------------------
step('4. Construyendo el export web');
if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}
{
  const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
  const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
  if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) ok('el bundle apunta al Supabase del .env');
  else bad('el bundle no apunta al Supabase del .env');

  // Vista previa de un enlace: genérica, en el HTML de la app y en el 404.html
  // por el que entran los enlaces profundos en Pages.
  for (const file of ['index.html', '404.html']) {
    const html = readFileSync(join(ROOT, 'dist', file), 'utf8');
    const has = ['og:title', 'og:description', 'og:image'].every((tag) => html.includes(`property="og:${tag.slice(3)}"`));
    if (has) ok(`${file} lleva og:title, og:description y og:image`);
    else bad(`${file} no lleva las etiquetas OG`);
  }
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4201 });
const browser = await chromium.launch();

async function newContext({ webShare = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'es-ES',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  if (webShare) {
    // Chromium de escritorio no trae Web Share: se simula la del móvil y se
    // guarda lo que la app le pide compartir.
    await context.addInitScript(() => {
      window.__shared = [];
      navigator.share = (data) => {
        window.__shared.push(data);
        return Promise.resolve();
      };
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, errors };
}

async function session(key, options) {
  const s = await newContext(options);
  await s.page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await s.page.getByPlaceholder('tu@email.com').fill(accounts[key].email);
  await s.page.getByPlaceholder('Tu contraseña').fill(accounts[key].password);
  await s.page.getByText('Entrar', { exact: true }).first().click();
  await s.page.waitForTimeout(3500);
  return s;
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const route = (page) => new URL(page.url()).pathname.replace(basePath, '') || '/';
const visible = (locator) => locator.filter({ visible: true }).first();
const postPath = `/publicacion/${post.id}`;
const countComments = async () => (await anon.from('comments').select('id').eq('post_id', post.id)).data?.length ?? -1;

async function waitVisible(locator, timeout = 6000) {
  try {
    await visible(locator).waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}

try {
  // --- 5. Sin cuenta, el enlace en frío -------------------------------------------------------
  step('5. Sin cuenta: el enlace compartido se abre en frío');
  {
    const { context, page, errors } = await newContext();
    // Directo a la ruta, sin pasar por la app: en Pages entra por el 404.html.
    const response = await page.goto(`${origin}${postPath}`, { waitUntil: 'networkidle' });
    info(`el servidor responde ${response?.status()} (el 404.html de Pages) y la app restaura la ruta`);
    await page.waitForTimeout(2500);
    if (route(page) === postPath) ok(`aterriza en ${postPath}`);
    else bad(`aterriza en ${route(page)}`);
    if (await waitVisible(page.getByText(`Limpieza del río Ntem este sábado ${stamp}`, { exact: false }))) ok('se lee la publicación');
    else bad('la publicación no se ve sin cuenta');
    if (await waitVisible(page.getByText(`Comentario de C ${stamp}`))) ok('y sus comentarios');
    else bad('los comentarios no se ven sin cuenta');
    if ((await page.getByRole('button', { name: 'Entra para comentar' }).count()) > 0) ok('la barra de comentar lleva a entrar');
    else bad('sin cuenta no se dice cómo comentar');
    await shot(page, '01-enlace-en-frio-sin-cuenta');

    await page.getByRole('button', { name: 'Entra para comentar' }).click();
    await page.waitForTimeout(1500);
    if (route(page).includes('welcome')) ok('«Entra para comentar» lleva a la bienvenida');
    else bad(`«Entra para comentar» lleva a ${route(page)}`);

    // Sin Web Share (escritorio): compartir copia el enlace.
    await page.goto(`${origin}${postPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await visible(page.getByRole('button', { name: 'Compartir', exact: true })).click();
    await page.waitForTimeout(800);
    if ((await page.getByRole('button', { name: 'Compartir en otras apps' }).count()) === 0) ok('sin Web Share no se ofrece la hoja del sistema');
    else bad('se ofrece compartir en otras apps sin Web Share');
    if (await waitVisible(page.getByRole('button', { name: 'Entra para enviarla' }), 3000)) ok('enviar por mensaje pide cuenta, y lo dice');
    else bad('sin cuenta, enviar por mensaje no dice qué hacer');
    await shot(page, '02-compartir-sin-cuenta');
    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await page.waitForTimeout(600);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    if (copied === `${origin}${postPath}`) ok(`«Copiar enlace» copia ${copied.replace(origin, '')}`);
    else bad(`se copió «${copied}»`);
    if (await waitVisible(page.getByText('Enlace copiado'), 2000)) ok('con el aviso «Enlace copiado»');
    else bad('no aparece «Enlace copiado»');

    await page.goto(`${origin}/publicacion/00000000-0000-4000-8000-000000000000`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    if (
      (await waitVisible(page.getByText('Esta publicación no existe'))) &&
      (await page.getByRole('button', { name: 'Ir al inicio' }).count()) > 0
    ) {
      ok('un id que no existe dice «Esta publicación no existe» con salida al inicio');
    } else {
      bad('un id que no existe no tiene un estado honesto');
    }
    await shot(page, '03-no-existe');

    await page.goto(`${origin}/post/${post.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    if (route(page) === postPath) ok('los enlaces antiguos /post/… llevan a /publicacion/…');
    else bad(`/post/… lleva a ${route(page)}`);

    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
    await context.close();
  }

  // --- 6. B comenta y borra ----------------------------------------------------------------------
  step('6. B comenta en la publicación de A, y borra su comentario');
  const b = await session('b', { webShare: true });
  {
    const { page } = b;
    // En el feed, el contador real y «Ver 1 comentario».
    if (await waitVisible(page.getByRole('button', { name: 'Comentarios, 1' }))) ok('el feed cuenta el comentario de C: «Comentarios, 1»');
    else bad('el contador del feed no refleja el comentario');
    if (await waitVisible(page.getByRole('link', { name: 'Ver el comentario' }), 3000)) ok('y ofrece «Ver 1 comentario» bajo la publicación');
    else bad('no aparece «Ver 1 comentario»');
    await shot(page, '04-feed-contador');
    await visible(page.getByRole('button', { name: 'Comentarios, 1' })).click();
    await page.waitForTimeout(2500);
    if (route(page) === postPath) ok('el 💬 abre la publicación con sus comentarios');
    else bad(`el 💬 lleva a ${route(page)}`);

    const text = `¡Allí estaré con guantes! ${stamp}`;
    await page.getByLabel('Añade un comentario').fill(text);
    await page.getByRole('button', { name: 'Publicar comentario' }).click();
    if (await waitVisible(page.getByText(text), 1500)) ok('el comentario aparece al instante');
    else bad('el comentario no aparece');
    await page.waitForTimeout(2000);
    if ((await countComments()) === 2) ok('y queda en la base');
    else bad(`la base tiene ${await countComments()} comentarios, se esperaban 2`);
    if (await waitVisible(page.getByRole('button', { name: 'Comentarios, 2' }), 2000)) ok('el contador de la tarjeta sube a 2');
    else bad('el contador no sube');
    await shot(page, '05-comentario-publicado');

    // B no puede borrar el de C (la publicación no es suya): no tiene «···».
    if ((await page.getByRole('button', { name: `Opciones del comentario de @${accounts.c.username}` }).count()) === 0) {
      ok('B no ve «···» en el comentario de C');
    } else {
      bad('B puede intentar borrar el comentario de C');
    }
    await page.getByRole('button', { name: `Opciones del comentario de @${accounts.b.username}` }).click();
    await page.getByRole('button', { name: 'Sí, borrar' }).click();
    await page.waitForTimeout(2000);
    if ((await page.getByText(text).count()) === 0 && (await countComments()) === 1) ok('B borra su comentario, con confirmación');
    else bad('el comentario de B no se ha borrado');
  }

  // --- 7. Compartir fuera y dentro ------------------------------------------------------------------
  step('7. B comparte: Web Share con el enlace, y por mensaje a A');
  {
    const { page } = b;
    await visible(page.getByRole('button', { name: 'Compartir', exact: true })).click();
    await page.waitForTimeout(1500);
    await shot(page, '06-hoja-compartir');
    await page.getByRole('button', { name: 'Compartir en otras apps' }).click();
    await page.waitForTimeout(800);
    const shared = await page.evaluate(() => window.__shared);
    if (shared?.length === 1 && shared[0].url === `${origin}${postPath}`) ok('la Web Share recibe el enlace directo a la publicación');
    else bad(`la Web Share recibió ${JSON.stringify(shared)}`);

    await visible(page.getByRole('button', { name: 'Compartir', exact: true })).click();
    await page.waitForTimeout(1500);
    const send = page.getByRole('button', { name: `Enviar a ${accounts.a.name}` });
    if (await waitVisible(send)) ok('«Enviar por mensaje» lista la conversación aceptada con A');
    else bad('la conversación con A no aparece para enviar');
    await send.click();
    if (await waitVisible(page.getByRole('button', { name: `Enviada a ${accounts.a.name}` }))) ok('y el botón pasa a «Enviada»');
    else bad('el envío no se confirma');
    await shot(page, '07-enviada-por-mensaje');
    const { data: msgs } = await users.a
      .from('messages')
      .select('sender_id, shared_post_id')
      .eq('conversation_id', convo.id)
      .not('shared_post_id', 'is', null);
    if (msgs?.length === 1 && msgs[0].shared_post_id === post.id && msgs[0].sender_id === ids.b) ok('en la base, un mensaje de B con shared_post_id');
    else bad(`mensajes compartidos: ${JSON.stringify(msgs)}`);
    await b.context.close();
  }

  // --- 8. A recibe la mini-tarjeta y borra lo de C -------------------------------------------------
  step('8. A recibe la mini-tarjeta y modera los comentarios de su publicación');
  const a = await session('a');
  {
    const { page, errors } = a;
    await page.goto(`${origin}/mensajes/${convo.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const card = page.getByRole('link', { name: /publicación de @.*Abrir la publicación/ });
    if (await waitVisible(card)) ok('la publicación llega como mini-tarjeta en el chat');
    else bad('no hay mini-tarjeta en la conversación');
    await shot(page, '08-mini-tarjeta');
    await visible(card).click();
    await page.waitForTimeout(2500);
    if (route(page) === postPath) ok('tocarla lleva a la publicación');
    else bad(`la mini-tarjeta lleva a ${route(page)}`);

    await page.getByRole('button', { name: `Opciones del comentario de @${accounts.c.username}` }).click();
    await shot(page, '09-confirmar-borrado');
    await page.getByRole('button', { name: 'Sí, borrar' }).click();
    await page.waitForTimeout(2000);
    if ((await countComments()) === 0) ok('A, autora de la publicación, borra el comentario de C');
    else bad('A no ha podido borrar el comentario de C');
    if (await waitVisible(page.getByText('Aún no hay comentarios', { exact: false }), 3000)) ok('y la lista lo dice en llano');
    else bad('la lista vacía no se explica');
    await shot(page, '10-sin-comentarios');

    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
    await a.context.close();
  }

  // --- 9. Sin conversaciones -----------------------------------------------------------------------
  step('9. C, sin conversaciones, ve un estado honesto al enviar');
  {
    const c = await session('c');
    const { page } = c;
    await page.goto(`${origin}${postPath}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await visible(page.getByRole('button', { name: 'Compartir', exact: true })).click();
    if (
      (await waitVisible(page.getByText('Aún no tienes conversaciones', { exact: false }))) &&
      (await page.getByRole('button', { name: 'Buscar personas' }).count()) > 0
    ) {
      ok('«Aún no tienes conversaciones» con «Buscar personas»');
    } else {
      bad('sin conversaciones no hay un estado honesto');
    }
    await shot(page, '11-sin-conversaciones');
    await c.context.close();
  }
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.close();
}

// --- 10. Limpieza --------------------------------------------------------------------------------------
step('10. Limpieza');
try {
  for (const key of ['a', 'b', 'c']) {
    await users[key].from('profiles').delete().eq('id', ids[key]);
  }
  const { data } = await anon.from('posts').select('id').eq('id', post.id);
  if ((data ?? []).length === 0 && (await countComments()) === 0) ok('perfiles, publicación, comentarios y conversación de prueba eliminados');
  else bad('quedan datos de prueba en la base');
  info('las cuentas de Auth se borran en la limpieza final');
} catch (caught) {
  bad(`no se pudo limpiar: ${caught.message}`);
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f47/');
// Borra las cuentas de esta verificación (si hay clave de servicio) y sale.
await finishTestRun(failures === 0 ? 0 : 1);
