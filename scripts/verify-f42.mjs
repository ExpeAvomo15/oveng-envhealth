/**
 * Verificación de F4.2: búsqueda mundial en el mapa y ubicación de quien mira.
 *
 *   npm run verify:f42                  # construye y verifica
 *   npm run verify:f42 -- --skip-build  # reutiliza dist/
 *
 * Todo es lectura y **sin sesión**: no crea cuentas ni escribe en la base. La
 * ubicación se simula con Playwright —concedida en Málaga, o sin permiso—, así
 * que no depende de dónde esté la máquina que lo ejecuta.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/f42');
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
const step = (m) => console.log(`\n${m}`);

const GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search';
const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';

/** Una posición simulada con más decimales de los que deben salir del cliente. */
const HERE = { latitude: 36.721345, longitude: -4.421389, accuracy: 30 };

async function apiAqi(lat, lng) {
  const params = new URLSearchParams({ latitude: lat, longitude: lng, current: 'european_aqi', timezone: 'GMT' });
  const body = await (await fetch(`${AIR}?${params}`)).json();
  return Math.round(body.current.european_aqi);
}

// --- 1. El contrato de la geocodificación -------------------------------------------
step('1. Open-Meteo Geocoding responde (Bata, Málaga, Douala)');

const firstOf = {};
for (const name of ['Bata', 'Málaga', 'Douala']) {
  try {
    const params = new URLSearchParams({ name, count: '5', language: 'es', format: 'json' });
    const body = await (await fetch(`${GEOCODING}?${params}`)).json();
    const first = body.results?.[0];
    if (first && typeof first.latitude === 'number') {
      firstOf[name] = first;
      ok(`«${name}» → ${first.name}, ${first.admin1}, ${first.country} (${first.latitude}, ${first.longitude}) · ${first.feature_code}`);
    } else {
      bad(`«${name}» sin resultados: ${JSON.stringify(body).slice(0, 120)}`);
    }
  } catch (caught) {
    bad(`«${name}»: la API no responde (${caught.message})`);
  }
}

// --- 2. Build ---------------------------------------------------------------------
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
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4193 });
const browser = await chromium.launch();

