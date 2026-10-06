/**
 * Verificación de F4.5: Turismo Verde orientado a ubicación.
 *
 *   npm run verify:f45                  # construye y verifica
 *   npm run verify:f45 -- --skip-build  # reutiliza dist/
 *
 * Necesita el seed de entidades de F4.5 cargado (13 lugares nuevos). Casi todo
 * se recorre sin cuenta; para comprobar que "proponer un rincón" precarga el
 * compositor se crea una cuenta de prueba, que se limpia al terminar.
 *
 * "Cómo llegar" no abre Google de verdad: se sustituye `window.open` dentro de
 * la página y se comprueba la URL exacta que se abriría.
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
const SHOTS = join(ROOT, 'docs/verificacion/f45');
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

/** Los mismos cálculos que src/lib/geo.ts. */
function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// --- 1. Los lugares nuevos ------------------------------------------------------------------
step('1. Los 13 lugares nuevos, con coordenadas en su país y sin métricas inventadas');

const NEW_PLACES = {
  'monte-san-anton': 'España',
  'caminito-del-rey': 'España',
  'sierra-de-las-nieves': 'España',
  'dunas-de-artola': 'España',
  'desembocadura-del-guadalhorce': 'España',
  'torcal-de-antequera': 'España',
  'montes-de-malaga': 'España',
  'acantilados-de-maro-cerro-gordo': 'España',
  'valle-de-moka': 'Guinea Ecuatorial',
  'playas-de-ureca': 'Guinea Ecuatorial',
  'luba-y-su-costa': 'Guinea Ecuatorial',
  'reserva-natural-rio-campo': 'Guinea Ecuatorial',
  'altos-de-nsork': 'Guinea Ecuatorial',
};
// Cajas de cada país, las mismas que verify:f21.
const BOXES = {
  'Guinea Ecuatorial': { lat: [-1.6, 4.0], lng: [5.0, 11.5] },
  España: { lat: [35.9, 43.9], lng: [-9.4, 4.5] },
};

const { data: lugares, error: lugaresError } = await anon
  .from('entities')
  .select('id, slug, name, country, lat, lng, type, entity_metrics ( metric )')
  .eq('type', 'lugar');
if (lugaresError) {
  bad(`no se pudieron leer los lugares: ${lugaresError.message}`);
  process.exit(1);
}
{
  const missing = Object.keys(NEW_PLACES).filter((slug) => !lugares.some((place) => place.slug === slug));
  if (missing.length > 0) {
    bad(`faltan ${missing.length} lugares: ${missing.join(', ')} — ¿falta npm run seed:entities?`);
    process.exit(1);
  }
  let wrong = 0;
  for (const [slug, country] of Object.entries(NEW_PLACES)) {
    const place = lugares.find((p) => p.slug === slug);
    const box = BOXES[country];
    const inside =
      place.country === country &&
      place.lat >= box.lat[0] && place.lat <= box.lat[1] &&
      place.lng >= box.lng[0] && place.lng <= box.lng[1];
    if (!inside) {
      wrong += 1;
      bad(`${slug}: ${place.country} (${place.lat}, ${place.lng}) fuera de ${country}`);
    }
    if (place.entity_metrics.length > 0) {
      wrong += 1;
      bad(`${slug}: tiene ${place.entity_metrics.length} métricas sin fuente`);
    }
  }
  if (wrong === 0) ok(`los 13 existen, cada uno en su país, y ninguno lleva métricas (${lugares.length} lugares en total)`);
}

// --- 2. Build ---------------------------------------------------------------------------------
step('2. Construyendo el export web');

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
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4198 });
const browser = await chromium.launch();

const MALAGA = { latitude: 36.7213, longitude: -4.4214, accuracy: 30 };

async function newPage({ located = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'es-ES',
    ...(located ? { geolocation: MALAGA, permissions: ['geolocation'] } : {}),
  });
  const page = await context.newPage();
  // "Cómo llegar" usa Linking.openURL, que en web es window.open: se registra
  // la URL en vez de abrir otra pestaña.
  await page.addInitScript(() => {
    window.__opened = [];
    window.open = (target) => {
      window.__opened.push(String(target));
      return null;
    };
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, errors };
}
const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const route = (page) => new URL(page.url()).pathname.replace(basePath, '') || '/';
const cardLabels = async (page) =>
  (await Promise.all((await page.getByRole('link', { name: /\. Ver el lugar$/ }).all()).map((l) => l.getAttribute('aria-label')))).filter(Boolean);

let account = null;
let uid = null;

