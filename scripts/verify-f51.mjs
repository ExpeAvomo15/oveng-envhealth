/**
 * Verificación de F5.1: editar el perfil a nivel Instagram, iniciativas
 * creadas por la comunidad y "Quiero participar".
 *
 *   npm run verify:f51                  # construye y recorre
 *   npm run verify:f51 -- --skip-build  # reutiliza dist/
 *   npm run verify:f51 -- --remote      # contra la demo publicada (sin build)
 *
 * 1. Perfil (no necesita migración): desde MI perfil, tocar el avatar abre la
 *    edición; subir una foto apaisada la deja cuadrada; la bio tiene contador y
 *    tope de 150; cerrar la galería sin elegir **no** bloquea Guardar; los
 *    cambios se ven al volver, y están en la base.
 * 2. Iniciativas (necesita la migración 011): RLS en negativo con la clave
 *    publicable, el formulario por la interfaz, la página con «Creada por la
 *    comunidad», en Buscar y en el mapa, y otra cuenta que pulsa «Quiero
 *    participar» y envía el mensaje precargado.
 *
 * Sin la 011 aplicada, la segunda mitad no se puede comprobar: lo dice en
 * grande y la verificación **no** pasa por ella en silencio.
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
await preCleanTestUsers();

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/f51');
const skipBuild = process.argv.includes('--skip-build');
const remote = process.argv.includes('--remote');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

let failures = 0;
let pending = false;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ✗ ${m}`);
};
const info = (m) => console.log(`  · ${m}`);
const step = (m) => console.log(`\n${m}`);
const client = () => createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const anon = client();

// --- Cuentas --------------------------------------------------------------------------
step('Cuentas de prueba');
const stamp = Date.now().toString(36);
const accounts = {};
const users = {};
const ids = {};
for (const key of ['a', 'b']) {
  accounts[key] = {
    email: `oveng-f51${key}-${stamp}@ovengtest.dev`,
    password: `Verif-${stamp}-${key.toUpperCase()}`,
    username: `f51${key}${stamp}`,
    name: key === 'a' ? 'Ana Fundadora' : 'Beto Voluntario',
  };
  users[key] = client();
  const { data, error } = await users[key].auth.signUp({
    email: accounts[key].email,
    password: accounts[key].password,
    options: { data: { username: accounts[key].username, display_name: accounts[key].name } },
  });
  if (error || !data.session) {
    bad(`no se pudo crear la cuenta ${key}: ${error?.message ?? 'sin sesión'}`);
    await finishTestRun(1);
  }
  ids[key] = data.user.id;
}
ok(`A @${accounts.a.username} y B @${accounts.b.username}`);

// --- Build y navegador ----------------------------------------------------------------
let origin = 'https://expeavomo15.github.io/oveng-envhealth';
let server = null;
const basePath = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
if (!remote) {
  step('Construyendo el export web');
  if (!skipBuild) {
    rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
    execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
  }
  const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
  const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
  if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) ok('el bundle apunta al Supabase del .env');
  else bad('el bundle no apunta al Supabase del .env');
  const served = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4211 });
  server = served.server;
  origin = served.origin;
} else info(`contra la demo publicada: ${origin}`);

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const visible = (locator) => locator.filter({ visible: true }).first();
const route = (page) => new URL(page.url()).pathname.replace(basePath, '') || '/';
async function seen(locator, timeout = 8000) {
  try {
    await visible(locator).waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}

async function session(key) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-ES' });
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

/** Una foto apaisada de verdad (1200 × 600), hecha en el propio navegador. */
async function landscapeJpeg(page) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#2E7D32';
    ctx.fillRect(0, 0, 1200, 600);
    ctx.fillStyle = '#FFC107';
    ctx.fillRect(450, 150, 300, 300);
    return canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
  });
  return Buffer.from(base64, 'base64');
}

