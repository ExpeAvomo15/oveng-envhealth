/**
 * Verificación de F2.3: el mapa ambiental.
 *
 *   npm run verify:f23                  # construye y verifica
 *   npm run verify:f23 -- --skip-build  # reutiliza dist/
 *
 * Comprueba las dos mitades: que el mapa pinta lo que dice la base y que las
 * dos pantallas públicas se ven sin cuenta.
 *
 * Crea una cuenta de prueba y la limpia al terminar.
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
const SHOTS = join(ROOT, 'docs/verificacion/f23');
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

// --- 1. Requisitos ------------------------------------------------------------
step('1. Requisitos: entidades con coordenadas');

const { data: entities, error } = await anon
  .from('entities')
  .select('id, slug, name, type, category, description, location_name, lat, lng');

if (error || !entities?.length) {
  bad(`no se pueden leer las entidades: ${error?.message ?? 'ninguna'}`);
  process.exit(1);
}

ok(`${entities.length} entidades`);

const sinCoordenadas = entities.filter((e) => e.lat === null || e.lng === null);
if (sinCoordenadas.length === 0) ok('todas tienen coordenadas: todas pueden ir al mapa');
else bad(`${sinCoordenadas.length} sin coordenadas: no saldrían`);

const porCategoria = entities.reduce((acc, e) => ({ ...acc, [e.category]: (acc[e.category] ?? 0) + 1 }), {});
info(
  'por categoría: ' +
    Object.entries(porCategoria)
      .map(([k, v]) => `${k}=${v}`)
      .join(', '),
);

const monteAlen = entities.find((e) => e.slug === 'parque-nacional-monte-alen');
const enBiodiversidad = porCategoria.biodiversidad ?? 0;

// --- 2. Build -----------------------------------------------------------------
step('2. Construyendo el export web');

if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}

{
  const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
  const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
  if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) {
    ok('el bundle apunta al Supabase del .env');
  } else {
    bad('el bundle no apunta al Supabase del .env (¿caché de Metro?)');
  }

  // MapLibre trae su propia hoja de estilos; sin ella los controles se ven mal.
  const css = readdirSync(join(ROOT, 'dist/_expo/static/css'));
  if (css.some((f) => f.startsWith('maplibre-gl'))) ok('el CSS de MapLibre viaja en el export');
  else bad('falta el CSS de MapLibre en el export');
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4180 });
const browser = await chromium.launch();

const newPage = async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'es-ES',
  });
  return context.newPage();
};

/** Los marcadores se anuncian como "<nombre>, en el mapa". */
const markers = (page) => page.getByRole('button', { name: /, en el mapa$/ });

/** Espera a que el lienzo de MapLibre exista y haya pintado. */
async function waitForMap(page) {
  await page.locator('canvas.maplibregl-canvas').first().waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(2500);
}

