/**
 * Recorrido completo de la demo: lo que haría un visitante real.
 *
 *   npm run verify:demo                  # construye y recorre
 *   npm run verify:demo -- --skip-build  # reutiliza dist/
 *
 * Dos mitades, y el orden importa: primero **sin cuenta**, que es como llega
 * cualquiera, y después el ciclo completo **con cuenta**. Las capturas
 * numeradas de docs/verificacion/demo/ son el guion para enseñar la demo.
 *
 * Crea una cuenta de prueba y la limpia al terminar.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/demo');
const skipBuild = process.argv.includes('--skip-build');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

let failures = 0;
let shotIndex = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ✗ ${m}`);
};
const info = (m) => console.log(`  · ${m}`);
const step = (m) => console.log(`\n${m}`);

const anon = createClient(url, anonKey, { auth: { persistSession: false } });

// --- Build --------------------------------------------------------------------
step('Construyendo el export web');

if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}

const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
const bundleFile = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
const bundleBytes = bundleFile ? statSync(join(bundleDir, bundleFile)).size : 0;

if (bundleFile && readFileSync(join(bundleDir, bundleFile), 'utf8').includes(url)) {
  ok('el bundle apunta al Supabase del .env');
} else {
  bad('el bundle no apunta al Supabase del .env (¿caché de Metro?)');
}
info(`bundle del cliente: ${(bundleBytes / 1024 / 1024).toFixed(2)} MB`);

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4185 });
const browser = await chromium.launch();

const newPage = async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'es-ES',
  });
  return context.newPage();
};

/** Capturas numeradas por orden de recorrido: son el guion de la demo. */
async function shot(page, name) {
  shotIndex += 1;
  await page.screenshot({
    path: join(SHOTS, `${String(shotIndex).padStart(2, '0')}-${name}.png`),
  });
}

const route = (page) => new URL(page.url()).pathname.replace(basePath, '') || '/';

async function expectRole(page, role, name, label, timeout = 15000) {
  try {
    await page.getByRole(role, { name }).first().waitFor({ state: 'visible', timeout });
    ok(label);
    return true;
  } catch {
    bad(`${label} — no apareció ${role} «${name}»`);
    return false;
  }
}

async function expectLabel(page, name, label, timeout = 15000) {
  try {
    await page.getByLabel(name, { exact: false }).first().waitFor({ state: 'visible', timeout });
    ok(label);
  } catch {
    bad(`${label} — no apareció nada con nombre accesible «${name}»`);
  }
}

const stamp = Date.now().toString(36);
const account = {
  email: `oveng-demo-${stamp}@ovengtest.dev`,
  password: `Verif-${stamp}-2026`,
  username: `demo${stamp}`.slice(0, 30).toLowerCase(),
  displayName: 'Visitante de la demo',
};
let uid = null;
const user = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