try {
  // --- 3. Buscar Málaga ---------------------------------------------------------------------------
  step('3. Sin cuenta: buscar «Málaga» lista sus rincones por cercanía');

  const visitor = await newPage();
  {
    const { page, errors } = visitor;
    await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: 'Turismo Verde' }).click();
    await page.waitForTimeout(2500);
    if (route(page) === '/turismo-verde') ok('el chip Turismo Verde de Buscar abre su pantalla');
    else bad(`el chip lleva a ${route(page)}`);
    try {
      await page.getByText('¿Dónde quieres disfrutar de la naturaleza?', { exact: false }).waitFor({ timeout: 5000 });
      ok('con la pregunta de cabecera');
    } catch {
      bad('falta la cabecera-pregunta');
    }
    const chips = await page.getByRole('radio').evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')));
    if (chips.includes('Cerca de mí') && chips.includes('Guinea Ecuatorial') && chips.includes('Málaga y Andalucía')) {
      ok(`chips de un toque: ${chips.join(' · ')}`);
    } else {
      bad(`chips: ${chips.join(' · ')}`);
    }
    await shot(page, '01-turismo-verde');

    await page.getByLabel('Buscar una ciudad o región').fill('Málaga');
    const pick = page.getByRole('button', { name: /^Buscar cerca de Málaga, Andalucía, España/ }).first();
    await pick.waitFor({ timeout: 10000 });
    await pick.click();
    await page.waitForTimeout(2000);

    const { data: geo } = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?name=M%C3%A1laga&count=1&language=es')).json().then((d) => ({ data: d.results[0] }));
    const point = { lat: geo.latitude, lng: geo.longitude };
    const expected = lugares
      .map((p) => ({ name: p.name, km: distanceKm(point, p) }))
      .filter((p) => p.km <= 150)
      .sort((a, b) => a.km - b.km);

    const labels = await cardLabels(page);
    const shownNames = labels.map((l) => l.split(', a ')[0]);
    if (shownNames.join('|') === expected.map((p) => p.name).join('|')) {
      ok(`${shownNames.length} rincones, ordenados por distancia: ${shownNames.slice(0, 3).join(' → ')} …`);
    } else {
      bad(`orden en pantalla: ${shownNames.join(' | ')}\n      esperado: ${expected.map((p) => p.name).join(' | ')}`);
    }
    if (labels.length > 0 && labels.every((l) => /, a [\d.,]+ (km|m)\. Ver el lugar$/.test(l))) {
      ok(`cada tarjeta dice «a X km» (la primera: ${labels[0].split(', ')[1].replace('. Ver el lugar', '')})`);
    } else {
      bad('alguna tarjeta no dice la distancia');
    }
    await shot(page, '02-malaga-por-cercania');

    // Cómo llegar.
    const first = lugares.find((p) => p.name === shownNames[0]);
    await page.getByRole('link', { name: `Cómo llegar a ${first.name}. Abre Google Maps, fuera de OVENG` }).click();
    const opened = await page.evaluate(() => window.__opened);
    const want = `https://www.google.com/maps?q=${first.lat},${first.lng}`;
    if (opened.at(-1) === want) ok(`«Cómo llegar» abre ${want}, las coordenadas exactas de ${first.name}`);
    else bad(`«Cómo llegar» abre ${opened.at(-1)}, se esperaba ${want}`);

    // La tarjeta, fuera del botón, lleva al perfil.
    await page.getByRole('link', { name: new RegExp(`^${first.name}, a .*Ver el lugar$`) }).click();
    await page.waitForTimeout(3000);
    if (route(page) === `/entidad/${first.slug}`) ok('tocar la tarjeta abre el perfil del lugar');
    else bad(`tocar la tarjeta lleva a ${route(page)}`);
    try {
      await page.getByRole('button', { name: 'Cómo llegar ↗' }).waitFor({ timeout: 8000 });
      ok('y el perfil también tiene «Cómo llegar»');
    } catch {
      bad('el perfil del lugar no tiene «Cómo llegar»');
    }
    await page.getByText('Para tu visita').scrollIntoViewIfNeeded();
    await shot(page, '03-perfil-como-llegar');

    // --- 4. Una zona sin lugares ------------------------------------------------------------------
    step('4. Sin cuenta: una ciudad sin lugares da un vacío honesto que invita a participar');
    await page.goto(`${origin}/turismo-verde`, { waitUntil: 'networkidle' });
    await page.getByLabel('Buscar una ciudad o región').fill('Lisboa');
    await page.getByRole('button', { name: /^Buscar cerca de Lisboa/ }).first().click();
    await page.waitForTimeout(2000);
    try {
      await page.getByText('Aún no tenemos rincones verdes en Lisboa', { exact: false }).waitFor({ timeout: 5000 });
      ok('«Aún no tenemos rincones verdes en Lisboa 🌱»');
    } catch {
      bad('Lisboa no da el estado vacío');
    }
    {
      const near = await cardLabels(page);
      const sorted = near.every((l, i) => i === 0 || parseFloat(l.split(', a ')[1].replace('.', '').replace(',', '.')) >= parseFloat(near[i - 1].split(', a ')[1].replace('.', '').replace(',', '.')));
      if ((await page.getByText('Lo más cerca que conocemos').count()) > 0 && near.length === 3 && sorted) {
        ok(`«Lo más cerca que conocemos»: los 3 más cercanos, con su distancia (${near[0].split(', a ')[1].replace('. Ver el lugar', '')} el primero)`);
      } else {
        bad(`los más cercanos fuera de radio: ${near.join(' | ')}`);
      }
    }
    await page.getByRole('button', { name: 'Proponer un rincón verde' }).scrollIntoViewIfNeeded();
    await shot(page, '04-lisboa-vacio-honesto');
    await page.getByRole('button', { name: 'Proponer un rincón verde' }).click();
    await page.waitForTimeout(2000);
    if (route(page) === '/welcome') ok('sin cuenta, proponer lleva a entrar o crear cuenta');
    else bad(`sin cuenta, proponer lleva a ${route(page)}`);

    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }
  await visitor.context.close();

  // --- 5. Cerca de mí ---------------------------------------------------------------------------------
  step('5. «Cerca de mí» con permiso (posición simulada en Málaga)');
  const located = await newPage({ located: true });
  {
    const { page } = located;
    await page.goto(`${origin}/turismo-verde`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.getByRole('radio', { name: 'Cerca de mí' }).click();
    await page.waitForTimeout(2500);
    const labels = await cardLabels(page);
    const near = lugares.map((p) => ({ name: p.name, km: distanceKm({ lat: 36.72, lng: -4.42 }, p) })).sort((a, b) => a.km - b.km)[0];
    if (labels.length > 0 && labels[0].startsWith(near.name) && (await page.getByText(/cerca de tu ubicación/).count()) > 0) {
      ok(`«Cerca de mí» ordena desde tu posición: el primero es ${near.name}`);
    } else {
      bad(`«Cerca de mí»: ${labels[0] ?? 'sin tarjetas'}`);
    }
    await shot(page, '05-cerca-de-mi');
  }
  await located.context.close();

  // --- 6. Proponer, con cuenta ----------------------------------------------------------------------
  step('6. Con cuenta: proponer abre el compositor con el texto empezado');
  const stamp = Date.now().toString(36);
  account = { email: `oveng-f45-${stamp}@ovengtest.dev`, password: `Verif-${stamp}-45`, username: `f45${stamp}` };
  const user = createClient(url, anonKey, { auth: { persistSession: false } });
  const { data: signed, error: signError } = await user.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { username: account.username, display_name: 'Cuenta de prueba F4.5' } },
  });
  if (signError) throw signError;
  uid = signed.user.id;

  const member = await newPage();
  {
    const { page } = member;
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('tu@email.com').fill(account.email);
    await page.getByPlaceholder('Tu contraseña').fill(account.password);
    await page.getByText('Entrar', { exact: true }).first().click();
    await page.waitForTimeout(3500);
    await page.goto(`${origin}/turismo-verde`, { waitUntil: 'networkidle' });
    await page.getByLabel('Buscar una ciudad o región').fill('Lisboa');
    await page.getByRole('button', { name: /^Buscar cerca de Lisboa/ }).first().click();
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: 'Proponer un rincón verde' }).click();
    await page.waitForTimeout(2500);
    const text = await page.getByLabel('Texto de la publicación').inputValue().catch(() => '');
    if (text.startsWith('Propongo un rincón verde en Lisboa:') && text.includes('#TurismoVerde')) {
      ok('el compositor se abre con «Propongo un rincón verde en Lisboa: …#TurismoVerde»');
    } else {
      bad(`el compositor tiene: «${text}»`);
    }
    await shot(page, '06-proponer-compositor');
  }
  await member.context.close();
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.close();
}

step('7. Limpieza');
if (uid) {
  const owner = createClient(url, anonKey, { auth: { persistSession: false } });
  await owner.auth.signInWithPassword({ email: account.email, password: account.password });
  await owner.from('profiles').delete().eq('id', uid);
  ok(`perfil @${account.username} eliminado`);
  info(`queda 1 usuario en Authentication → Users: ${account.email}`);
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f45/');
process.exit(failures === 0 ? 0 : 1);
