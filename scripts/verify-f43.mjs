/**
 * Verificación de F4.3: dato vivo por categoría, explicaciones en lenguaje
 * llano y recuperar contraseña.
 *
 *   npm run verify:f43                  # construye y verifica
 *   npm run verify:f43 -- --skip-build  # reutiliza dist/
 *
 * El mapa y las explicaciones se recorren sin cuenta. Para la contraseña se
 * crea una cuenta de prueba, se le cambia la contraseña de verdad contra
 * Supabase y se borra su perfil al terminar.
 *
 * **El envío del email no se hace de verdad.** El servidor de correo integrado
 * de Supabase solo entrega a direcciones del equipo del proyecto y permite dos
 * por hora para todo el proyecto: una prueba que lo usara gastaría el cupo del
 * autor. Se intercepta la petición, se comprueba que lleva la `redirect_to`
 * correcta y se contesta como lo haría Supabase, con éxito y con el límite.
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
const SHOTS = join(ROOT, 'docs/verificacion/f43');
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

const AIR = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const FORECAST = 'https://api.open-meteo.com/v1/forecast';
const GBIF = 'https://api.gbif.org/v1/occurrence/search';

const json = async (target) => (await fetch(target)).json();
const soilAt = (lat, lng) =>
  json(`${FORECAST}?${new URLSearchParams({ latitude: lat, longitude: lng, current: 'soil_moisture_0_to_1cm', timezone: 'GMT' })}`);
const natureAt = (lat, lng) =>
  json(
    `${GBIF}?${new URLSearchParams({
      geoDistance: `${lat},${lng},10km`,
      hasGeospatialIssue: 'false',
      hasCoordinate: 'true',
      limit: '0',
      facet: 'speciesKey',
      facetLimit: '1000',
    })}`,
  );

// --- 1. Las tres fuentes responden ---------------------------------------------------
step('1. Las tres fuentes en vivo responden (Bata y Málaga)');

const PLACES = { Bata: ['1.86', '9.77'], Málaga: ['36.72', '-4.42'] };
for (const [name, [lat, lng]] of Object.entries(PLACES)) {
  try {
    const air = await json(`${AIR}?${new URLSearchParams({ latitude: lat, longitude: lng, current: 'european_aqi', timezone: 'GMT' })}`);
    const soil = await soilAt(lat, lng);
    const nature = await natureAt(lat, lng);
    const aqi = air.current?.european_aqi;
    const moisture = soil.current?.soil_moisture_0_to_1cm;
    const species = nature.facets?.[0]?.counts.length ?? 0;
    if (typeof aqi === 'number' && typeof moisture === 'number' && typeof nature.count === 'number') {
      ok(
        `${name}: aire ${aqi} · suelo ${Math.round(moisture * 100)} % · GBIF ${nature.count} observaciones de ${species}${species >= 1000 ? '+' : ''} especies`,
      );
    } else {
      bad(`${name}: respuesta incompleta (aire ${aqi}, suelo ${moisture}, GBIF ${nature.count})`);
    }
  } catch (caught) {
    bad(`${name}: una fuente no responde (${caught.message})`);
  }
}

// --- 2. Build -------------------------------------------------------------------------
step('2. Construyendo el export web');

if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}
{
  const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
  const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
  if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) ok('el bundle apunta al Supabase del .env');
  else bad('el bundle no apunta al Supabase del .env (¿caché de Metro?)');
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4195 });
const browser = await chromium.launch();

async function newVisitor({ blockLive = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-ES' });
  if (blockLive) {
    for (const glob of ['**/air-quality-api.open-meteo.com/**', '**/api.open-meteo.com/**', '**/api.gbif.org/**']) {
      await context.route(glob, (route) => route.abort());
    }
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return { context, page, errors };
}

const shot = (page, name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });
const route = (page) => new URL(page.url()).pathname.replace(basePath, '') || '/';

async function labelOf(page, pattern, timeout = 15000) {
  const locator = page.getByLabel(pattern).filter({ visible: true }).first();
  await locator.waitFor({ state: 'visible', timeout });
  return locator.getAttribute('aria-label');
}

async function waitForMap(page) {
  await page.locator('canvas.maplibregl-canvas').first().waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(2500);
}

/** Abre un ⓘ, comprueba el título de su explicación y la cierra. */
async function explains(page, about, title, shotName) {
  try {
    await page.getByRole('button', { name: `Qué significa: ${about}` }).filter({ visible: true }).first().click();
    await page.getByText(title).first().waitFor({ timeout: 5000 });
    ok(`el ⓘ de «${about}» abre «${title}»`);
    if (shotName) {
      await page.waitForTimeout(500);
      await shot(page, shotName);
    }
    await page.getByRole('button', { name: 'Entendido' }).click();
    await page.waitForTimeout(400);
  } catch {
    bad(`el ⓘ de «${about}» no abre su explicación`);
  }
}