try {
  // =========================================================================
  // SIN SESIÓN — cómo llega cualquiera
  // =========================================================================
  step('SIN SESIÓN · 1. Abrir la demo');

  const visitor = await newPage();
  const t0 = Date.now();
  await visitor.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await visitor.waitForTimeout(3500);

  if (route(visitor) === '/') ok('la demo abre directamente en el feed, sin muro de registro');
  else bad(`la demo abre en ${route(visitor)}`);

  await expectRole(visitor, 'button', 'Iniciar sesión o crear cuenta', 'ofrece entrar, sin exigirlo');
  info(`carga inicial en local: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await shot(visitor, 'feed-sin-cuenta');

  step('SIN SESIÓN · 2. Los datos de la zona, entre las publicaciones');

  const zoneTitle = () => visitor.getByRole('button', { name: /^Zona: / });
  await zoneTitle().waitFor({ state: 'visible', timeout: 20000 });
  ok('la tarjeta de datos de zona se ve sin cuenta');
  await expectLabel(visitor, 'Calidad del aire en Río Ntem', 'con la medición y el lugar que la mide');
  await zoneTitle().scrollIntoViewIfNeeded();
  await visitor.waitForTimeout(600);
  await shot(visitor, 'zona-y-destacado');

  step('SIN SESIÓN · 3. Cambiar de zona');

  await zoneTitle().click();
  await visitor.waitForTimeout(900);
  await visitor.getByRole('radio', { name: 'Zona Málaga y Andalucía' }).click();
  await visitor.waitForTimeout(3000);
  {
    const label = await zoneTitle().getAttribute('aria-label');
    if (label?.includes('Málaga')) ok('la zona cambia a Málaga y Andalucía');
    else bad(`la zona es «${label}»`);
  }
  await shot(visitor, 'zona-malaga');

  // Se vuelve a Guinea Ecuatorial para el resto del recorrido.
  await zoneTitle().click();
  await visitor.waitForTimeout(900);
  await visitor.getByRole('radio', { name: 'Zona Guinea Ecuatorial' }).click();
  await visitor.waitForTimeout(2500);

  step('SIN SESIÓN · 4. El mapa ambiental');

  await visitor.getByRole('tab', { name: 'Mapa' }).click();
  await visitor.locator('canvas.maplibregl-canvas').first().waitFor({ state: 'visible', timeout: 40000 });
  await visitor.waitForTimeout(3500);
  ok('el mapa carga sin cuenta');

  const markers = visitor.getByRole('button', { name: /, en el mapa$/ });
  const { count: totalEntities } = await anon
    .from('entities')
    .select('*', { count: 'exact', head: true });
  {
    const shown = await markers.count();
    if (shown === totalEntities) ok(`están las ${shown} entidades en el mapa`);
    else bad(`hay ${shown} marcadores y ${totalEntities} entidades`);
  }
  await shot(visitor, 'mapa');

  step('SIN SESIÓN · 5. Filtrar por capa');

  const { count: enBiodiversidad } = await anon
    .from('entities')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'biodiversidad');

  await visitor.getByRole('switch', { name: 'Capa Biodiversidad' }).click();
  await visitor.waitForTimeout(1500);
  {
    const shown = await markers.count();
    const esperado = totalEntities - enBiodiversidad;
    if (shown === esperado) ok(`apagar Biodiversidad deja ${shown} marcadores`);
    else bad(`quedan ${shown} y se esperaban ${esperado}`);
  }
  await shot(visitor, 'mapa-filtrado');

  await visitor.getByRole('switch', { name: 'Capa Biodiversidad' }).click();
  await visitor.waitForTimeout(1500);

  step('SIN SESIÓN · 6. Del marcador de Monte Alén a su perfil ambiental');

  await visitor.getByRole('button', { name: /Parque Nacional de Monte Alén, en el mapa/ }).click();
  await visitor.waitForTimeout(1500);
  await expectRole(visitor, 'link', /Abrir la ficha de Parque Nacional de Monte Alén/, 'la tarjeta del marcador se abre');
  await shot(visitor, 'marcador-monte-alen');

  await visitor.getByRole('link', { name: /Abrir la ficha de Parque Nacional de Monte Alén/ }).click();
  await visitor.waitForTimeout(3500);

  if (route(visitor) === '/entidad/parque-nacional-monte-alen') ok('abre su perfil ambiental');
  else bad(`la ruta es ${route(visitor)}`);

  for (const [name, label] of [
    ['Aire: 42 AQI, Bueno', 'aire 42 AQI · Bueno'],
    ['Agua: 8,2 pH, Excelente', 'agua 8,2 pH · Excelente'],
    ['Cobertura forestal: 78 %, Alta', 'cobertura forestal 78 %'],
  ]) {
    await expectLabel(visitor, name, `muestra ${label}, como el mockup 1`);
  }
  await shot(visitor, 'perfil-monte-alen');

  step('SIN SESIÓN · 7. Intentar valorar lleva a crear cuenta');

  await expectRole(visitor, 'button', /Inicia sesión para seguir y valorar/, 'valorar y seguir piden cuenta, y lo dicen');
  await visitor.getByRole('button', { name: /Inicia sesión para seguir y valorar/ }).click();
  await visitor.waitForTimeout(3000);
  if (route(visitor) === '/welcome') ok('y llevan a la bienvenida');
  else bad(`lleva a ${route(visitor)}`);
  await shot(visitor, 'cta-crear-cuenta');
  await visitor.context().close();

  // =========================================================================
  // CON SESIÓN — el ciclo completo
  // =========================================================================
  step('CON SESIÓN · 8. Registro desde la interfaz');

  const page = await newPage();
  await page.goto(`${origin}/register`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(account.email);
  await page.getByPlaceholder('Mínimo 8 caracteres').fill(account.password);
  await page.getByPlaceholder('bosque_vivo').fill(account.username);
  await page.waitForTimeout(1600);
  await page.getByPlaceholder('Bosque Vivo').fill(account.displayName);
  await shot(page, 'registro');
  await page.getByText('Crear cuenta', { exact: true }).last().click();
  await page.waitForTimeout(4500);

  if (route(page) === '/') ok('tras registrarse se entra al feed');
  else bad(`tras registrarse la ruta es ${route(page)}`);

  {
    const { data } = await anon
      .from('profiles')
      .select('id')
      .eq('username', account.username)
      .maybeSingle();
    if (data) {
      uid = data.id;
      ok('el perfil se creó en la base de datos');
    } else {
      bad('no hay perfil para la cuenta nueva');
    }
  }

  step('CON SESIÓN · 9. Publicar con etiqueta');

  await page.getByRole('button', { name: 'Crear publicación' }).click();
  await page.waitForTimeout(1600);
  await page
    .getByLabel('Texto de la publicación')
    .fill('Recorriendo la demo de OVENG desde Bata. #Reforestación');
  await page.waitForTimeout(900);
  await expectRole(page, 'listitem', '#reforestación', 'la etiqueta se detecta al escribir');
  await shot(page, 'compositor');
  await page.getByText('Publicar', { exact: true }).first().click();
  await page.waitForTimeout(4000);

  {
    const { data } = await anon
      .from('posts')
      .select('content, hashtags')
      .eq('author_id', uid)
      .maybeSingle();
    if (data?.hashtags?.includes('reforestación')) ok('la publicación se guardó con su etiqueta');
    else bad(`la publicación guardada es ${JSON.stringify(data)}`);
  }

  step('CON SESIÓN · 10. Dar "me gusta"');

  await page.getByRole('button', { name: /Me gusta/ }).first().click();
  await page.waitForTimeout(2500);
  {
    const { count } = await anon
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    if (count === 1) ok('el "me gusta" quedó en la base de datos');
    else bad(`hay ${count} "me gusta" de esta cuenta`);
  }
  await shot(page, 'feed-con-sesion');

  step('CON SESIÓN · 11. Buscar EcoGuinea y seguirla');

  await page.getByRole('tab', { name: 'Buscar' }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('textbox', { name: 'Buscar' }).fill('EcoGuinea');
  await page.waitForTimeout(2200);
  await expectRole(page, 'link', /EcoGuinea/, 'la búsqueda encuentra EcoGuinea');
  await shot(page, 'buscar-ecoguinea');

  await page.getByRole('button', { name: 'Seguir', exact: true }).first().click();
  await page.waitForTimeout(3000);
  await expectRole(page, 'button', 'Siguiendo', 'el botón pasa a "Siguiendo"');
  {
    const { count } = await anon
      .from('entity_follows')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid);
    if (count === 1) ok('el seguimiento quedó en la base de datos');
    else bad(`hay ${count} seguimientos de entidad`);
  }

  step('CON SESIÓN · 12. Valorar el Río Ntem');

  await page.goto(`${origin}/entidad/rio-ntem`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByRole('button', { name: 'Valorar', exact: true }).click();
  await page.waitForTimeout(1200);
  await page.getByRole('radio', { name: 'Valorar con 5 estrellas' }).click();
  await page.getByLabel('Comentario de la valoración').fill('La limpieza del río se nota.');
  await shot(page, 'valorar');
  await page.getByRole('button', { name: 'Publicar valoración' }).click();
  await page.waitForTimeout(4000);

  {
    const { data: ntem } = await anon.from('entities').select('id').eq('slug', 'rio-ntem').single();
    const { data: summary } = await anon
      .from('entity_rating_summary')
      .select('average, ratings_count')
      .eq('entity_id', ntem.id)
      .maybeSingle();

    if (Number(summary?.average) === 5 && Number(summary?.ratings_count) === 1) {
      ok(`la media de la vista se actualiza: ${summary.average} de ${summary.ratings_count}`);
    } else {
      bad(`la vista devuelve ${JSON.stringify(summary)}`);
    }
  }
  await expectLabel(page, 'Valoración 5 de 5 con 1 opiniones', 'la ficha refleja la valoración');
  await shot(page, 'ntem-valorado');

  step('CON SESIÓN · 13. Perfil propio y cerrar sesión');

  // La ficha de entidad es una ruta de Stack y no tiene barra de pestañas: se
  // vuelve al feed antes de usarla.
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);
  await page.getByRole('tab', { name: 'Perfil' }).click();
  await page.waitForTimeout(2500);
  await expectRole(page, 'button', 'Editar perfil', 'el perfil propio carga');
  await shot(page, 'perfil-propio');

  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('menuitem', { name: /Cerrar sesión/ }).click();
  await page.waitForTimeout(3500);

  if (route(page) === '/welcome') ok('cerrar sesión lleva a la bienvenida');
  else bad(`cerrar sesión lleva a ${route(page)}`);
  await shot(page, 'cierre-de-sesion');
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message}`);
} finally {
  await browser.close();
  server.close();
}

// --- Limpieza -----------------------------------------------------------------
step('Limpieza de los datos de prueba');

if (uid) {
  try {
    await user.auth.signInWithPassword({ email: account.email, password: account.password });
    await user.from('entity_ratings').delete().eq('user_id', uid);
    await user.from('entity_follows').delete().eq('user_id', uid);
    await user.from('likes').delete().eq('user_id', uid);
    await user.from('posts').delete().eq('author_id', uid);
    await user.from('profiles').delete().eq('id', uid);
    ok(`perfil @${account.username} y todo lo que creó, eliminados`);
  } catch (caught) {
    bad(`no se pudo limpiar: ${caught.message}`);
  }
} else {
  info('no se creó cuenta: nada que limpiar');
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: la demo completa funciona.' : `RESULTADO: ${failures} fallo(s).`);
console.log(`Capturas del recorrido en docs/verificacion/demo/ (${shotIndex})`);
console.log(`\nQueda 1 usuario en Authentication → Users: ${account.email}`);
process.exit(failures === 0 ? 0 : 1);