/** Ancho y alto de una imagen servida, leídos en el navegador. */
async function imageSize(page, src) {
  return page.evaluate(
    (s) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve(null);
        img.src = s;
      }),
    src,
  );
}

try {
  // === 1. Perfil ==========================================================================
  step('1. Editar el perfil desde MI perfil');
  const a = await session('a');
  {
    const { page } = a;
    await page.goto(`${origin}/perfil`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    if (await seen(page.getByRole('button', { name: 'Editar perfil' }))) ok('«Editar perfil» está a la vista en mi perfil');
    else bad('no hay «Editar perfil» en mi perfil');
    await shot(page, '01-mi-perfil');

    if (await seen(page.getByRole('button', { name: 'Cambiar la foto de perfil' }), 3000)) {
      await visible(page.getByRole('button', { name: 'Cambiar la foto de perfil' })).click();
      await page.waitForTimeout(1500);
    }
    if (route(page) === '/editar-perfil') ok('tocar mi avatar lleva a cambiarlo');
    else {
      bad(`tocar el avatar no lleva a cambiarlo (sigue en ${route(page)})`);
      await page.goto(`${origin}/editar-perfil`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
    }

    // Cerrar la galería sin elegir no puede bloquear el formulario (el fallo de F5.1).
    const cancelled = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
    await visible(page.getByRole('button', { name: 'Cambiar foto' })).click();
    await cancelled; // se abre y no se elige nada: ni `change` ni `cancel`
    await page.waitForTimeout(800);
    const stuck = await page.getByText('Subiendo…').filter({ visible: true }).count();
    const bioField = page.getByPlaceholder('Cuenta en una línea qué te mueve');
    await bioField.fill('Limpio playas los sábados 🌊 #Bata');
    const saveDisabled = await visible(page.getByRole('button', { name: 'Guardar cambios' })).isDisabled();
    if (stuck === 0 && !saveDisabled) ok('con la galería abierta sin elegir, ni «Subiendo…» ni Guardar bloqueado');
    else bad(`con la galería sin elegir: «Subiendo…» ${stuck}, Guardar desactivado ${saveDisabled}`);

    if (await seen(page.getByText('34/150'), 3000)) ok('la biografía cuenta los caracteres: «34/150»');
    else bad('la biografía no enseña el contador /150');
    await bioField.fill('x'.repeat(170));
    const length = (await bioField.inputValue()).length;
    if (length === 150) ok('la biografía no admite más de 150 caracteres');
    else bad(`la biografía admite ${length} caracteres`);
    await bioField.fill('Limpio playas los sábados 🌊 #Bata');

    // Una foto apaisada: se sube y queda cuadrada.
    const photo = await landscapeJpeg(page);
    const chooser = page.waitForEvent('filechooser', { timeout: 5000 });
    await visible(page.getByRole('button', { name: 'Cambiar foto' })).click();
    await (await chooser).setFiles({ name: 'IMG_2026.jpg', mimeType: 'image/jpeg', buffer: photo });
    await page.waitForTimeout(5000);
    await shot(page, '02-editar-con-foto');
    const { data: withAvatar } = await anon.from('profiles').select('avatar_url').eq('id', ids.a).single();
    if (withAvatar?.avatar_url) {
      ok('la foto se sube a Storage y queda en el perfil');
      const size = await imageSize(page, withAvatar.avatar_url);
      if (size && size.w === size.h && size.w <= 512) ok(`y queda cuadrada: ${size.w} × ${size.h}`);
      else bad(`la foto no queda cuadrada: ${JSON.stringify(size)}`);
    } else bad('la foto no llega al perfil');

    await visible(page.getByRole('button', { name: 'Guardar cambios' })).click();
    await page.waitForTimeout(3500);
    if (route(page) === '/perfil') ok('Guardar vuelve a mi perfil');
    else bad(`Guardar lleva a ${route(page)}`);
    if (await seen(page.getByText('Limpio playas los sábados 🌊 #Bata'), 5000)) ok('la bio nueva se ve al instante');
    else bad('la bio nueva no se ve al volver');
    const avatarImgs = await page.locator('img[src*="/avatars/"]').filter({ visible: true }).count();
    if (avatarImgs > 0) ok('y la foto también');
    else bad('la foto no se ve en mi perfil al volver');
    await shot(page, '03-perfil-actualizado');
    const { data: saved } = await anon.from('profiles').select('bio').eq('id', ids.a).single();
    if (saved?.bio === 'Limpio playas los sábados 🌊 #Bata') ok('la bio está en la base, con su emoji');
    else bad(`la base dice bio = ${JSON.stringify(saved?.bio)}`);
  }

  // === 2. Iniciativas =======================================================================
  step('2. ¿Está aplicada la migración 011?');
  const { error: missing } = await anon.from('entities').select('created_by').limit(1);
  if (missing) {
    pending = true;
    console.log('\n  ⚠⚠ PENDIENTE: la migración 011 no está aplicada (' + missing.code + ').');
    console.log('  ⚠⚠ Crear iniciativas y «Quiero participar» no se pueden comprobar todavía.');
    console.log('  ⚠⚠ Aplica supabase/migrations/011_community_initiatives.sql y repite.');
    const { page } = a;
    await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    if ((await page.getByRole('button', { name: 'Crea tu iniciativa' }).count()) === 0) ok('sin la 011, «Crea tu iniciativa» no se ofrece');
    else bad('sin la 011, se ofrece «Crea tu iniciativa» y fallaría');
  } else {
    ok('entities.created_by existe');

    step('3. RLS en negativo, con la clave publicable');
    const tryInsert = (who, row) =>
      who.from('entities').insert({ name: `Prueba ${stamp}`, category: 'residuos', ...row }).select('id');
    const neg = [
      ['un anónimo no crea nada', anon, { slug: `f51-anon-${stamp}`, type: 'iniciativa' }],
      ['nadie crea una empresa', users.a, { slug: `f51-emp-${stamp}`, type: 'empresa', created_by: ids.a }],
      ['nadie crea un lugar', users.a, { slug: `f51-lug-${stamp}`, type: 'lugar', created_by: ids.a }],
      ['nadie crea en nombre de otra cuenta', users.a, { slug: `f51-otro-${stamp}`, type: 'iniciativa', created_by: ids.b }],
      ['nadie crea una iniciativa sin dueña', users.a, { slug: `f51-sin-${stamp}`, type: 'iniciativa' }],
      ['nadie se crea una verificada', users.a, { slug: `f51-ver-${stamp}`, type: 'iniciativa', created_by: ids.a, verified: true }],
      ['nadie pone un enlace', users.a, { slug: `f51-web-${stamp}`, type: 'iniciativa', created_by: ids.a, website: 'https://spam.example' }],
    ];
    for (const [label, who, row] of neg) {
      const { error } = await tryInsert(who, row);
      if (error) ok(label);
      else bad(`${label}: ¡ha entrado!`);
    }

    // Una de A por la API, para probar lo de editar y reclamar.
    const { data: viaApi, error: apiError } = await tryInsert(users.a, {
      slug: `f51-api-${stamp}`,
      type: 'iniciativa',
      created_by: ids.a,
    });
    if (apiError) bad(`A no puede crear su iniciativa: ${apiError.message}`);
    const apiId = viaApi?.[0]?.id;
    const { data: autoAdmin } = await anon.from('entity_admins').select('user_id').eq('entity_id', apiId);
    if (autoAdmin?.length === 1 && autoAdmin[0].user_id === ids.a) ok('quien la crea queda como administradora, sola');
    else bad(`administradores de la nueva: ${JSON.stringify(autoAdmin)}`);
    const { data: stolen } = await users.b.from('entities').update({ name: 'Robada' }).eq('id', apiId).select('id');
    if (!stolen || stolen.length === 0) ok('otra cuenta no edita una iniciativa ajena');
    else bad('B ha editado la iniciativa de A');
    const { error: claimError } = await users.b.from('entity_admins').insert({ entity_id: apiId, user_id: ids.b });
    if (claimError) ok('una iniciativa de la comunidad no se puede reclamar');
    else bad('B ha reclamado la iniciativa de A');
    const { data: curated } = await anon.from('entities').select('id').is('created_by', null).limit(1).single();
    const { data: touched } = await users.a.from('entities').update({ name: 'Hackeada' }).eq('id', curated.id).select('id');
    if (!touched || touched.length === 0) ok('nadie edita una entidad curada');
    else bad('A ha editado una entidad curada');
    const { error: typeError } = await users.a.from('entities').update({ type: 'empresa' }).eq('id', apiId);
    if (typeError) ok('ni su administradora le cambia el tipo (permiso de columna)');
    else bad('A ha cambiado el tipo de su iniciativa');
    // Tres al día: la de la API y dos más; la cuarta no entra.
    for (const n of [2, 3]) await tryInsert(users.a, { slug: `f51-n${n}-${stamp}`, type: 'iniciativa', created_by: ids.a });
    const { error: fourth } = await tryInsert(users.a, { slug: `f51-n4-${stamp}`, type: 'iniciativa', created_by: ids.a });
    if (fourth && /tres iniciativas/.test(fourth.message)) ok('la cuarta del día no entra: «Ya has creado tres iniciativas hoy»');
    else bad(`la cuarta del día: ${fourth?.message ?? 'ha entrado'}`);

    step('4. B crea la suya por la interfaz');
    const b = await session('b');
    const NAME = `Huerto del barrio ${stamp}`;
    let slug = null;
    {
      const { page } = b;
      await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
      await visible(page.getByRole('button', { name: 'Crea tu iniciativa' })).click();
      await page.waitForTimeout(1500);
      await shot(page, '04-formulario-vacio');
      await page.getByPlaceholder('Limpieza de la playa de Bata').fill(NAME);
      await page.getByPlaceholder(/Quedamos un sábado/).fill('Plantamos y regamos juntos los domingos. Ven con ganas 🌱');
      await visible(page.getByRole('radio', { name: 'Biodiversidad' })).click();
      await page.getByPlaceholder('Bata, Málaga, Duala…').fill('Bata');
      await visible(page.getByRole('button', { name: /^Bata, / })).click({ timeout: 10000 });
      const cover = page.waitForEvent('filechooser', { timeout: 5000 });
      await visible(page.getByRole('button', { name: 'Añadir foto' })).click();
      await (await cover).setFiles({ name: 'huerto.jpg', mimeType: 'image/jpeg', buffer: await landscapeJpeg(page) });
      await page.waitForTimeout(800);
      await shot(page, '05-formulario-relleno');
      await visible(page.getByRole('button', { name: 'Crear iniciativa' })).dblclick();
      await page.waitForTimeout(5000);
      const { data: mine } = await anon.from('entities').select('slug, type, lat, lng, cover_image_url, created_by').eq('created_by', ids.b);
      if (mine?.length === 1) ok('doble toque en «Crear iniciativa» crea UNA');
      else bad(`B tiene ${mine?.length ?? 0} iniciativas`);
      slug = mine?.[0]?.slug ?? null;
      if (mine?.[0]?.type === 'iniciativa' && mine[0].lat && mine[0].cover_image_url) ok('es una iniciativa, con coordenadas de Bata y foto');
      else bad(`la fila: ${JSON.stringify(mine?.[0])}`);
      if (route(page) === `/entidad/${slug}`) ok('y se abre su página');
      else bad(`tras crear, la app está en ${route(page)}`);
      if (await seen(page.getByText('Creada por la comunidad'))) ok('con la etiqueta «Creada por la comunidad»');
      else bad('falta la etiqueta «Creada por la comunidad»');
      if (await seen(page.getByRole('button', { name: 'Editar página' }))) ok('y quien la creó puede editarla y publicar voluntariados');
      else bad('quien la creó no ve «Editar página»');
      if ((await page.getByRole('button', { name: 'Quiero participar' }).count()) === 0) ok('a quien la administra no se le ofrece «Quiero participar»');
      else bad('a la propia administradora se le ofrece participar');
      await shot(page, '06-pagina-nueva');
    }

    step('5. Aparece en Buscar y en el mapa (sin cuenta)');
    const visitor = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES' });
    const vp = await visitor.newPage();
    await vp.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
    await vp.getByPlaceholder(/Buscar/).first().fill(`Huerto del barrio ${stamp}`);
    if (await seen(vp.getByText(NAME), 10000)) ok('Buscar la encuentra');
    else bad('Buscar no la encuentra');
    await shot(vp, '07-buscar');
    await vp.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    if (await seen(vp.getByRole('button', { name: `${NAME}, en el mapa` }), 20000)) ok('y el mapa la pinta como un pin más');
    else bad('el mapa no la pinta');
    await shot(vp, '08-mapa');
    await visitor.close();

    step('6. A quiere participar en la de B');
    {
      const { page } = a;
      await page.goto(`${origin}/entidad/${slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await visible(page.getByRole('button', { name: 'Quiero participar' })).click();
      await page.waitForTimeout(3000);
      if (route(page).startsWith('/mensajes/')) ok('«Quiero participar» abre un chat con quien la administra');
      else bad(`«Quiero participar» lleva a ${route(page)}`);
      const draft = await page.getByPlaceholder('Escribe un mensaje…').inputValue().catch(() => '');
      if (draft === `Hola, quiero participar en ${NAME}.`) ok(`con el mensaje precargado: «${draft}»`);
      else bad(`el mensaje precargado es «${draft}»`);
      await shot(page, '09-chat-precargado');
      await page.getByPlaceholder('Escribe un mensaje…').press('Enter');
      await page.waitForTimeout(2500);
      const { data: convo } = await users.b
        .from('conversations')
        .select('id, status, requested_by')
        .or(`user_low.eq.${ids.a},user_high.eq.${ids.a}`)
        .maybeSingle();
      const { data: msgs } = convo
        ? await users.b.from('messages').select('body, sender_id').eq('conversation_id', convo.id)
        : { data: [] };
      if (convo?.status === 'pending' && convo.requested_by === ids.a && msgs?.[0]?.body === `Hola, quiero participar en ${NAME}.`) {
        ok('a B le llega como solicitud de mensaje, con el texto');
      } else bad(`conversación ${JSON.stringify(convo)}, mensajes ${JSON.stringify(msgs)}`);
    }

    step('7. Sin cuenta, participar pide entrar');
    {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES' });
      const page = await ctx.newPage();
      await page.goto(`${origin}/entidad/${slug}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2000);
      await visible(page.getByRole('button', { name: 'Inicia sesión para participar' })).click();
      await page.waitForTimeout(1500);
      if (route(page) === '/welcome') ok('«Inicia sesión para participar» lleva a la bienvenida');
      else bad(`lleva a ${route(page)}`);
      await ctx.close();
    }
  }

  if (a.errors.length > 0) bad(`errores de página: ${[...new Set(a.errors)].join(' | ').slice(0, 300)}`);
} catch (error) {
  bad(`recorrido interrumpido: ${error.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server?.close();
}

console.log('\n' + '─'.repeat(64));
if (failures > 0) console.log(`RESULTADO: ${failures} fallo(s).`);
else if (pending) console.log('RESULTADO: perfil correcto. Iniciativas PENDIENTES de la migración 011.');
else console.log('RESULTADO: todo correcto.');
console.log(`Capturas en ${SHOTS.replace(ROOT + '/', '')}/`);
await finishTestRun(failures > 0 ? 1 : 0);
