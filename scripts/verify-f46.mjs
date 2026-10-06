/**
 * Verificación de F4.6: mensajes 1 a 1 con solicitud, bloqueo, no leídos y
 * tiempo real.
 *
 *   npm run verify:f46                  # construye y verifica
 *   npm run verify:f46 -- --skip-build  # reutiliza dist/
 *
 * Necesita la migración 008 aplicada. Crea tres cuentas de prueba —A y B, que
 * se escriben, y C, que no debe ver nada— y las limpia al terminar: borrar el
 * perfil arrastra conversaciones, mensajes y bloqueos (`on delete cascade`).
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
const SHOTS = join(ROOT, 'docs/verificacion/f46');
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
step('1. Migración 008 aplicada');
{
  let ready = true;
  for (const table of ['conversations', 'messages', 'blocks']) {
    // GET y no HEAD: una consulta HEAD a una tabla que no existe no da error.
    const { error } = await anon.from(table).select('*').limit(1);
    if (error) {
      bad(`${table} no responde (${error.code}): falta la migración 008`);
      ready = false;
    }
  }
  if (!ready) {
    console.log('\nRESULTADO: la base no está lista. Aplica la migración 008 (docs/03_MODELO_DATOS.md).');
    process.exit(1);
  }
  ok('conversations, messages y blocks existen');
  const { data } = await anon.from('messages').select('id').limit(1);
  if ((data ?? []).length === 0) ok('sin cuenta no se lee ningún mensaje');
  else bad('un anónimo lee mensajes');
}

// --- 2. Cuentas --------------------------------------------------------------------------------
step('2. Cuentas de prueba');
const stamp = Date.now().toString(36);
const accounts = {};
const users = {};
const ids = {};
for (const key of ['a', 'b', 'c']) {
  accounts[key] = {
    email: `oveng-f46${key}-${stamp}@ovengtest.dev`,
    password: `Verif-${stamp}-${key.toUpperCase()}`,
    username: `f46${key}${stamp}`,
    name: `Cuenta ${key.toUpperCase()} F4.6`,
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

const pair = (x, y) => (ids[x] < ids[y] ? { user_low: ids[x], user_high: ids[y] } : { user_low: ids[y], user_high: ids[x] });

// --- 3. Build ------------------------------------------------------------------------------------
step('3. Construyendo el export web');
if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}
{
  const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
  const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
  if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) ok('el bundle apunta al Supabase del .env');
  else bad('el bundle no apunta al Supabase del .env');
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4199 });
const browser = await chromium.launch();

async function session(key) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(accounts[key].email);
  await page.getByPlaceholder('Tu contraseña').fill(accounts[key].password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3500);
  return { context, page, errors };
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const route = (page) => new URL(page.url()).pathname.replace(basePath, '') || '/';
const visible = (locator) => locator.filter({ visible: true }).first();

let conversationId = null;

try {
  // --- 4. A pide conversación a B --------------------------------------------------------------
  step('4. A envía una solicitud de mensaje desde el perfil de B');
  const a = await session('a');
  {
    const { page } = a;
    // Que se vea que se puede chatear, como en cualquier red social: el
    // bocadillo en la cabecera y junto a quien publica.
    if ((await page.getByRole('button', { name: /^Mensajes/ }).filter({ visible: true }).count()) > 0) ok('la cabecera enseña el icono de mensajes');
    else bad('no hay icono de mensajes en la cabecera');
    if ((await page.getByRole('button', { name: /^Enviar mensaje a / }).filter({ visible: true }).count()) > 0) ok('cada publicación ajena lleva su bocadillo «Enviar mensaje a …»');
    else bad('las publicaciones no ofrecen escribir a quien publica');
    await page.goto(`${origin}/user/${accounts.b.username}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await visible(page.getByRole('button', { name: 'Enviar mensaje', exact: true })).click();
    await page.waitForTimeout(2500);
    conversationId = route(page).split('/mensajes/')[1] ?? null;
    if (conversationId) ok(`se abre la conversación (${route(page)})`);
    else bad(`«Enviar mensaje» lleva a ${route(page)}`);
    await page.getByLabel('Escribe un mensaje').fill('Hola, ¿organizamos una limpieza del Ntem?');
    await page.getByRole('button', { name: 'Enviar', exact: true }).click();
    await page.waitForTimeout(2000);
    try {
      await visible(page.getByText('Esperando a que acepte tu solicitud', { exact: false })).waitFor({ timeout: 5000 });
      ok('el mensaje sale como solicitud, y la pantalla lo dice');
    } catch {
      bad('no avisa de que la solicitud está pendiente');
    }
    await shot(page, '01-solicitud-enviada');
  }

  // --- 5. RLS: lo que nadie más puede hacer -------------------------------------------------------
  step('5. RLS: C no ve nada, y cada uno solo hace lo suyo');
  {
    const { data: seen } = await users.c.from('conversations').select('id').eq('id', conversationId);
    const { data: seenMsgs } = await users.c.from('messages').select('id').eq('conversation_id', conversationId);
    if ((seen ?? []).length === 0 && (seenMsgs ?? []).length === 0) ok('C no ve la conversación ni sus mensajes');
    else bad('C ve la conversación de A y B');

    const cWrites = await users.c.from('messages').insert({ conversation_id: conversationId, sender_id: ids.c, body: 'me cuelo' });
    if (cWrites.error) ok('C no puede escribir en la conversación de A y B');
    else bad('C ha escrito en una conversación ajena');

    const asOther = await users.c.from('messages').insert({ conversation_id: conversationId, sender_id: ids.a, body: 'soy A' });
    if (asOther.error) ok('C no puede escribir en nombre de A');
    else bad('C ha escrito en nombre de A');

    const bEarly = await users.b.from('messages').insert({ conversation_id: conversationId, sender_id: ids.b, body: 'antes de aceptar' });
    if (bEarly.error) ok('B no puede responder antes de aceptar la solicitud');
    else bad('B ha escrito sin aceptar');

    const { data: selfAccept } = await users.a.from('conversations').update({ status: 'accepted' }).eq('id', conversationId).select();
    if (!selfAccept || selfAccept.length === 0) ok('A no puede aceptar su propia solicitud');
    else bad('A ha aceptado su propia solicitud');

    const moveIt = await users.b.from('conversations').update({ requested_by: ids.b }).eq('id', conversationId);
    if (moveIt.error) ok('nadie puede cambiar quién pidió la conversación (solo `status` es editable)');
    else bad('se ha podido cambiar requested_by');

    const fake = await users.c.from('conversations').insert({ ...pair('a', 'b'), requested_by: ids.a, status: 'pending' });
    if (fake.error) ok('C no puede abrir conversaciones en nombre de otros');
    else bad('C ha creado una conversación en nombre de A');
  }

  // --- 6. B acepta, y se escriben en tiempo real -----------------------------------------------------
  step('6. B ve la solicitud, la acepta, y se escriben en tiempo real');
  const b = await session('b');
  {
    const { page } = b;
    try {
      await visible(page.getByRole('button', { name: /^Mensajes, 1 (solicitud|sin leer)/ })).waitFor({ timeout: 10000 });
      ok('la cabecera de B avisa de la solicitud nueva');
    } catch {
      const label = await visible(page.getByRole('button', { name: /^Mensajes/ })).getAttribute('aria-label').catch(() => null);
      bad(`la cabecera de B no avisa (dice «${label}»)`);
    }
    await visible(page.getByRole('button', { name: /^Mensajes/ })).click();
    await page.waitForTimeout(2500);
    await page.getByRole('tab', { name: /^Solicitudes/ }).click();
    await page.waitForTimeout(1500);
    await shot(page, '02-solicitudes-de-b');
    await page.getByRole('link', { name: new RegExp(`^Conversación con ${accounts.a.name}`) }).click();
    await page.waitForTimeout(2500);
    await visible(page.getByText('Hola, ¿organizamos una limpieza del Ntem?')).waitFor({ timeout: 8000 });
    ok('B lee el mensaje de la solicitud antes de decidir');
    await page.getByRole('button', { name: 'Aceptar', exact: true }).click();
    await page.waitForTimeout(2500);
    const { data } = await users.b.from('conversations').select('status').eq('id', conversationId).single();
    if (data?.status === 'accepted') ok('aceptada en la base');
    else bad(`el estado es ${data?.status}`);
  }

  // Las dos sesiones abiertas a la vez.
  await a.page.goto(`${origin}/mensajes/${conversationId}`, { waitUntil: 'networkidle' });
  await a.page.waitForTimeout(3000);
  {
    const text = `Perfecto, el sábado a las 9 ${stamp}`;
    await b.page.getByLabel('Escribe un mensaje').fill(text);
    await b.page.getByRole('button', { name: 'Enviar', exact: true }).click();
    const started = Date.now();
    try {
      await visible(a.page.getByText(text)).waitFor({ timeout: 8000 });
      ok(`a A le llega el mensaje de B en tiempo real, sin recargar (${((Date.now() - started) / 1000).toFixed(1)} s)`);
    } catch {
      bad('el mensaje de B no le llega a A sin recargar');
    }
    const reply = `¡Allí estaré! ${stamp}`;
    await a.page.getByLabel('Escribe un mensaje').fill(reply);
    await a.page.getByRole('button', { name: 'Enviar', exact: true }).click();
    try {
      await visible(b.page.getByText(reply)).waitFor({ timeout: 8000 });
      ok('y la respuesta de A le llega a B igual');
    } catch {
      bad('la respuesta de A no le llega a B sin recargar');
    }
    await shot(a.page, '03-conversacion-a');
    await shot(b.page, '04-conversacion-b');
  }

  // --- 7. No leídos ------------------------------------------------------------------------------------
  step('7. No leídos');
  {
    // B sale de la conversación; A le escribe dos mensajes.
    await b.page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await b.page.waitForTimeout(2000);
    await users.a.from('messages').insert([
      { conversation_id: conversationId, sender_id: ids.a, body: `Uno ${stamp}` },
      { conversation_id: conversationId, sender_id: ids.a, body: `Dos ${stamp}` },
    ]);
    try {
      await visible(b.page.getByRole('button', { name: /^Mensajes, 2 sin leer/ })).waitFor({ timeout: 10000 });
      ok('la cabecera de B pasa a «2 sin leer» sola');
    } catch {
      const label = await visible(b.page.getByRole('button', { name: /^Mensajes/ })).getAttribute('aria-label').catch(() => null);
      bad(`la cabecera de B dice «${label}»`);
    }
    await shot(b.page, '05-no-leidos');
    await visible(b.page.getByRole('button', { name: /^Mensajes/ })).click();
    await b.page.waitForTimeout(2000);
    try {
      await b.page.getByRole('link', { name: new RegExp(`^Conversación con ${accounts.a.name}.*2 sin leer`) }).waitFor({ timeout: 6000 });
      ok('en la lista de Chats, la conversación dice «2 sin leer»');
    } catch {
      bad('la lista no marca los no leídos');
    }
    await shot(b.page, '06-lista-chats');
    await b.page.getByRole('link', { name: new RegExp(`^Conversación con ${accounts.a.name}`) }).click();
    await b.page.waitForTimeout(3000);
    const { count } = await users.b
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', ids.b)
      .is('read_at', null);
    if (count === 0) ok('al abrirla, quedan marcados como leídos en la base');
    else bad(`quedan ${count} sin leer tras abrirla`);
    const { data: selfRead } = await users.a.from('messages').update({ read_at: new Date().toISOString() }).eq('sender_id', ids.a).is('read_at', null).select();
    if (!selfRead || selfRead.length === 0) ok('A no puede marcar como leídos sus propios mensajes');
    else bad('A ha marcado como leídos sus propios mensajes');
  }

  // --- 8. C no ve nada en la interfaz ---------------------------------------------------------------
  step('8. C, en la app, no ve nada');
  const c = await session('c');
  {
    const { page, errors } = c;
    await page.goto(`${origin}/mensajes`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    try {
      await visible(page.getByText('Envía una solicitud de mensaje desde el perfil de alguien', { exact: false })).waitFor({ timeout: 6000 });
      ok('su lista está vacía y explica en llano cómo empezar');
    } catch {
      bad('el estado vacío no explica cómo empezar');
    }
    await shot(page, '07-c-sin-mensajes');
    await page.goto(`${origin}/mensajes/${conversationId}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const leaked = await page.getByText(`Perfecto, el sábado a las 9 ${stamp}`).filter({ visible: true }).count();
    if (leaked === 0 && (await page.getByText('No encontramos esta conversación', { exact: false }).count()) > 0) {
      ok('con el enlace directo tampoco: «No encontramos esta conversación»');
    } else {
      bad('C ve la conversación de A y B por enlace');
    }
    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }

  // --- 9. Bloqueo ------------------------------------------------------------------------------------------
  step('9. B bloquea a A: A ya no puede escribirle');
  {
    const { page } = b;
    await page.getByRole('button', { name: 'Opciones de la conversación' }).click();
    await page.getByRole('button', { name: `Bloquear a ${accounts.a.name}` }).click();
    await page.getByRole('button', { name: 'Sí, bloquear' }).click();
    await page.waitForTimeout(2500);
    const { data: blocks } = await users.b.from('blocks').select('blocked_id').eq('blocker_id', ids.b);
    if (blocks?.length === 1 && blocks[0].blocked_id === ids.a) ok('el bloqueo queda en la base');
    else bad(`bloqueos de B: ${JSON.stringify(blocks)}`);
    await shot(page, '08-bloqueado');

    const blockedWrite = await users.a.from('messages').insert({ conversation_id: conversationId, sender_id: ids.a, body: 'sigo aquí' });
    if (blockedWrite.error) ok('A, bloqueado, no puede escribir (RLS)');
    else bad('A ha escrito estando bloqueado');
    const { data: aSeesBlocks } = await users.a.from('blocks').select('*');
    if ((aSeesBlocks ?? []).length === 0) ok('y A no ve quién le ha bloqueado');
    else bad('A ve la tabla de bloqueos de B');

    await a.page.reload({ waitUntil: 'networkidle' });
    await a.page.waitForTimeout(3000);
    if ((await a.page.getByLabel('Escribe un mensaje').count()) === 0) ok('en la app de A desaparece el campo para escribir');
    else bad('A sigue viendo el campo para escribir');
    await shot(a.page, '09-a-no-puede-escribir');
  }
  for (const s of [a, b, c]) await s.context.close();
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.close();
}

// --- 10. Limpieza ----------------------------------------------------------------------------------------
step('10. Limpieza');
try {
  for (const key of ['a', 'b', 'c']) {
    await users[key].from('blocks').delete().eq('blocker_id', ids[key]);
    await users[key].from('profiles').delete().eq('id', ids[key]);
  }
  const { data } = await users.a.from('conversations').select('id').eq('id', conversationId ?? '00000000-0000-0000-0000-000000000000');
  if ((data ?? []).length === 0) ok('perfiles, conversación, mensajes y bloqueos de prueba eliminados');
  else bad('la conversación de prueba sigue en la base');
  info(`quedan 3 usuarios en Authentication → Users (${stamp})`);
} catch (caught) {
  bad(`no se pudo limpiar: ${caught.message}`);
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f46/');
process.exit(failures === 0 ? 0 : 1);