try {
  // --- 3. Sin sesión ----------------------------------------------------------
  step('3. Acceso sin cuenta');

  {
    const page = await newPage();

    /*
     * Desde F2.6 la raíz es el feed y se ve sin cuenta; lo que sigue llevando a
     * la bienvenida es pedir una ruta privada. Cuando esto se escribió (F2.3) la
     * raíz era la bienvenida, y el orden de declaración de las rutas públicas
     * era justo lo que había que proteger: por eso la comprobación sigue aquí,
     * pero mirando lo que toca.
     */
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const landing = new URL(page.url()).pathname.replace(basePath, '') || '/';
    if (landing === '/') ok('sin sesión, la raíz abre el feed público');
    else bad(`sin sesión, la raíz lleva a ${landing} (debería ser el feed)`);

    await page.goto(`${origin}/perfil`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    const privada = new URL(page.url()).pathname.replace(basePath, '') || '/';
    if (privada === '/welcome') ok('y una ruta privada sigue llevando a la bienvenida');
    else bad(`pedir /perfil sin sesión lleva a ${privada}`);

    await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    await waitForMap(page);
    ok('el mapa carga sin sesión');

    try {
      await page.getByRole('button', { name: 'Iniciar sesión' }).first().waitFor({ timeout: 8000 });
      ok('el mapa ofrece "Iniciar sesión" a quien no tiene cuenta');
    } catch {
      bad('falta el acceso a "Iniciar sesión" en el mapa sin sesión');
    }

    const count = await markers(page).count();
    if (count === entities.length) ok(`se ven los ${count} marcadores sin sesión`);
    else bad(`sin sesión se ven ${count} marcadores, se esperaban ${entities.length}`);

    await page.screenshot({ path: join(SHOTS, '01-mapa-sin-sesion.png') });

    await page.goto(`${origin}/entidad/${monteAlen.slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    try {
      await page.getByRole('heading', { name: new RegExp(monteAlen.name) }).waitFor({ timeout: 8000 });
      ok('la ficha de una entidad se ve sin cuenta');
    } catch {
      bad('la ficha de entidad no carga sin sesión');
    }
    try {
      await page.getByRole('button', { name: /Inicia sesión para seguir/ }).waitFor({ timeout: 8000 });
      ok('seguir pide cuenta, y lo dice');
    } catch {
      bad('la ficha no ofrece iniciar sesión para seguir');
    }
    await page.screenshot({ path: join(SHOTS, '02-ficha-sin-sesion.png') });
    await page.context().close();
  }

  // --- 4. Con sesión ----------------------------------------------------------
  step('4. El mapa con sesión');

  const stamp = Date.now().toString(36);
  const account = {
    email: `oveng-f23-${stamp}@ovengtest.dev`,
    password: `Verif-${stamp}-2026`,
    username: `f23${stamp}`.slice(0, 30).toLowerCase(),
  };

  const user = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: auth, error: authError } = await user.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { username: account.username, display_name: 'Cuenta de prueba F2.3' } },
  });
  if (authError || !auth.session) {
    bad(`no se pudo crear la cuenta: ${authError?.message ?? 'sin sesión'}`);
    throw new Error('sin cuenta no se puede seguir');
  }
  const uid = auth.user.id;

  const page = await newPage();
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(account.email);
  await page.getByPlaceholder('Tu contraseña').fill(account.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  await page.getByRole('tab', { name: 'Mapa' }).click();
  await waitForMap(page);

  {
    const count = await markers(page).count();
    if (count === entities.length) ok(`el mapa pinta los ${count} marcadores`);
    else bad(`hay ${count} marcadores, se esperaban ${entities.length}`);
  }
  await page.screenshot({ path: join(SHOTS, '03-mapa.png') });

  // --- 5. Filtro por categoría ------------------------------------------------
  step('5. La leyenda filtra por categoría');

  await page.getByRole('switch', { name: 'Capa Biodiversidad' }).click();
  await page.waitForTimeout(1200);

  {
    const count = await markers(page).count();
    const esperado = entities.length - enBiodiversidad;
    if (count === esperado) ok(`apagar Biodiversidad deja ${count} marcadores (−${enBiodiversidad})`);
    else bad(`apagar Biodiversidad deja ${count}, se esperaban ${esperado}`);
  }
  await page.screenshot({ path: join(SHOTS, '04-filtro-categoria.png') });

  await page.getByRole('switch', { name: 'Capa Biodiversidad' }).click();
  await page.waitForTimeout(1200);
  {
    const count = await markers(page).count();
    if (count === entities.length) ok('volver a encenderla los devuelve todos');
    else bad(`al reencender quedan ${count} de ${entities.length}`);
  }

  // --- 6. Búsqueda en el mapa --------------------------------------------------
  step('6. Buscar en el mapa');

  await page.getByRole('textbox', { name: 'Buscar en el mapa' }).fill('monte');
  await page.waitForTimeout(1200);

  {
    const esperado = entities.filter(
      (e) =>
        e.name.toLowerCase().includes('monte') ||
        (e.location_name ?? '').toLowerCase().includes('monte'),
    ).length;
    const count = await markers(page).count();
    if (count === esperado && count > 0) ok(`"monte" deja ${count} marcador(es)`);
    else bad(`"monte" deja ${count} marcadores, se esperaban ${esperado}`);
  }

  await page.getByRole('button', { name: 'Borrar la búsqueda del mapa' }).click();
  await page.waitForTimeout(1000);

  // --- 7. Tarjeta del marcador -------------------------------------------------
  step('7. Tocar un marcador abre su tarjeta');

  await page.getByRole('button', { name: `${monteAlen.name}, en el mapa` }).click();
  await page.waitForTimeout(1200);

  try {
    await page
      .getByRole('link', { name: new RegExp(`Abrir la ficha de ${monteAlen.name}`) })
      .waitFor({ timeout: 8000 });
    ok('la tarjeta se abre con la entidad tocada');
  } catch {
    bad('la tarjeta no se abrió al tocar el marcador');
  }

  for (const [text, label] of [
    [monteAlen.name, 'muestra el nombre'],
    [monteAlen.description.slice(0, 40), 'muestra su descripción, la de la base'],
  ]) {
    try {
      await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
      ok(`la tarjeta ${label}`);
    } catch {
      bad(`la tarjeta no ${label}`);
    }
  }
  await page.screenshot({ path: join(SHOTS, '05-tarjeta-marcador.png') });

  // --- 8. De la tarjeta a la ficha ---------------------------------------------
  step('8. De la tarjeta a la ficha');

  await page.getByRole('link', { name: new RegExp(`Abrir la ficha de ${monteAlen.name}`) }).click();
  await page.waitForTimeout(2500);

  {
    const path = new URL(page.url()).pathname.replace(basePath, '');
    if (path === `/entidad/${monteAlen.slug}`) ok(`la ficha abre en ${path}`);
    else bad(`tras tocar la tarjeta la ruta es ${path}`);
  }
  await page.screenshot({ path: join(SHOTS, '06-ficha-desde-mapa.png') });

  // --- 9. Tarjeta de calidad del aire ------------------------------------------
  step('9. Tarjeta de calidad del aire');

  await page.goBack();
  await waitForMap(page);
  await page.getByRole('button', { name: 'Cerrar la tarjeta' }).click().catch(() => {});
  await page.waitForTimeout(1200);

  try {
    await page.getByRole('link', { name: /^Calidad del aire en / }).first().waitFor({ timeout: 8000 });
    ok('sin marcador seleccionado se ve la calidad del aire de la entidad más cercana');
  } catch {
    bad('no aparece la tarjeta de calidad del aire');
  }
  await page.screenshot({ path: join(SHOTS, '07-calidad-del-aire.png') });

  // --- 10. Limpieza del mapa al salir -------------------------------------------
  step('10. El mapa se destruye al cambiar de pestaña');

  await page.getByRole('tab', { name: 'Inicio' }).click();
  await page.waitForTimeout(1500);

  {
    const canvases = await page.locator('canvas.maplibregl-canvas').count();
    if (canvases === 0) ok('al salir del mapa no queda ningún lienzo de MapLibre');
    else bad(`quedan ${canvases} lienzos de MapLibre fuera del mapa`);
  }

  await page.getByRole('tab', { name: 'Mapa' }).click();
  await waitForMap(page);

  {
    const canvases = await page.locator('canvas.maplibregl-canvas').count();
    if (canvases === 1) ok('al volver hay exactamente un mapa, no dos superpuestos');
    else bad(`al volver hay ${canvases} lienzos`);
  }

  // --- 11. Limpieza de datos ----------------------------------------------------
  step('11. Limpieza de los datos de prueba');
  await user.from('profiles').delete().eq('id', uid);
  ok(`perfil @${account.username} eliminado`);
  info(`cuenta a borrar en Authentication → Users: ${account.email}`);
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message}`);
} finally {
  await browser.close();
  server.close();
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f23/');
process.exit(failures === 0 ? 0 : 1);