const chooseLayer = async (page, name) => {
  await page.getByRole('radio', { name: `Capa ${name}` }).click();
  await page.waitForTimeout(2500);
};

let account = null;
let uid = null;
const user = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

try {
  // --- 3. Aire en lenguaje llano ------------------------------------------------------
  step('3. El aire, en palabras: la palabra primero y el índice explicado');

  const visitor = await newVisitor();
  {
    const { page } = visitor;
    await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    await waitForMap(page);
    try {
      await labelOf(page, /^Calidad del aire en el centro del mapa/);
      await page.getByText(/^Índice de calidad del aire: \d+ \(escala europea\)$/).filter({ visible: true }).first().waitFor({ timeout: 5000 });
      ok('debajo de la palabra: «Índice de calidad del aire: N (escala europea)»');
    } catch {
      bad('la tarjeta del aire no explica el índice en palabras');
    }
    if ((await page.getByText(/AQI/).filter({ visible: true }).count()) === 0) ok('y la sigla «AQI» no está a la vista');
    else bad('la sigla «AQI» sigue a la vista en la tarjeta');
    await shot(page, '01-aire-en-palabras');

    await explains(page, 'índice de calidad del aire', '¿Qué es el índice de calidad del aire?', '02-explicacion-aire');
    await explains(page, 'estimación satelital copernicus', '¿Qué es una estimación satelital?');
  }

  // --- 4. Cada capa, su dato ------------------------------------------------------------
  step('4. Cada capa de la leyenda cambia la tarjeta a su dato');

  {
    const { page } = visitor;

    await chooseLayer(page, 'Suelo');
    try {
      const label = await labelOf(page, /^Suelo en el centro del mapa: /, 20000);
      const soil = await soilAt('2.10', '9.90');
      const expected = Math.round(soil.current.soil_moisture_0_to_1cm * 100);
      const shown = Number(/(\d+) % de humedad/.exec(label)?.[1]);
      if (/aquí es mar/.test(label) || Math.abs(shown - expected) <= 2) ok(`Suelo: «${label}» (la API dice ${expected} %)`);
      else bad(`Suelo dice ${shown} % y la API ${expected} %`);
    } catch {
      bad('elegir Suelo no enseña la humedad del suelo');
    }
    await shot(page, '03-capa-suelo');
    await explains(page, 'humedad del suelo', '¿Qué es la humedad del suelo?', '04-explicacion-suelo');

    await chooseLayer(page, 'Biodiversidad');
    try {
      const label = await labelOf(page, /^Naturaleza registrada cerca del centro del mapa: /, 25000);
      const nature = await natureAt('2.10', '9.90');
      const shown = Number((/: ([\d.]+) observaciones/.exec(label)?.[1] ?? '').replace(/\./g, ''));
      if (shown === nature.count) ok(`Biodiversidad: «${label}» (GBIF dice ${nature.count})`);
      else bad(`Biodiversidad dice ${shown} y GBIF ${nature.count}`);
    } catch {
      bad('elegir Biodiversidad no enseña lo registrado en GBIF');
    }
    await shot(page, '05-capa-biodiversidad');
    await explains(page, 'naturaleza registrada', '¿Qué es la naturaleza registrada?');

    await chooseLayer(page, 'Agua');
    try {
      const label = await labelOf(page, /^Agua en .*Dato de referencia/);
      ok(`Agua, con un lugar medido a la vista: «${label}»`);
    } catch {
      bad('elegir Agua no enseña el dato de referencia del lugar con agua');
    }
    await shot(page, '06-capa-agua-referencia');
    await explains(page, 'pH', '¿Qué es el pH?');

    // Lejos de cualquier lugar medido: el estado honesto.
    await page.getByRole('textbox', { name: 'Buscar en el mapa' }).fill('Nairobi');
    await page.getByRole('button', { name: /^Ir a Nairobi/ }).first().click();
    await page.waitForTimeout(4000);
    try {
      await labelOf(page, /^Agua: aún no hay datos de agua en vivo para esta zona/);
      ok('en Nairobi, sin lugar medido: «Aún no hay datos de agua en vivo para esta zona»');
    } catch {
      bad('el agua sin lugar medido no lo dice');
    }
    await shot(page, '07-capa-agua-sin-datos');
    await explains(page, 'por qué no hay datos de agua', '¿Por qué no hay datos de agua en vivo?', '08-explicacion-agua');

    await page.getByRole('button', { name: 'Centrar en Guinea Ecuatorial' }).click();
    await page.waitForTimeout(3500);
    for (const [layer, name] of [
      ['Energía', 'Energía'],
      ['Residuos', 'Residuos'],
    ]) {
      await chooseLayer(page, layer);
      try {
        const label = await labelOf(page, new RegExp(`^${name}: (.* por aquí|No hay empresas ni iniciativas)`));
        ok(`${layer}: «${label}» — cuenta entidades, no inventa un dato`);
      } catch {
        bad(`elegir ${layer} no enseña su recuento`);
      }
    }
    await shot(page, '09-capa-energia-residuos');

    await chooseLayer(page, 'Residuos');
    try {
      await labelOf(page, /^Calidad del aire en /);
      ok('volver a tocar la capa elegida devuelve el aire');
    } catch {
      bad('deseleccionar la capa no devuelve el aire');
    }

    if (visitor.errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${visitor.errors.join(' | ')}`);
  }
  await visitor.context.close();

  // --- 5. Las fuentes caídas -------------------------------------------------------------
  step('5. Con las fuentes bloqueadas: nada se rompe y nada se inventa');

  const down = await newVisitor({ blockLive: true });
  {
    const { page, errors } = down;
    await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
    await waitForMap(page);
    try {
      await labelOf(page, /^Calidad del aire en .*Dato de referencia/);
      ok('aire: cae al dato de referencia de un lugar');
    } catch {
      bad('el aire no cae al dato de referencia');
    }
    await chooseLayer(page, 'Suelo');
    try {
      await labelOf(page, /^Suelo: no disponible ahora/);
      ok('suelo: «no disponible ahora», sin cifra inventada');
    } catch {
      bad('el suelo sin API no lo dice');
    }
    await chooseLayer(page, 'Biodiversidad');
    try {
      await labelOf(page, /^Naturaleza registrada: no disponible ahora/);
      ok('biodiversidad: «no disponible ahora»');
    } catch {
      bad('la biodiversidad sin GBIF no lo dice');
    }
    await shot(page, '10-fuentes-caidas');
    if (errors.length === 0) ok('sin errores de página con las fuentes caídas');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }
  await down.context.close();

  // --- 6. Perfil ambiental -----------------------------------------------------------------
  step('6. Perfil de Monte Alén: vivo y referencia, y cada cifra explicada');

  const profile = await newVisitor();
  {
    const { page, errors } = profile;
    await page.goto(`${origin}/entidad/parque-nacional-monte-alen`, { waitUntil: 'networkidle' });
    try {
      await labelOf(page, /^Aire ahora: /, 20000);
      await labelOf(page, /^Suelo ahora: /, 20000);
      await labelOf(page, /^Naturaleza registrada cerca: /, 25000);
      ok('«Aire ahora», «Suelo ahora» y «Naturaleza cerca» en vivo');
    } catch {
      bad('faltan bloques en vivo en el perfil');
    }
    try {
      await labelOf(page, /^Referencia del perfil: Alta 8,7 \/10/);
      ok('la biodiversidad curada (8,7/10) sigue, como referencia de la ficha');
    } catch {
      bad('falta la referencia curada de biodiversidad');
    }
    const infos = await page.getByRole('button', { name: /^Qué significa: / }).count();
    if (infos >= 8) ok(`${infos} ⓘ en el perfil: cada cifra tiene su explicación`);
    else bad(`solo ${infos} ⓘ en el perfil`);
    await page.getByText('Suelo ahora').first().scrollIntoViewIfNeeded();
    await shot(page, '11-perfil-vivo-y-referencia');
    await explains(page, 'polvo fino', '¿Qué es el polvo fino?');
    await explains(page, 'cobertura forestal', '¿Qué es la cobertura forestal?');
    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }
  await profile.context.close();

  // --- 7. Recuperar contraseña: pedir el email ---------------------------------------------
  step('7. Recuperar contraseña: el email vuelve a /restablecer, con el subpath');

  const stamp = Date.now().toString(36);
  account = {
    email: `oveng-f43-${stamp}@ovengtest.dev`,
    password: `Antigua-${stamp}-2026`,
    newPassword: `Nueva-${stamp}-2026`,
    username: `f43${stamp}`.slice(0, 30).toLowerCase(),
  };

  const forgot = await newVisitor();
  {
    const { page, context } = forgot;
    let redirect = null;
    let replyWith = 'ok';
    await context.route('**/auth/v1/recover**', async (request) => {
      redirect = new URL(request.request().url()).searchParams.get('redirect_to');
      if (replyWith === 'ok') {
        await request.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
      } else {
        await request.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            code: 'over_email_send_rate_limit',
            error_code: 'over_email_send_rate_limit',
            msg: 'For security purposes, you can only request this after 37 seconds.',
          }),
        });
      }
    });

    await page.goto(`${origin}/forgot-password`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('tu@email.com').fill(account.email);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    try {
      await page.getByText('Email enviado').waitFor({ timeout: 10000 });
      ok('la pantalla confirma el envío');
    } catch {
      bad('no confirma el envío');
    }
    const expectedRedirect = `${origin}/restablecer`;
    if (redirect === expectedRedirect) ok(`redirect_to = ${redirect}`);
    else bad(`redirect_to = ${redirect}, se esperaba ${expectedRedirect}`);
    try {
      await page.getByText('revisa la carpeta de spam', { exact: false }).waitFor({ timeout: 3000 });
      await page.getByRole('button', { name: /^Reenviar en \d+ s$/ }).waitFor({ timeout: 3000 });
      ok('mensaje honesto (spam y límite por hora) y reenviar con cuenta atrás');
    } catch {
      bad('falta el aviso de spam/límite o la cuenta atrás');
    }
    await shot(page, '12-email-enviado');

    // El límite de Supabase, traducido.
    replyWith = 'limit';
    await page.goto(`${origin}/forgot-password`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('tu@email.com').fill(account.email);
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    try {
      await page.getByText(/espera 37 segundos/).waitFor({ timeout: 10000 });
      ok('el límite de envíos se dice en español: «espera 37 segundos»');
    } catch {
      bad('el límite de envíos no se traduce');
    }
  }
  await forgot.context.close();

  // --- 8. El enlace, en sus estados ---------------------------------------------------------
  step('8. /restablecer sin enlace válido: se dice qué pasa y qué hacer');

  const links = await newVisitor();
  {
    const { page } = links;
    const cases = [
      ['', 'Falta el enlace'],
      ['?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired', 'El enlace ha caducado o ya se usó'],
      ['?code=00000000-0000-0000-0000-000000000000', 'se abrió en un navegador distinto'],
    ];
    for (const [query, text] of cases) {
      await page.goto(`${origin}/restablecer${query}`, { waitUntil: 'networkidle' });
      try {
        await page.getByText(text, { exact: false }).first().waitFor({ timeout: 8000 });
        await page.getByRole('button', { name: 'Pedir un enlace nuevo' }).waitFor({ timeout: 3000 });
        ok(`${query ? query.split('&')[0] : 'sin parámetros'} → «${text}» y «Pedir un enlace nuevo»`);
      } catch {
        bad(`${query || 'sin parámetros'} no enseña «${text}»`);
      }
    }
    await shot(page, '13-enlace-otro-navegador');
  }
  await links.context.close();

  // --- 9. Cambiar la contraseña de verdad ----------------------------------------------------
  step('9. Con la sesión que deja el enlace: nueva contraseña, sesión y entrar con ella');

  {
    const { data, error } = await user.auth.signUp({
      email: account.email,
      password: account.password,
      options: { data: { username: account.username, display_name: 'Cuenta de prueba F4.3' } },
    });
    if (error || !data.session) throw new Error(`no se pudo crear la cuenta: ${error?.message ?? 'sin sesión'}`);
    uid = data.user.id;
    ok(`cuenta @${account.username} creada`);
  }

  const reset = await newVisitor();
  {
    const { page, errors } = reset;
    // La sesión que deja el canje del enlace se obtiene aquí entrando: lo que
    // se comprueba es la pantalla, no el correo.
    await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
    await page.getByPlaceholder('tu@email.com').fill(account.email);
    await page.getByPlaceholder('Tu contraseña').fill(account.password);
    await page.getByText('Entrar', { exact: true }).first().click();
    await page.waitForTimeout(3500);

    await page.goto(`${origin}/restablecer`, { waitUntil: 'networkidle' });
    const fields = page.getByLabel(/Contraseña nueva|Repite la contraseña/);
    try {
      await page.getByText('Nueva contraseña').first().waitFor({ timeout: 8000 });
      await page.getByLabel('Contraseña nueva', { exact: true }).fill('corta');
      await page.getByText('Tiene que tener al menos 8 caracteres.').waitFor({ timeout: 3000 });
      ok('menos de 8 caracteres: lo dice');
      await page.getByLabel('Contraseña nueva', { exact: true }).fill(account.newPassword);
      await page.getByLabel('Repite la contraseña', { exact: true }).fill(`${account.newPassword}x`);
      await page.getByText('Las dos contraseñas no coinciden.').waitFor({ timeout: 3000 });
      ok('si no coinciden: lo dice, y no deja guardar');
      await page.getByLabel('Repite la contraseña', { exact: true }).fill(account.newPassword);
      await shot(page, '14-nueva-contrasena');
      await page.getByRole('button', { name: 'Guardar contraseña' }).click();
      await page.getByText('Contraseña cambiada', { exact: false }).waitFor({ timeout: 10000 });
      await page.waitForTimeout(1500);
      if (route(page) === '/') ok('guardada: aviso «Contraseña cambiada» y vuelta a Inicio con la sesión iniciada');
      else bad(`tras guardar, la ruta es ${route(page)}`);
      await shot(page, '15-contrasena-cambiada');
    } catch (caught) {
      bad(`el formulario de nueva contraseña falló: ${caught.message.split('\n')[0]}`);
    }
    void fields;
    if (errors.length === 0) ok('sin errores de página');
    else bad(`errores de página: ${errors.join(' | ')}`);
  }
  await reset.context.close();

  {
    const fresh = createClient(url, anonKey, { auth: { persistSession: false } });
    const withNew = await fresh.auth.signInWithPassword({ email: account.email, password: account.newPassword });
    if (!withNew.error) ok('entrar con la contraseña nueva funciona');
    else bad(`la contraseña nueva no entra: ${withNew.error.message}`);
    const withOld = await fresh.auth.signInWithPassword({ email: account.email, password: account.password });
    if (withOld.error) ok('y con la antigua ya no');
    else bad('la contraseña antigua sigue entrando');
  }
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message}`);
} finally {
  await browser.close();
  server.close();
}

// --- 10. Limpieza --------------------------------------------------------------------------
step('10. Limpieza');
if (uid) {
  try {
    const owner = createClient(url, anonKey, { auth: { persistSession: false } });
    await owner.auth.signInWithPassword({ email: account.email, password: account.newPassword });
    await owner.from('profiles').delete().eq('id', uid);
    ok(`perfil @${account.username} eliminado`);
    info(`queda 1 usuario en Authentication → Users: ${account.email}`);
  } catch (caught) {
    bad(`no se pudo limpiar: ${caught.message}`);
  }
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f43/');
process.exit(failures === 0 ? 0 : 1);
