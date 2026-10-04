/**
 * Verificación de F4.1: el aire en vivo de Open-Meteo, con su procedencia.
 *
 *   npm run verify:f41                  # construye y verifica
 *   npm run verify:f41 -- --skip-build  # reutiliza dist/
 *
 * Todo es lectura y **sin sesión**: no crea cuentas ni deja nada en la base.
 * Sí depende de que Open-Meteo responda; si no responde, la primera sección lo
 * dice antes de entrar en el navegador.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/f41');
const skipBuild = process.argv.includes('--skip-build');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
if (!url) {
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

const API = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const API_GLOB = '**/air-quality-api.open-meteo.com/**';

/**
 * Los mismos tramos que `AIR_LEVELS` en src/lib/air-quality.ts (AQI europeo de
 * la Agencia Europea de Medio Ambiente). Si divergen, esta comprobación deja de
 * comprobar lo que la app hace.
 */
const LEVELS = [
  [20, 'Excelente'],
  [40, 'Buena'],
  [60, 'Moderada'],
  [80, 'Mala'],
  [100, 'Muy mala'],
  [Infinity, 'Extremadamente mala'],
];
const labelFor = (aqi) => LEVELS.find(([max]) => aqi <= max)[1];

async function apiAir(lat, lng) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lng),
    current: 'european_aqi,pm2_5,pm10',
    timezone: 'GMT',
  });
  const response = await fetch(`${API}?${params}`);
  return response.json();
}

// --- 1. El contrato de la API ---------------------------------------------------
step('1. Open-Meteo responde con AQI numérico (Bata y Málaga)');

const PLACES = {
  bata: { name: 'Bata', lat: 1.8639, lng: 9.7658 },
  malaga: { name: 'Málaga', lat: 36.7213, lng: -4.4214 },
  ntem: { name: 'Río Ntem', lat: null, lng: null },
};

const expected = {};
for (const key of ['bata', 'malaga']) {
  const place = PLACES[key];
  try {
    const body = await apiAir(place.lat, place.lng);
    const aqi = body?.current?.european_aqi;
    if (typeof aqi === 'number' && typeof body.current.time === 'string') {
      expected[key] = Math.round(aqi);
      ok(
        `${place.name}: AQI europeo ${aqi} → «${labelFor(aqi)}» · PM2.5 ${body.current.pm2_5} µg/m³ · ${body.current.time} UTC · rejilla ${body.latitude}, ${body.longitude}`,
      );
    } else {
      bad(`${place.name}: respuesta sin AQI numérico: ${JSON.stringify(body).slice(0, 160)}`);
    }
  } catch (caught) {
    bad(`${place.name}: la API no responde (${caught.message})`);
  }
}

{
  // La etiqueta es coherente con los tramos oficiales en sus bordes.
  const borders = [
    [0, 'Excelente'],
    [20, 'Excelente'],
    [21, 'Buena'],
    [40, 'Buena'],
    [60, 'Moderada'],
    [80, 'Mala'],
    [100, 'Muy mala'],
    [101, 'Extremadamente mala'],
  ];
  const wrong = borders.filter(([aqi, label]) => labelFor(aqi) !== label);
  if (wrong.length === 0) ok('los seis tramos del AQI europeo, comprobados en sus bordes');
  else bad(`tramos mal: ${JSON.stringify(wrong)}`);
}

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
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4191 });
const browser = await chromium.launch();

/** Un visitante sin cuenta. Con `blockAir`, la API del aire no responde. */
async function newVisitor({ blockAir = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES' });
  if (blockAir) await context.route(API_GLOB, (route) => route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const airRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('air-quality-api.open-meteo.com')) airRequests.push(request.url());
  });
  return { context, page, errors, airRequests };
}

const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

async function labelOf(page, pattern, timeout = 15000) {
  // Solo los visibles: una pantalla anterior puede quedar oculta debajo en la
  // pila con un nombre accesible parecido (el feed bajo el mapa, por ejemplo).
  const locator = page.getByLabel(pattern).filter({ visible: true }).first();
  await locator.waitFor({ state: 'visible', timeout });
  return locator.getAttribute('aria-label');
}

async function waitForMap(page) {
  await page.locator('canvas.maplibregl-canvas').first().waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(2500);
}

const aqiIn = (label) => Number(/(\d+) AQI europeo/.exec(label ?? '')?.[1]);

