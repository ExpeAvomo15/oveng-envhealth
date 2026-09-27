/**
 * Verificación de F2.4: el perfil ambiental de una entidad.
 *
 *   npm run verify:f24                  # construye y verifica
 *   npm run verify:f24 -- --skip-build  # reutiliza dist/
 *
 * Comprueba que la pantalla es fiel al seed —incluido lo que NO debe enseñar— y
 * que las valoraciones se guardan, sustituyen y respetan RLS.
 *
 * Crea dos cuentas de prueba y las limpia al terminar.
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
const SHOTS = join(ROOT, 'docs/verificacion/f24');
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

// --- 1. El seed, que es la verdad que la pantalla debe reflejar ---------------
step('1. Métricas en la base');

const { data: entities, error } = await anon.from('entities').select('id, slug, name');
if (error || !entities?.length) {
  bad(`no se pueden leer las entidades: ${error?.message ?? 'ninguna'}`);
  process.exit(1);
}

const monteAlen = entities.find((e) => e.slug === 'parque-nacional-monte-alen');
const ntem = entities.find((e) => e.slug === 'rio-ntem');
if (!monteAlen || !ntem) {
  bad('faltan Monte Alén o Río Ntem: el seed no está completo');
  process.exit(1);
}

const metricsOf = async (id) => {
  const { data } = await anon.from('entity_metrics').select('metric, value, unit, label').eq('entity_id', id);
  return new Map((data ?? []).map((m) => [m.metric, m]));
};

const mMonte = await metricsOf(monteAlen.id);
const mNtem = await metricsOf(ntem.id);

if (!mMonte.has('calidad_general')) ok('Monte Alén NO tiene calidad general (así es el mockup 1)');
else bad('Monte Alén tiene calidad general: el seed ha cambiado');

if (Number(mNtem.get('calidad_general')?.value) === 8.7) ok('el Ntem tiene calidad general 8,7');
else bad(`la calidad general del Ntem es ${mNtem.get('calidad_general')?.value}`);

if (Number(mNtem.get('indice_aire')?.value) === 8.9) ok('el Ntem tiene índice de aire 8,9');
else bad(`el índice de aire del Ntem es ${mNtem.get('indice_aire')?.value}`);

info(`Monte Alén: ${[...mMonte.keys()].sort().join(', ')}`);
info(`Río Ntem: ${[...mNtem.keys()].sort().join(', ')}`);

// --- 2. Cuentas y RLS de valoraciones ----------------------------------------
step('2. RLS de entity_ratings');

const stamp = Date.now().toString(36);
const makeAccount = (role) => ({
  email: `oveng-f24-${role}-${stamp}@ovengtest.dev`,
  password: `Verif-${role}-${stamp}-2026`,
  username: `f24${role}${stamp}`.slice(0, 30).toLowerCase(),
});

const clientFor = () =>
  createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

async function signUp(account, displayName) {
  const client = clientFor();
  const { data, error: authError } = await client.auth.signUp({
    email: account.email,
    password: account.password,
    options: { data: { username: account.username, display_name: displayName } },
  });
  if (authError || !data.session) {
    throw new Error(`no se pudo crear ${account.username}: ${authError?.message ?? 'sin sesión'}`);
  }
  return { client, id: data.user.id };
}

const cuentaA = makeAccount('a');
const cuentaB = makeAccount('b');
const a = await signUp(cuentaA, 'Valorador A');
const b = await signUp(cuentaB, 'Valorador B');
ok(`creadas @${cuentaA.username} y @${cuentaB.username}`);

{
  const { error: anonError } = await anon
    .from('entity_ratings')
    .insert({ entity_id: ntem.id, user_id: a.id, score: 5 });
  if (anonError) ok(`un anónimo no puede valorar (${anonError.code ?? 'denegado'})`);
  else bad('¡un anónimo ha valorado!');
}

{
  const { error: insertError } = await a.client
    .from('entity_ratings')
    .insert({ entity_id: ntem.id, user_id: a.id, score: 4, comment: 'Buen estado del río.' });
  if (insertError) bad(`A no ha podido valorar: ${insertError.message}`);
  else ok('A valora el Ntem con 4');
}

{
  // B intenta cambiar la valoración de A.
  const { data } = await b.client
    .from('entity_ratings')
    .update({ score: 1, comment: 'secuestrada' })
    .eq('entity_id', ntem.id)
    .eq('user_id', a.id)
    .select();
  if (!data || data.length === 0) ok('B no puede editar la valoración de A');
  else bad('¡B ha editado la valoración de A!');

  const { data: intacta } = await anon
    .from('entity_ratings')
    .select('score, comment')
    .eq('entity_id', ntem.id)
    .eq('user_id', a.id)
    .maybeSingle();
  if (intacta?.score === 4) ok('la valoración de A sigue intacta');
  else bad(`la valoración de A es ahora ${JSON.stringify(intacta)}`);
}

{
  // El upsert de la app: valorar dos veces sustituye.
  const { error: upsertError } = await a.client
    .from('entity_ratings')
    .upsert(
      { entity_id: ntem.id, user_id: a.id, score: 5, comment: 'Mejor de lo que esperaba.' },
      { onConflict: 'entity_id,user_id' },
    );
  if (upsertError) bad(`el upsert falló: ${upsertError.message}`);

  const { count } = await anon
    .from('entity_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', ntem.id)
    .eq('user_id', a.id);
  if (count === 1) ok('valorar dos veces sustituye: sigue habiendo una fila');
  else bad(`hay ${count} filas para A en el Ntem`);
}

// Se deja el Ntem limpio para que la parte del navegador empiece sin opiniones.
await a.client.from('entity_ratings').delete().eq('user_id', a.id);

// --- 3. Build ----------------------------------------------------------------
step('3. Construyendo el export web');

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
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4182 });
const browser = await chromium.launch();

const newPage = async () => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: 'es-ES',
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  return context.newPage();
};

const expectLabel = async (page, name, label, timeout = 10000) => {
  try {
    await page.getByLabel(name, { exact: false }).first().waitFor({ state: 'visible', timeout });
    ok(label);
  } catch {
    bad(`${label} — no apareció nada con nombre accesible «${name}»`);
  }
};

try {
  // --- 4. Sin sesión ---------------------------------------------------------
  step('4. El perfil sin cuenta');

  {
    const page = await newPage();
    await page.goto(`${origin}/entidad/${monteAlen.slug}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // Por rol: el nombre es un encabezado y su nombre accesible sale del texto,
    // no de un aria-label.
    try {
      await page
        .getByRole('heading', { name: /Parque Nacional de Monte Alén/ })
        .waitFor({ timeout: 10000 });
      ok('el perfil carga sin sesión');
    } catch {
      bad('el perfil no carga sin sesión');
    }
    try {
      await page
        .getByRole('button', { name: /Inicia sesión para seguir y valorar/ })
        .waitFor({ timeout: 8000 });
      ok('seguir y valorar piden cuenta, y lo dicen');
    } catch {
      bad('falta el aviso de iniciar sesión');
    }
    try {
      await page.getByText('Todavía no hay opiniones', { exact: false }).first().waitFor({ timeout: 8000 });
      ok('las opiniones se ven sin cuenta (vacías, que es lo que hay)');
    } catch {
      bad('no se ve la sección de opiniones sin cuenta');
    }
    await page.screenshot({ path: join(SHOTS, '01-perfil-sin-sesion.png'), fullPage: true });
    await page.context().close();
  }

  // --- 5. Monte Alén: fiel al mockup 1 ---------------------------------------
  step('5. Monte Alén: sus cuatro métricas, y sin círculo de calidad general');

  const page = await newPage();
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(cuentaA.email);
  await page.getByPlaceholder('Tu contraseña').fill(cuentaA.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  await page.goto(`${origin}/entidad/${monteAlen.slug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  for (const [name, label] of [
    ['Aire: 42 AQI, Bueno', 'aire 42 AQI · Bueno'],
    ['Agua: 8,2 pH, Excelente', 'agua 8,2 pH · Excelente'],
    ['Biodiversidad: 8,7 /10, Alta', 'biodiversidad 8,7/10 · Alta'],
    ['Cobertura forestal: 78 %, Alta', 'cobertura forestal 78 % · Alta'],
  ]) {
    await expectLabel(page, name, `muestra ${label}`);
  }

  {
    const circles = await page.getByLabel(/Calidad ambiental general/).count();
    if (circles === 0) ok('NO muestra círculo de calidad general, como el mockup 1');
    else bad(`muestra ${circles} círculo(s) de calidad general y no debería`);
  }
  await page.screenshot({ path: join(SHOTS, '02-monte-alen.png'), fullPage: true });

  // --- 6. Río Ntem: fiel al mockup 2 -----------------------------------------
  step('6. Río Ntem: círculo de calidad general y subíndices');

  await page.goto(`${origin}/entidad/${ntem.slug}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await expectLabel(page, 'Calidad ambiental general 8,7 sobre 10', 'muestra el círculo 8,7/10');
  for (const [name, label] of [
    ['Aire: 8,9 /10', 'el subíndice de aire 8,9/10'],
    ['Suelo: 8,5 /10, Bueno', 'suelo 8,5/10'],
    ['Biodiversidad: 9,1 /10, Alto', 'biodiversidad 9,1/10'],
    ['Temperatura media: 26,4 °C, Templada', 'la temperatura en Datos clave'],
    ['Aire: 42 AQI, Bueno', 'el AQI crudo, aparte del subíndice'],
  ]) {
    await expectLabel(page, name, `muestra ${label}`);
  }
  await page.screenshot({ path: join(SHOTS, '03-rio-ntem.png'), fullPage: true });

  // --- 7. Valorar -------------------------------------------------------------
  step('7. Valorar desde la interfaz');

  // `exact`: la píldora de la portada también acaba en "Valorar".
  await page.getByRole('button', { name: 'Valorar', exact: true }).click();
  await page.waitForTimeout(900);
  await page.getByRole('radio', { name: 'Valorar con 4 estrellas' }).click();
  await page.getByLabel('Comentario de la valoración').fill('El agua está mejor que el año pasado.');
  await page.screenshot({ path: join(SHOTS, '04-modal-valorar.png') });
  await page.getByRole('button', { name: 'Publicar valoración' }).click();
  await page.waitForTimeout(3500);

  {
    const { data } = await anon
      .from('entity_ratings')
      .select('score, comment')
      .eq('entity_id', ntem.id)
      .eq('user_id', a.id)
      .maybeSingle();
    if (data?.score === 4 && data.comment?.startsWith('El agua')) {
      ok('la valoración quedó en la base de datos con su comentario');
    } else {
      bad(`en la base hay ${JSON.stringify(data)}`);
    }
  }

  await expectLabel(page, 'Valoración 4 de 5 con 1 opiniones', 'la cabecera muestra la media y el número');
  try {
    await page.getByText('El agua está mejor', { exact: false }).first().waitFor({ timeout: 8000 });
    ok('la opinión aparece en la lista');
  } catch {
    bad('la opinión no aparece en la lista');
  }
  await page.screenshot({ path: join(SHOTS, '05-valorada.png'), fullPage: true });

  // --- 8. Volver a valorar sustituye -----------------------------------------
  step('8. Volver a valorar sustituye, no duplica');

  await page.getByRole('button', { name: 'Cambiar valoración' }).click();
  await page.waitForTimeout(900);
  await page.getByRole('radio', { name: 'Valorar con 5 estrellas' }).click();
  await page.getByRole('button', { name: 'Actualizar valoración' }).click();
  await page.waitForTimeout(3500);

  {
    const { count } = await anon
      .from('entity_ratings')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', ntem.id);
    const { data: summary } = await anon
      .from('entity_rating_summary')
      .select('average, ratings_count')
      .eq('entity_id', ntem.id)
      .maybeSingle();

    if (count === 1) ok('sigue habiendo una sola valoración');
    else bad(`hay ${count} valoraciones para el Ntem`);

    if (Number(summary?.average) === 5) ok(`la media de la vista se actualiza a ${summary.average}`);
    else bad(`la media es ${summary?.average}`);
  }

  await expectLabel(page, 'Valoración 5 de 5 con 1 opiniones', 'la cabecera refleja la nota nueva');
  await page.screenshot({ path: join(SHOTS, '06-valoracion-actualizada.png'), fullPage: true });
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message}`);
} finally {
  await browser.close();
  server.close();
}

// --- 9. Limpieza --------------------------------------------------------------
step('9. Limpieza de los datos de prueba');

for (const [account, session] of [
  [cuentaA, a],
  [cuentaB, b],
]) {
  try {
    await session.client.from('entity_ratings').delete().eq('user_id', session.id);
    await session.client.from('profiles').delete().eq('id', session.id);
    ok(`perfil @${account.username} y sus valoraciones eliminados`);
  } catch (caught) {
    bad(`no se pudo limpiar @${account.username}: ${caught.message}`);
  }
}

{
  const { count } = await anon
    .from('entity_ratings')
    .select('*', { count: 'exact', head: true })
    .eq('entity_id', ntem.id);
  if (count === 0) ok('el Ntem se queda sin valoraciones, como estaba');
  else bad(`quedan ${count} valoraciones en el Ntem`);
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f24/');
console.log('\nQuedan 2 usuarios en Authentication → Users (borrarlos requiere service_role):');
console.log(`  ${cuentaA.email}\n  ${cuentaB.email}`);
process.exit(failures === 0 ? 0 : 1);
