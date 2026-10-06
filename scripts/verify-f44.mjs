/**
 * Verificación de F4.4: feed denso, Turismo Verde con publicaciones
 * etiquetadas, y páginas administradas por personas con ofertas de empleo.
 *
 *   npm run verify:f44                  # construye y verifica
 *   npm run verify:f44 -- --skip-build  # reutiliza dist/
 *
 * Necesita las migraciones 005, 006 y 007 aplicadas y `npm run seed:jobs`
 * cargado; si falta algo, la primera sección lo dice y para.
 *
 * Crea dos cuentas de prueba —A, que reclama EcoGuinea, y B, que no administra
 * nada— y las limpia al terminar: ofertas, claim, publicaciones y perfiles.
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
const SHOTS = join(ROOT, 'docs/verificacion/f44');
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

const anon = createClient(url, anonKey, { auth: { persistSession: false } });
const client = () =>
  createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

// --- 1. La base está lista ---------------------------------------------------------------
step('1. Migraciones 005, 006 y 007 aplicadas, y ofertas de ejemplo cargadas');

let ready = true;
{
  // GET y no HEAD: una consulta de solo recuento a una tabla que no existe NO
  // da error —responde 204 con count nulo—, y daría la tabla por existente.
  const admins = await anon.from('entity_admins').select('entity_id').limit(1);
  if (admins.error) {
    bad(`entity_admins no responde (${admins.error.code}): falta la migración 005`);
    ready = false;
  } else ok('entity_admins existe y se lee sin cuenta');

  const jobs = await anon.from('jobs').select('id, created_by, type, active');
  if (jobs.error) {
    bad(`jobs no responde (${jobs.error.code}): falta la migración 006`);
    ready = false;
  } else {
    const examples = jobs.data.filter((job) => job.created_by === null);
    const types = new Set(examples.map((job) => job.type));
    if (examples.length >= 6 && types.has('voluntariado') && types.has('practicas')) {
      ok(`${examples.length} ofertas de ejemplo, con voluntariado y prácticas`);
    } else {
      bad(`hay ${examples.length} ofertas de ejemplo (tipos: ${[...types].join(', ')}): ¿falta npm run seed:jobs?`);
      ready = false;
    }
  }

  const column = await anon.from('posts').select('entity_id').limit(1);
  if (column.error) {
    bad(`posts.entity_id no existe (${column.error.code}): falta la migración 007`);
    ready = false;
  } else ok('posts.entity_id existe');
}
if (!ready) {
  console.log('\nRESULTADO: la base no está lista. Aplica las migraciones y el seed (docs/03_MODELO_DATOS.md).');
  process.exit(1);
}

const { data: entityRows } = await anon.from('entities').select('id, slug, name, type');
const bySlug = new Map(entityRows.map((entity) => [entity.slug, entity]));
const ecoguinea = bySlug.get('ecoguinea');
const monteAlen = bySlug.get('parque-nacional-monte-alen');

// --- 2. Cuentas ---------------------------------------------------------------------------
step('2. Cuentas de prueba');

const stamp = Date.now().toString(36);
const accounts = {
  a: { email: `oveng-f44a-${stamp}@ovengtest.dev`, password: `Verif-${stamp}-A`, username: `f44a${stamp}`, name: 'Admin de prueba F4.4' },
  b: { email: `oveng-f44b-${stamp}@ovengtest.dev`, password: `Verif-${stamp}-B`, username: `f44b${stamp}`, name: 'Cuenta B de prueba F4.4' },
};
const users = { a: client(), b: client() };
const ids = {};
for (const key of ['a', 'b']) {
  const account = accounts[key];
  const { data, error } = await users[key].auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { username: account.username, display_name: account.name } },
  });
  if (error || !data.session) {
    bad(`no se pudo crear la cuenta ${key}: ${error?.message ?? 'sin sesión'}`);
    process.exit(1);
  }
  ids[key] = data.user.id;
}
ok(`@${accounts.a.username} (A) y @${accounts.b.username} (B)`);

// --- 3. RLS: lo que nadie puede hacer --------------------------------------------------------
step('3. RLS: claims y ofertas solo como deben');

{
  const asSuper = await users.b.from('entity_admins').insert({ entity_id: ecoguinea.id, user_id: ids.b, role: 'super_admin' });
  if (asSuper.error) ok('B no puede crearse super_admin: la política fuerza role = admin');
  else bad('B se ha creado super_admin');

  const asPending = await users.b.from('entity_admins').insert({ entity_id: ecoguinea.id, user_id: ids.b, status: 'pending' });
  if (asPending.error) ok('B no puede elegir su status: la política fuerza approved');
  else bad('B ha insertado un claim con otro status');

  const forOther = await users.b.from('entity_admins').insert({ entity_id: ecoguinea.id, user_id: ids.a });
  if (forOther.error) ok('B no puede reclamar en nombre de A');
  else bad('B ha reclamado en nombre de A');

  const notAdmin = await users.b.from('jobs').insert({
    entity_id: ecoguinea.id,
    created_by: ids.b,
    title: 'Oferta intrusa',
    description: 'No debería poder publicarse porque B no administra EcoGuinea.',
    type: 'completa',
    how_to_apply: 'intruso@ovengtest.dev',
  });
  if (notAdmin.error) ok('B, sin administrar EcoGuinea, NO puede publicar una oferta suya');
  else bad('B ha publicado una oferta sin administrar la página');

  const anonJob = await anon.from('jobs').insert({
    entity_id: ecoguinea.id,
    title: 'Oferta anónima',
    description: 'Sin cuenta no se publica nada.',
    type: 'completa',
    how_to_apply: 'anonimo@ovengtest.dev',
  });
  if (anonJob.error) ok('sin cuenta no se publica nada');
  else bad('se ha publicado una oferta sin cuenta');
}

// --- 4. Build ----------------------------------------------------------------------------------
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
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4197 });
const browser = await chromium.launch();

async function newPage(viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport, locale: 'es-ES' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, errors };
}
const shot = (page, name, fullPage = false) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage });
const route = (page) => new URL(page.url()).pathname.replace(basePath, '') || '/';
const visible = (locator) => locator.filter({ visible: true }).first();

async function login(page, account) {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(account.email);
  await page.getByPlaceholder('Tu contraseña').fill(account.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3500);
}

let jobId = null;
const JOB_TITLE = `Guía de senderos solares ${stamp}`;
const POST_TEXT = `Mañana de sendero en Monte Alén ${stamp}`;

try {
  // --- 5. Reclamar EcoGuinea -------------------------------------------------------------------
  step('5. A reclama EcoGuinea desde su página');

  const a = await newPage();
  {
    const { page } = a;
    await login(page, accounts.a);
    await page.goto(`${origin}/entidad/ecoguinea`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    await visible(page.getByRole('button', { name: 'Gestionar esta página' })).click();
    await page.getByText('Es público: cualquiera verá que administras esta página', { exact: false }).waitFor({ timeout: 5000 });
    ok('el modal explica qué podrá hacer y que el claim es público');
    await shot(page, '01-reclamar-ecoguinea');
    await page.getByRole('button', { name: 'Sí, gestionar esta página' }).click();
    await page.waitForTimeout(2500);

    const { data } = await users.a.from('entity_admins').select('role, status').eq('entity_id', ecoguinea.id).eq('user_id', ids.a);
    if (data?.length === 1 && data[0].role === 'admin' && data[0].status === 'approved') ok('queda admin al instante (admin / approved) en la base');
    else bad(`el claim en la base: ${JSON.stringify(data)}`);

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    try {
      await visible(page.getByLabel('Administras esta página')).waitFor({ timeout: 8000 });
      await page.getByText('La verificación de administradores llegará pronto', { exact: false }).first().waitFor({ timeout: 3000 });
      ok('tras recargar: «Administras esta página» y el aviso honesto de verificación');
    } catch {
      bad('el claim no persiste en la página tras recargar');
    }
    await shot(page, '02-administras-esta-pagina');
  }

  // --- 6. Publicar, editar y cerrar una oferta ------------------------------------------------------
  step('6. A publica, edita y cierra una oferta');

  {
    const { page } = a;
    await visible(page.getByRole('button', { name: 'Publicar oferta' })).click();
    await page.waitForTimeout(2500);
    await page.getByLabel('Título de la oferta').fill(JOB_TITLE);
    await page.getByLabel('Descripción de la oferta').fill('Acompañarás a grupos por senderos de Bioko explicando cómo funciona la energía solar de las aldeas.');
    await page.getByRole('radio', { name: 'Media jornada' }).click();
    await page.getByLabel('Cómo aplicar').fill('esto no es un email');
    await page.getByRole('button', { name: 'Publicar oferta' }).click();
    try {
      await page.getByText('Pon un email (nombre@dominio.com) o un enlace', { exact: false }).waitFor({ timeout: 4000 });
      ok('«Cómo aplicar» sin email ni enlace: lo dice en llano y no publica');
    } catch {
      bad('la validación de «Cómo aplicar» no avisa');
    }
    await page.getByLabel('Cómo aplicar').fill('empleo@ovengtest.dev');
    await shot(page, '03-formulario-oferta');
    await page.getByRole('button', { name: 'Publicar oferta' }).click();
    await page.waitForTimeout(3500);

    const { data } = await users.a.from('jobs').select('id, created_by, type, active, title').eq('title', JOB_TITLE);
    if (data?.length === 1 && data[0].created_by === ids.a && data[0].type === 'parcial') {
      jobId = data[0].id;
      ok('la oferta quedó en la base, a nombre de A, de media jornada');
    } else {
      bad(`la oferta en la base: ${JSON.stringify(data)}`);
    }
    if (route(page) === '/entidad/ecoguinea') ok('y vuelve a la página de EcoGuinea');
    else bad(`tras publicar, la ruta es ${route(page)}`);

    // Editar.
    await visible(page.getByRole('button', { name: 'Editar' })).click();
    await page.waitForTimeout(2500);
    await page.getByLabel('Título de la oferta').fill(`${JOB_TITLE} (editada)`);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await page.waitForTimeout(3000);
    {
      const { data: edited } = await users.a.from('jobs').select('title').eq('id', jobId).single();
      if (edited?.title === `${JOB_TITLE} (editada)`) ok('editar cambia el título en la base');
      else bad(`tras editar, el título es ${edited?.title}`);
    }

    // B no puede tocarla aunque lo intente.
    {
      const { data: hijack } = await users.b.from('jobs').update({ title: 'Secuestrada' }).eq('id', jobId).select();
      if (!hijack || hijack.length === 0) ok('B no puede editar la oferta de A (RLS filtra la actualización)');
      else bad('B ha editado la oferta de A');
    }
  }

  // --- 7. Sin cuenta: Empleo en Buscar y el detalle -----------------------------------------------------
  step('7. Sin cuenta: Buscar → Empleo lista las ofertas y lleva al detalle');

  const visitor = await newPage();
  {
    const { page, errors } = visitor;
    await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Empleo' }).click();
    await page.waitForTimeout(3000);
    try {
      await page.getByRole('link', { name: new RegExp(`^Oferta: ${JOB_TITLE} \\(editada\\), en EcoGuinea`) }).waitFor({ timeout: 8000 });
      ok('la oferta de A aparece en Buscar → Empleo');
    } catch {
      bad('la oferta de A no aparece en Empleo');
    }
    const examples = await page.getByRole('link', { name: /Oferta de ejemplo$/ }).count();
    if (examples >= 6) ok(`y ${examples} ofertas de ejemplo, marcadas como tales`);
    else bad(`solo ${examples} ofertas de ejemplo en la lista`);
    await shot(page, '04-buscar-empleo');

    await page.getByRole('link', { name: new RegExp(`^Oferta: ${JOB_TITLE}`) }).click();
    await page.waitForTimeout(2500);
    if (route(page) === `/empleo/${jobId}`) ok('el detalle se abre sin cuenta');
    else bad(`el detalle lleva a ${route(page)}`);
    await page.getByRole('button', { name: 'Cómo aplicar' }).click();
    try {
      await page.getByText('Vas a salir de OVENG').waitFor({ timeout: 4000 });
      ok('«Cómo aplicar» avisa antes de salir de OVENG');
    } catch {
      bad('«Cómo aplicar» no avisa de que se sale');
    }
    await shot(page, '05-detalle-oferta-aviso');
    await page.getByRole('button', { name: 'Quedarme en OVENG' }).click();
    await page.getByRole('link', { name: 'Ver la página de EcoGuinea' }).click();
    await page.waitForTimeout(2500);
    if (route(page) === '/entidad/ecoguinea') ok('la entidad de la oferta lleva a su página');
    else bad(`la entidad lleva a ${route(page)}`);
    try {
      await visible(page.getByText('Empleo', { exact: true })).waitFor({ timeout: 6000 });
      ok('y la página de EcoGuinea tiene su sección «Empleo»');
    } catch {
      bad('la página de EcoGuinea no enseña «Empleo»');
    }

    // Una oferta de ejemplo no ofrece aplicar.
    const { data: example } = await anon.from('jobs').select('id').is('created_by', null).limit(1).single();
    await page.goto(`${origin}/empleo/${example.id}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const exampleSays = await page.getByText('No es una oferta real', { exact: false }).count();
    const exampleApply = await page.getByRole('button', { name: 'Cómo aplicar' }).count();
    if (exampleSays > 0 && exampleApply === 0) ok('una oferta de ejemplo lo dice y no ofrece aplicar');
    else bad('la oferta de ejemplo no se distingue de una real');

    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }

  // --- 8. Cerrar la oferta --------------------------------------------------------------------------------
  step('8. A cierra la oferta: deja de verse en Empleo');

  {
    const { page } = a;
    await page.goto(`${origin}/entidad/ecoguinea`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    await visible(page.getByRole('button', { name: 'Cerrar oferta' })).click();
    await page.waitForTimeout(2500);
    const { data } = await users.a.from('jobs').select('active').eq('id', jobId).single();
    if (data?.active === false) ok('desactivada en la base');
    else bad('la oferta sigue activa');
    const { data: publicJobs } = await anon.from('jobs').select('id').eq('id', jobId);
    if (publicJobs?.length === 0) ok('y sin cuenta ya no se ve');
    else bad('una oferta cerrada sigue siendo pública');
  }

  // --- 9. Páginas que administras --------------------------------------------------------------------------
  step('9. Perfil propio: «Páginas que administras»');
  {
    const { page } = a;
    // Por URL: la página de una entidad no tiene barra de pestañas.
    await page.goto(`${origin}/perfil`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    try {
      await page.getByRole('link', { name: 'Página que administras: EcoGuinea' }).waitFor({ timeout: 8000 });
      ok('EcoGuinea aparece, con enlace a su página');
    } catch {
      bad('falta la sección «Páginas que administras»');
    }
    await shot(page, '06-paginas-que-administras');
  }

  // --- 10. Turismo Verde: etiquetar un lugar -----------------------------------------------------------------
  step('10. Turismo Verde: A publica etiquetando Monte Alén');
  {
    const { page } = a;
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.getByRole('button', { name: 'Crear publicación' }).click();
    await page.waitForTimeout(1600);
    await page.getByLabel('Texto de la publicación').fill(POST_TEXT);
    await page.getByRole('button', { name: 'Etiquetar un lugar' }).click();
    await page.getByLabel('Buscar un lugar para etiquetar').fill('monte');
    await page.getByRole('button', { name: 'Etiquetar en Parque Nacional de Monte Alén' }).click();
    await shot(page, '07-compositor-con-lugar');
    await page.getByText('Publicar', { exact: true }).first().click();
    await page.waitForTimeout(4000);

    const { data } = await anon.from('posts').select('entity_id').eq('content', POST_TEXT);
    if (data?.length === 1 && data[0].entity_id === monteAlen.id) ok('la publicación guarda el lugar (posts.entity_id)');
    else bad(`la publicación en la base: ${JSON.stringify(data)}`);

    // Dos publicaciones más para ver la densidad del feed.
    await users.a.from('posts').insert([
      { author_id: ids.a, content: `Primera nota del feed denso ${stamp}` },
      { author_id: ids.a, content: `Segunda nota del feed denso ${stamp}` },
    ]);
  }

  const place = await newPage();
  {
    const { page, errors } = place;
    // Desde F4.5 el chip abre la pantalla de Turismo Verde por ubicación; sin
    // punto elegido lista todos los lugares (lo demás lo verifica verify:f45).
    await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Turismo Verde' }).click();
    await page.waitForTimeout(3000);
    const lugares = entityRows.filter((entity) => entity.type === 'lugar').map((entity) => entity.name);
    const labels = (await Promise.all((await page.getByRole('link', { name: /\. Ver el lugar$/ }).all()).map((row) => row.getAttribute('aria-label'))))
      .filter(Boolean)
      .map((label) => label.replace(/\. Ver el lugar$/, ''));
    const onScreen = new Set(labels);
    if (route(page) === '/turismo-verde' && lugares.every((name) => onScreen.has(name)) && onScreen.size === lugares.length) {
      ok(`sin cuenta, el chip Turismo Verde abre su pantalla con los ${lugares.length} lugares`);
    } else {
      bad(`el chip Turismo Verde: ruta ${route(page)}, enseña ${onScreen.size} de ${lugares.length}`);
    }
    await shot(page, '08-buscar-turismo-verde');

    await page.goto(`${origin}/entidad/parque-nacional-monte-alen`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);
    try {
      await page.getByText(POST_TEXT).first().waitFor({ timeout: 8000 });
      ok('la publicación sale en «Publicaciones» del perfil de Monte Alén, sin cuenta');
    } catch {
      bad('la publicación etiquetada no sale en el perfil del lugar');
    }
    await page.getByText(POST_TEXT).first().scrollIntoViewIfNeeded();
    await shot(page, '09-monte-alen-publicaciones');

    await visible(page.getByRole('button', { name: 'Ver en el mapa' })).click();
    await page.waitForTimeout(5000);
    try {
      await page.getByRole('link', { name: /Abrir la ficha de Parque Nacional de Monte Alén/ }).waitFor({ timeout: 8000 });
      ok('«Para tu visita» abre el mapa centrado en Monte Alén con su tarjeta');
    } catch {
      bad('«Ver en el mapa» no abre el lugar en el mapa');
    }
    await shot(page, '10-para-tu-visita-mapa');

    // El pin del lugar en una publicación del feed.
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    try {
      await page.getByRole('link', { name: 'En Parque Nacional de Monte Alén. Ver el lugar' }).first().click();
      await page.waitForTimeout(2500);
      if (route(page) === '/entidad/parque-nacional-monte-alen') ok('en el feed, el pin del lugar lleva a su perfil');
      else bad(`el pin lleva a ${route(page)}`);
    } catch {
      bad('la publicación del feed no enseña el pin del lugar');
    }
    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }

  // --- 11. Feed denso -------------------------------------------------------------------------------------
  step('11. El feed fluye sin huecos (móvil y escritorio)');
  for (const [name, viewport] of [
    ['movil', { width: 390, height: 844 }],
    ['escritorio', { width: 1280, height: 900 }],
  ]) {
    const { page, context } = await newPage(viewport);
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    const boxes = [];
    for (const author of await page.getByRole('link', { name: /^Perfil de / }).all()) {
      const box = await author.boundingBox();
      if (box) boxes.push(box);
    }
    // Entre dos publicaciones seguidas no hay fondo: la siguiente empieza
    // donde acaba la anterior (relleno interno + la línea de un píxel).
    const texts = await page.getByText(new RegExp(`nota del feed denso ${stamp}`)).all();
    if (texts.length >= 2) {
      const first = await texts[0].boundingBox();
      const second = await texts[1].boundingBox();
      const gap = second.y - (first.y + first.height);
      if (gap < 140) ok(`${name}: dos publicaciones seguidas, separadas solo por las acciones y una línea (${Math.round(gap)} px de texto a texto)`);
      else bad(`${name}: hueco grande entre publicaciones (${Math.round(gap)} px)`);
    } else {
      bad(`${name}: no se ven dos publicaciones seguidas`);
    }
    const list = await page.getByRole('link', { name: 'Ver la publicación' }).first().boundingBox();
    const maxWidth = Math.min(viewport.width, 640);
    if (list && Math.abs(list.width - maxWidth) <= 2) ok(`${name}: la publicación ocupa todo el ancho de la columna (${Math.round(list.width)} px)`);
    else bad(`${name}: la publicación mide ${list?.width} px y la columna ${maxWidth}`);
    info(`${boxes.length} publicaciones en la primera pantalla`);
    await shot(page, `11-feed-${name}`);
    await context.close();
  }
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.close();
}

// --- 12. Limpieza ------------------------------------------------------------------------------------------
step('12. Limpieza');
try {
  if (jobId) await users.a.from('jobs').delete().eq('id', jobId);
  await users.a.from('entity_admins').delete().eq('user_id', ids.a);
  for (const key of ['a', 'b']) {
    await users[key].from('posts').delete().eq('author_id', ids[key]);
    await users[key].from('profiles').delete().eq('id', ids[key]);
  }
  const { count } = await anon.from('entity_admins').select('*', { count: 'exact', head: true }).eq('user_id', ids.a);
  if (count === 0) ok('oferta, claim, publicaciones y perfiles de prueba eliminados');
  else bad(`quedan ${count} claims de prueba`);
  info(`quedan 2 usuarios en Authentication → Users: ${accounts.a.email}, ${accounts.b.email}`);
} catch (caught) {
  bad(`no se pudo limpiar: ${caught.message}`);
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f44/');
process.exit(failures === 0 ? 0 : 1);