/** Un visitante sin cuenta. `granted`: el permiso de ubicación ya concedido, en Málaga. */
async function newVisitor({ granted = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: 'es-ES',
    ...(granted ? { geolocation: HERE, permissions: ['geolocation'] } : {}),
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const requests = { geocoding: [], air: [] };
  page.on('request', (request) => {
    const target = request.url();
    if (target.startsWith(GEOCODING)) requests.geocoding.push(target);
    if (target.startsWith(AIR)) requests.air.push(target);
  });
  return { context, page, errors, requests };
}

const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

/** Solo los visibles: una pantalla anterior puede quedar oculta en la pila. */
async function labelOf(page, pattern, timeout = 15000) {
  const locator = page.getByLabel(pattern).filter({ visible: true }).first();
  await locator.waitFor({ state: 'visible', timeout });
  return locator.getAttribute('aria-label');
}

async function waitForMap(page) {
  await page.locator('canvas.maplibregl-canvas').first().waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(2500);
}

const aqiIn = (label) => Number(/(\d+) AQI europeo/.exec(label ?? '')?.[1]);
const search = (page) => page.getByRole('textbox', { name: 'Buscar en el mapa' });

try {
  // --- 3. Primera carga sin permiso previo ----------------------------------------
  step('3. Primera carga sin permiso previo: Guinea Ecuatorial, sin pedir nada');

  const visitor = await newVisitor();
  {
    const { page } = visitor;
    await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    await waitForMap(page);
    try {
      const label = await labelOf(page, /^Calidad del aire en el centro del mapa \(2,10 N · 9,90 E\)/);
      ok(`centra en Guinea Ecuatorial: «${label}»`);
    } catch {
      bad('la primera carga sin permiso no centra en Guinea Ecuatorial');
    }
    if ((await page.getByLabel('Estás aquí').count()) === 0) ok('y no hay marcador «Estás aquí»: no se ha pedido la ubicación');
    else bad('aparece «Estás aquí» sin haber pedido la ubicación');
    await shot(page, '01-primera-carga-sin-permiso');
  }

  // --- 4. Buscar una ciudad del mundo -------------------------------------------------
  step('4. Buscar «Douala»: el mapa vuela y enseña su aire en vivo');

  {
    const { page, requests } = visitor;
    // Tecla a tecla, como una persona: el debounce tiene que dejar una o dos
    // peticiones, no una por letra.
    await search(page).pressSequentially('Douala', { delay: 90 });
    try {
      await page.getByRole('button', { name: /^Ir a Duala, .*Camerún/ }).first().waitFor({ timeout: 10000 });
      ok('«Lugares del mundo» ofrece Duala, Región del Litoral, Camerún');
    } catch {
      bad('no aparece Duala entre los lugares del mundo');
    }
    if (requests.geocoding.length >= 1 && requests.geocoding.length <= 2) {
      ok(`seis teclas, ${requests.geocoding.length} petición(es) de geocodificación (debounce de 400 ms)`);
    } else {
      bad(`seis teclas hicieron ${requests.geocoding.length} peticiones de geocodificación`);
    }
    await shot(page, '02-buscar-douala');

    await page.getByRole('button', { name: /^Ir a Duala, .*Camerún/ }).first().click();
    try {
      const label = await labelOf(page, /^Calidad del aire en Duala · Región del Litoral, Camerún: .* AQI europeo/, 20000);
      const duala = firstOf.Douala;
      const expected = duala ? await apiAqi(duala.latitude, duala.longitude) : null;
      if (expected === null || Math.abs(aqiIn(label) - expected) <= 1) {
        ok(`la tarjeta enseña el aire en vivo de Duala con su nombre: «${label}»`);
      } else {
        bad(`la tarjeta dice ${aqiIn(label)} y la API ${expected} para Duala`);
      }
    } catch {
      bad('tras elegir Duala, la tarjeta no enseña su aire con el nombre del lugar');
    }
    try {
      await page.getByText(/Estimación satelital Copernicus/).filter({ visible: true }).first().waitFor({ timeout: 5000 });
      ok('con su procedencia');
    } catch {
      bad('sin línea de procedencia');
    }
    await page.waitForTimeout(800);
    await shot(page, '03-duala-aire-en-vivo');
  }

  step('5. Buscar «monte»: Monte Alén sigue saliendo, y lo que no existe se dice');

  {
    const { page } = visitor;
    await search(page).fill('monte');
    try {
      await page.getByRole('button', { name: 'Ir a Parque Nacional de Monte Alén' }).waitFor({ timeout: 8000 });
      ok('«En OVENG» encuentra el Parque Nacional de Monte Alén');
    } catch {
      bad('«monte» ya no encuentra Monte Alén');
    }
    try {
      await page.getByText('Lugares del mundo').filter({ visible: true }).waitFor({ timeout: 8000 });
      await page.getByRole('button', { name: /^Ir a .*(España|Francia|Estados Unidos)/ }).first().waitFor({ timeout: 10000 });
      ok('y a la vez, lugares del mundo con su región y país');
    } catch {
      bad('«monte» no enseña los dos grupos');
    }
    await shot(page, '04-buscar-monte-dos-grupos');

    await page.getByRole('button', { name: 'Ir a Parque Nacional de Monte Alén' }).click();
    try {
      await page.getByRole('link', { name: /Abrir la ficha de Parque Nacional de Monte Alén/ }).waitFor({ timeout: 8000 });
      ok('elegir la entidad vuela a ella y abre su tarjeta');
    } catch {
      bad('elegir Monte Alén no abre su tarjeta');
    }

    await search(page).fill('zzxxqqww');
    try {
      await page.getByText('No encontramos ese lugar.').waitFor({ timeout: 10000 });
      ok('lo que no existe: «No encontramos ese lugar.»');
    } catch {
      bad('una búsqueda sin resultados no lo dice');
    }
    await shot(page, '05-sin-resultados');
    await search(page).fill('');
  }

  step('6. «Mi ubicación» con el permiso denegado: aviso amable, el mapa no se mueve');

  {
    const { page, errors } = visitor;
    // El paso anterior dejó abierta la tarjeta de Monte Alén.
    await page.getByRole('button', { name: 'Cerrar la tarjeta' }).click().catch(() => {});
    await page.waitForTimeout(1500);
    const before = await labelOf(page, /^Calidad del aire en /);
    await page.getByRole('button', { name: 'Mi ubicación' }).click();
    try {
      await page
        .getByText(/Sin permiso de ubicación|No hemos podido saber dónde estás|tarda demasiado/)
        .first()
        .waitFor({ timeout: 15000 });
      ok('aparece el aviso, sin insistir');
    } catch {
      bad('denegar la ubicación no avisa');
    }
    await page.waitForTimeout(1500);
    const after = await labelOf(page, /^Calidad del aire en /);
    if (after === before) ok('y el mapa se queda donde estaba');
    else bad(`el mapa se movió: «${before}» → «${after}»`);
    if ((await page.getByLabel('Estás aquí').count()) === 0) ok('sin marcador «Estás aquí»');
    else bad('aparece «Estás aquí» sin permiso');
    await shot(page, '06-ubicacion-denegada');

    if (errors.length === 0) ok('sin errores de página en todo el recorrido');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }
  await visitor.context.close();

  // --- 7. Con permiso concedido ------------------------------------------------------
  step('7. Con el permiso ya concedido: la primera carga centra en su zona');

  const located = await newVisitor({ granted: true });
  {
    const { page, requests, errors } = located;
    await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    await waitForMap(page);
    try {
      const label = await labelOf(page, /^Calidad del aire en Tu ubicación: .* AQI europeo/, 20000);
      ok(`la primera carga vuela a su zona: «${label}»`);
    } catch {
      bad('con permiso previo, la primera carga no centra en la ubicación');
    }
    if (await page.getByLabel('Estás aquí').isVisible()) ok('con el marcador «Estás aquí»');
    else bad('falta el marcador «Estás aquí»');

    // Privacidad: lo que sale hacia la API del aire va redondeado a 2 decimales.
    const sent = requests.air.map((target) => new URL(target).searchParams.get('latitude'));
    if (sent.length > 0 && sent.every((lat) => /^-?\d+\.\d{2}$/.test(lat))) {
      ok(`la coordenada sale redondeada a dos decimales (${sent.at(-1)}, no ${HERE.latitude})`);
    } else {
      bad(`la coordenada sale con otra precisión: ${sent.join(', ')}`);
    }
    await shot(page, '07-primera-carga-con-permiso');

    step('8. «Mi ubicación» tras moverse: vuelve y enseña su aire');

    await page.getByRole('button', { name: 'Centrar en Guinea Ecuatorial' }).click();
    await page.waitForTimeout(3500);
    await page.getByRole('button', { name: 'Mi ubicación' }).click();
    try {
      const label = await labelOf(page, /^Calidad del aire en Tu ubicación: .* AQI europeo/, 20000);
      const expected = await apiAqi(HERE.latitude.toFixed(2), HERE.longitude.toFixed(2));
      if (Math.abs(aqiIn(label) - expected) <= 1) ok(`vuelve a su posición con su aire: «${label}»`);
      else bad(`la tarjeta dice ${aqiIn(label)} y la API ${expected}`);
    } catch {
      bad('«Mi ubicación» con permiso no centra ni enseña el dato');
    }
    await page.waitForTimeout(800);
    await shot(page, '08-mi-ubicacion');

    step('9. Feed: «Usar mi ubicación» en el selector de zona');

    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Zona: .*Cambiar de zona/ }).first().click();
    try {
      await page.getByText('OVENG no la guarda ni la recibe', { exact: false }).first().waitFor({ timeout: 5000 });
      ok('el selector dice antes qué se hace con la ubicación');
    } catch {
      bad('falta el microtexto de privacidad en el selector');
    }
    await page.waitForTimeout(700); // la hoja entra con un fundido
    await shot(page, '09-selector-con-mi-ubicacion');
    await page.getByRole('radio', { name: 'Usar mi ubicación' }).click();
    try {
      const label = await labelOf(page, /^Calidad del aire en Tu ubicación: .* AQI europeo/, 20000);
      ok(`la tarjeta de zona pasa a su ubicación: «${label}»`);
    } catch {
      bad('la tarjeta de zona no enseña el aire de su ubicación');
    }
    await page.getByLabel(/^Calidad del aire en Tu ubicación/).filter({ visible: true }).first().scrollIntoViewIfNeeded();
    await shot(page, '10-feed-tu-ubicacion');

    await page.reload({ waitUntil: 'networkidle' });
    try {
      await labelOf(page, /^Calidad del aire en Tu ubicación: /, 20000);
      ok('tras recargar sigue en su ubicación (se guarda la elección, no las coordenadas)');
    } catch {
      bad('la elección no persiste tras recargar');
    }
    const stored = await page.evaluate(() => window.localStorage.getItem('oveng.feed.zone'));
    if (stored === 'mi-ubicacion') ok('en el dispositivo solo queda «mi-ubicacion», sin coordenadas');
    else bad(`en el dispositivo queda «${stored}»`);

    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }
  await located.context.close();

  step('10. Feed sin permiso: elegir «Usar mi ubicación» avisa y no cambia la zona');

  const denied = await newVisitor();
  {
    const { page } = denied;
    await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /^Zona: .*Cambiar de zona/ }).first().click();
    await page.getByRole('radio', { name: 'Usar mi ubicación' }).click();
    try {
      await page
        .getByText(/Sin permiso de ubicación|No hemos podido saber dónde estás|tarda demasiado/)
        .first()
        .waitFor({ timeout: 15000 });
      ok('aparece el aviso');
    } catch {
      bad('elegir mi ubicación sin permiso no avisa');
    }
    const zone = await page.getByRole('button', { name: /^Zona: / }).first().getAttribute('aria-label');
    if (zone?.includes('Guinea Ecuatorial')) ok('y la zona sigue siendo Guinea Ecuatorial');
    else bad(`la zona pasó a «${zone}»`);
  }
  await denied.context.close();
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message}`);
} finally {
  await browser.close();
  server.close();
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f42/');
process.exit(failures === 0 ? 0 : 1);