try {
  // --- 3. Feed --------------------------------------------------------------------
  step('3. Feed sin cuenta: la tarjeta de zona trae el aire en vivo');

  const live = await newVisitor();
  {
    const { page } = live;
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });

    try {
      const label = await labelOf(page, /^Calidad del aire en Río Ntem: .* AQI europeo/);
      ok(`la tarjeta enseña el aire en vivo: «${label}»`);

      // El aire del Ntem se pide en sus coordenadas; la API debe decir lo mismo.
      const coords = /latitude=([\d.-]+)&longitude=([\d.-]+)/.exec(live.airRequests[0] ?? '');
      if (coords) {
        const body = await apiAir(coords[1], coords[2]);
        const apiAqi = Math.round(body.current.european_aqi);
        if (aqiIn(label) === apiAqi && label.includes(labelFor(apiAqi))) {
          ok(`coincide con la API para esa coordenada (${apiAqi}, «${labelFor(apiAqi)}»)`);
        } else {
          bad(`la tarjeta dice ${aqiIn(label)} y la API ${apiAqi}`);
        }
      } else {
        bad('no se vio ninguna petición a Open-Meteo desde el feed');
      }
    } catch {
      bad('la tarjeta de zona no enseña el aire en vivo');
    }

    try {
      await page.getByText(/🛰️ Estimación satelital Copernicus · (ahora|hace)/).first().waitFor({ timeout: 5000 });
      ok('con su procedencia a la vista: «🛰️ Estimación satelital Copernicus · hace …»');
    } catch {
      bad('no se ve la línea de procedencia en la tarjeta');
    }

    await page.getByLabel(/^Calidad del aire en Río Ntem/).first().scrollIntoViewIfNeeded();
    await shot(page, '01-feed-aire-en-vivo');

    // Málaga no tiene ningún lugar medido, pero su aire existe.
    await page.getByRole('button', { name: /^Zona: .*Cambiar de zona/ }).first().click();
    await page.getByRole('radio', { name: 'Zona Málaga y Andalucía' }).click();
    try {
      const label = await labelOf(page, /^Calidad del aire en Málaga y Andalucía: .* AQI europeo/);
      const agrees = expected.malaga === undefined || Math.abs(aqiIn(label) - expected.malaga) <= 1;
      if (agrees) ok(`Málaga, sin lugar medido, ya tiene aire en vivo: «${label}»`);
      else bad(`Málaga dice ${aqiIn(label)} y la API ${expected.malaga}`);
    } catch {
      bad('Málaga no enseña el aire en vivo');
    }
    await page.getByLabel(/^Calidad del aire en Málaga/).first().scrollIntoViewIfNeeded();
    await shot(page, '02-feed-malaga-en-vivo');

    // Se deja la zona como estaba para no contaminar los siguientes pasos.
    await page.getByRole('button', { name: /^Zona: .*Cambiar de zona/ }).first().click();
    await page.getByRole('radio', { name: 'Zona Guinea Ecuatorial' }).click();
  }

  // --- 4. Mapa ---------------------------------------------------------------------
  step('4. Mapa: el dato es del centro del encuadre y cambia al moverlo');

  {
    const { page, airRequests } = live;
    await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    await waitForMap(page);

    let before = null;
    try {
      before = await labelOf(page, /^Calidad del aire en el centro del mapa/);
      ok(`al abrir: «${before}»`);
    } catch {
      bad('la tarjeta flotante no enseña el aire en vivo del centro');
    }
    await shot(page, '03-mapa-centro-inicial');

    // Arrastrar unos 200 px hacia abajo a zoom 7,2 lleva el centro unos dos
    // grados al norte: de Bata a la altura de Douala. Por una zona sin pines.
    const requestsBefore = airRequests.length;
    const pin = page.getByRole('button', { name: 'Río Ntem, en el mapa' });
    const pinBefore = await pin.boundingBox();
    await page.mouse.move(80, 300);
    await page.mouse.down();
    for (let i = 1; i <= 20; i += 1) {
      await page.mouse.move(80, 300 + i * 11, { steps: 2 });
    }
    await page.mouse.up();
    await page.waitForTimeout(3500);

    /*
     * Los pines tienen que viajar con el mapa. Hasta F4.1 no lo hacían: React
     * Compiler memorizaba su proyección sin el contador de movimiento y se
     * quedaban congelados en el primer encuadre. Ninguna verificación
     * arrastraba el mapa, así que nadie lo vio.
     */
    {
      const pinAfter = await pin.boundingBox();
      const moved = pinBefore && pinAfter ? pinAfter.y - pinBefore.y : null;
      if (moved !== null && Math.abs(moved - 220) <= 15) {
        ok(`los pines viajan con el mapa (el del Ntem bajó ${Math.round(moved)} px con un arrastre de 220)`);
      } else {
        bad(`los pines no siguen al mapa: el del Ntem se movió ${moved} px con un arrastre de 220`);
      }
    }

    const during = airRequests.length - requestsBefore;
    if (during >= 1 && during <= 2) ok(`un arrastre de 20 pasos hace ${during} petición(es), no una por fotograma`);
    else bad(`un arrastre hizo ${during} peticiones a la API`);

    try {
      const after = await labelOf(page, /^Calidad del aire en el centro del mapa/);
      if (after !== before) ok(`tras moverlo: «${after}»`);
      else bad('la tarjeta no cambió al mover el mapa');
    } catch {
      bad('la tarjeta desapareció al mover el mapa');
    }
    await shot(page, '04-mapa-movido');

    // Volver a la misma celda no pide nada: sale de la caché.
    await page.getByRole('button', { name: 'Centrar en Guinea Ecuatorial' }).click();
    await page.waitForTimeout(3000);
    const recentered = airRequests.length;
    await page.mouse.move(80, 300);
    await page.mouse.down();
    await page.mouse.move(80, 302, { steps: 2 });
    await page.mouse.up();
    await page.waitForTimeout(2000);
    if (airRequests.length === recentered) ok('volver a una celda ya vista sale de la caché, sin llamar a la API');
    else bad('se volvió a pedir una celda que estaba en caché');
  }

  // --- 5. Perfil ambiental ------------------------------------------------------------
  step('5. Perfil de Monte Alén: aire vivo como principal, curado como referencia');

  {
    const { page } = live;
    await page.goto(`${origin}/entidad/parque-nacional-monte-alen`, { waitUntil: 'networkidle' });
    try {
      const label = await labelOf(page, /^Aire ahora: .* AQI europeo/);
      ok(`aire en vivo: «${label}»`);
    } catch {
      bad('no aparece el aire en vivo en el perfil');
    }
    try {
      await labelOf(page, /^Referencia del perfil: Bueno 42 AQI/);
      ok('y el curado debajo como «Referencia del perfil: Bueno · 42 AQI»');
    } catch {
      bad('no aparece el aire curado como referencia');
    }
    {
      const lines = await page.getByText('📋 Dato de referencia').count();
      if (lines >= 2) ok(`las métricas curadas dicen su procedencia (${lines} líneas «📋 Dato de referencia»)`);
      else bad(`solo ${lines} línea(s) de procedencia en las métricas curadas`);
    }
    await page.getByText('Aire ahora').first().scrollIntoViewIfNeeded();
    await shot(page, '05-monte-alen-vivo-y-referencia');

    if (live.errors.length === 0) ok('sin errores de página en todo el recorrido');
    else bad(`errores de página: ${live.errors.join(' | ')}`);
  }
  await live.context.close();

  // --- 6. La API caída -------------------------------------------------------------
  step('6. Con la API bloqueada: el dato curado, con su etiqueta, sin romper nada');

  const down = await newVisitor({ blockAir: true });
  {
    const { page, errors } = down;

    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    try {
      const label = await labelOf(page, /^Calidad del aire en Río Ntem: .*Dato de referencia/);
      if (label.includes('42 AQI')) ok(`el feed cae al curado: «${label}»`);
      else bad(`el feed cae a algo inesperado: «${label}»`);
    } catch {
      bad('el feed no cae al dato curado');
    }
    await page.getByLabel(/^Calidad del aire en Río Ntem/).first().scrollIntoViewIfNeeded();
    await shot(page, '06-feed-api-caida');

    await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    await waitForMap(page);
    try {
      const label = await labelOf(page, /^Calidad del aire en .*Dato de referencia/);
      ok(`el mapa cae a la medición curada más cercana: «${label}»`);
    } catch {
      bad('el mapa no cae al dato curado');
    }
    await shot(page, '07-mapa-api-caida');

    await page.goto(`${origin}/entidad/parque-nacional-monte-alen`, { waitUntil: 'networkidle' });
    try {
      await labelOf(page, /^Referencia del perfil: Bueno 42 AQI/);
      ok('el perfil enseña la referencia curada sola');
    } catch {
      bad('el perfil no enseña la referencia con la API caída');
    }
    if ((await page.getByLabel(/^Aire ahora:/).count()) === 0) ok('y no finge un dato en vivo');
    else bad('el perfil enseña «Aire ahora» sin API');
    await shot(page, '08-perfil-api-caida');

    if (errors.length === 0) ok('sin errores de página con la API caída');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }
  await down.context.close();
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message}`);
} finally {
  await browser.close();
  server.close();
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f41/');
process.exit(failures === 0 ? 0 : 1);
