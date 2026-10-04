/**
 * Verificación de F2.2: el directorio de Buscar y seguir entidades.
 *
 * Comprueba las dos capas, porque una sin la otra engaña:
 * - en la base de datos, que RLS deja hacer lo que debe y bloquea lo que no;
 * - en el navegador, que desde Buscar se encuentran, se navegan y se siguen las
 *   entidades sembradas.
 *
 *   npm run verify:f22                  # construye y verifica
 *   npm run verify:f22 -- --skip-build  # reutiliza dist/
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
const SHOTS = join(ROOT, 'docs/verificacion/f22');
const skipBuild = process.argv.includes('--skip-build');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

let failures = 0;
let blocked = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ✗ ${m}`);
};
/** No se ha podido comprobar por algo pendiente, no por un fallo del código. */
const pending = (m) => {
  blocked += 1;
  console.log(`  ⋯ ${m}`);
};
const info = (m) => console.log(`  · ${m}`);
const step = (m) => console.log(`\n${m}`);

const anon = createClient(url, anonKey, { auth: { persistSession: false } });

// --- 1. Requisitos -----------------------------------------------------------
step('1. Requisitos: entidades sembradas (F2.1)');

const { data: entities, error: entitiesError } = await anon
  .from('entities')
  .select('id, slug, name, type, category');

if (entitiesError) {
  bad(`no se pueden leer las entidades: ${entitiesError.message}`);
  console.log('\nAplica la migración 003 y ejecuta el seed. Ver npm run verify:f21.');
  process.exit(1);
}

if (entities.length === 0) {
  bad('no hay entidades sembradas');
  console.log('\nEjecuta el seed: SUPABASE_SERVICE_ROLE_KEY=\'...\' npm run seed:entities');
  process.exit(1);
}
ok(`${entities.length} entidades disponibles`);

const monteAlen = entities.find((e) => e.slug === 'parque-nacional-monte-alen');
if (monteAlen) ok('Monte Alén está en el directorio');
else bad('falta Monte Alén: el resto de la verificación lo usa');

// --- 2. ¿Está la migración 004? ----------------------------------------------
step('2. Migración 004 (entity_follows)');

const { error: followsProbe } = await anon.from('entity_follows').select('user_id').limit(1);
const followsReady = !followsProbe;

if (followsReady) {
  ok('"entity_follows" existe y es legible en público');
} else if (followsProbe.code === '42P01' || followsProbe.code === 'PGRST205') {
  pending('"entity_follows" no existe todavía — falta aplicar 004_entity_follows.sql');
  info('El directorio y la navegación sí se comprueban; seguir entidades no.');
} else {
  bad(`"entity_follows": ${followsProbe.message}`);
}

// --- 3. Búsqueda en la capa de datos -----------------------------------------
step('3. Búsqueda sobre entities');

{
  const { data } = await anon.from('entities').select('slug').ilike('name', '%monte%');
  if (data?.some((e) => e.slug === 'parque-nacional-monte-alen')) {
    ok('"monte" encuentra Monte Alén por nombre');
  } else {
    bad('"monte" no encuentra Monte Alén');
  }
}

{
  // La descripción también se busca: "gorilas" solo aparece ahí.
  const { data } = await anon.from('entities').select('slug').ilike('description', '%gorilas%');
  if (data && data.length > 0) ok('la búsqueda alcanza la descripción');
  else bad('la descripción no se está buscando');
}

{
  const { data } = await anon.from('entities').select('slug, type').eq('type', 'empresa');
  if (data && data.length === 5 && data.every((e) => e.type === 'empresa')) {
    ok('el filtro por tipo devuelve las 5 empresas y nada más');
  } else {
    bad(`el filtro por tipo devuelve ${data?.length} filas`);
  }
}

// --- 4. Cuenta de prueba y RLS de entity_follows ------------------------------
step('4. RLS de entity_follows');

const stamp = Date.now().toString(36);
const account = {
  email: `oveng-f22-${stamp}@ovengtest.dev`,
  password: `Verif-${stamp}-2026`,
  username: `f22${stamp}`.slice(0, 30).toLowerCase(),
  displayName: 'Cuenta de prueba F2.2',
};

const user = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const { data: auth, error: authError } = await user.auth.signUp({
  email: account.email,
  password: account.password,
  options: { data: { username: account.username, display_name: account.displayName } },
});

if (authError || !auth.session) {
  bad(`no se pudo crear la cuenta de prueba: ${authError?.message ?? 'sin sesión'}`);
  process.exit(1);
}
const uid = auth.user.id;
ok(`creada @${account.username}`);

if (followsReady && monteAlen) {
  {
    const { error } = await user
      .from('entity_follows')
      .insert({ user_id: uid, entity_id: monteAlen.id });
    if (error) bad(`no se ha podido seguir: ${error.message}`);
    else ok('una cuenta con sesión puede seguir una entidad');
  }

  {
    const { error } = await user
      .from('entity_follows')
      .insert({ user_id: uid, entity_id: monteAlen.id });
    if (error?.code === '23505') ok('no se puede seguir dos veces la misma entidad');
    else bad('el seguimiento duplicado no fue rechazado');
  }

  {
    const { error } = await user.from('entity_follows').insert({
      user_id: '00000000-0000-0000-0000-000000000000',
      entity_id: monteAlen.id,
    });
    if (error) ok('no se puede seguir en nombre de otra cuenta');
    else bad('¡se ha seguido en nombre de otra cuenta!');
  }

  {
    const { error } = await anon
      .from('entity_follows')
      .insert({ user_id: uid, entity_id: monteAlen.id });
    if (error) ok(`un anónimo no puede seguir (${error.code ?? 'denegado'})`);
    else bad('¡un anónimo ha seguido una entidad!');
  }

  // Se deja limpio para que la comprobación del navegador empiece sin seguir.
  await user.from('entity_follows').delete().eq('user_id', uid);
} else {
  pending('seguir entidades: sin 004 no se puede comprobar');
}

// --- 5. Build y navegador ----------------------------------------------------
step('5. Construyendo el export web');

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
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4179 });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

const consoleErrors = [];
page.on('pageerror', (error) => consoleErrors.push(error.message));

/** Espera a un elemento por su nombre accesible (aria-label). */
const expectLabel = async (name, label, timeout = 10000) => {
  try {
    await page.getByLabel(name, { exact: false }).first().waitFor({ state: 'visible', timeout });
    ok(label);
  } catch {
    bad(`${label} — no apareció nada con nombre accesible "${name}"`);
  }
};

/** Espera a un rol con nombre accesible: no se busca por texto suelto. */
const expectRole = async (role, name, label, timeout = 10000) => {
  try {
    await page.getByRole(role, { name }).first().waitFor({ state: 'visible', timeout });
    ok(label);
    return true;
  } catch {
    bad(`${label} — no apareció ${role} "${name}"`);
    return false;
  }
};

try {
  // --- Entrar ----------------------------------------------------------------
  step('6. Entrar y abrir Buscar');

  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(account.email);
  await page.getByPlaceholder('Tu contraseña').fill(account.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  await page.getByRole('tab', { name: 'Buscar' }).click();
  await page.waitForTimeout(1200);

  await expectRole('tab', 'Todo', 'Buscar monta con sus chips de alcance');
  await expectRole('button', 'Energía renovable. Empresas e iniciativas', 'se ven las Sugerencias');
  await expectRole('button', 'Buscar Reforestación', 'se ven las Tendencias');
  await shot('01-buscar-sugerencias');

  // --- Buscar "monte" --------------------------------------------------------
  step('7. Buscar "monte"');

  // Por rol y nombre: "Buscar" es además la etiqueta de una pestaña de la barra.
  const field = page.getByRole('textbox', { name: 'Buscar' });
  await field.fill('monte');
  await page.waitForTimeout(2000);

  const found = await expectRole(
    'link',
    /Parque Nacional de Monte Alén/,
    '"monte" encuentra Monte Alén en pantalla',
  );
  await expectRole('button', 'Ver todo en Lugares', 'los resultados se agrupan por tipo');
  await shot('02-resultados-monte');

  // --- Chip de Empresas ------------------------------------------------------
  step('8. El chip Empresas filtra');

  await field.fill('');
  await page.waitForTimeout(600);
  await page.getByRole('tab', { name: 'Empresas' }).click();
  await page.waitForTimeout(2000);

  {
    // Se comparan los nombres en pantalla con los que la base dice que son
    // empresas: comprobar solo "hay 5 fichas" pasaría igual con cinco fichas
    // equivocadas.
    const labels = (
      await Promise.all((await page.getByRole('link').all()).map((row) => row.getAttribute('aria-label')))
    ).filter((label) => typeof label === 'string');

    const onScreen = new Set(labels.map((label) => label.split('. ')[0]));
    const expected = entities.filter((e) => e.type === 'empresa').map((e) => e.name);
    const missing = expected.filter((name) => !onScreen.has(name));
    const extra = [...onScreen].filter((name) => !expected.includes(name));

    if (missing.length === 0 && extra.length === 0) {
      ok(`el chip Empresas deja las ${expected.length} empresas y nada más`);
    } else {
      bad(
        `el chip Empresas: faltan [${missing.join(', ')}], sobran [${extra.join(', ')}]`,
      );
    }
  }
  await shot('03-chip-empresas');

  // --- Seguir una entidad ----------------------------------------------------
  step('9. Seguir una entidad');

  if (followsReady) {
    const followButton = page.getByRole('button', { name: 'Seguir' }).first();
    await followButton.click();
    await page.waitForTimeout(2500);

    await expectRole('button', 'Siguiendo', 'el botón pasa a "Siguiendo"');

    const { data: rows } = await user
      .from('entity_follows')
      .select('entity_id')
      .eq('user_id', uid);

    if (rows && rows.length === 1) {
      const followed = entities.find((e) => e.id === rows[0].entity_id);
      ok(`el seguimiento quedó en la base de datos (${followed?.slug ?? rows[0].entity_id})`);
    } else {
      bad(`hay ${rows?.length ?? 0} filas en entity_follows, se esperaba 1`);
    }
    await shot('04-entidad-seguida');
  } else {
    pending('seguir desde la interfaz: sin 004 no se puede comprobar');
  }

  // --- Ficha de entidad ------------------------------------------------------
  step('10. Navegar a la ficha de una entidad');

  if (found) {
    // Volver a "Todo": el paso anterior dejó el chip Empresas puesto, y ahí
    // "monte" no encuentra nada porque Monte Alén es un lugar.
    await page.getByRole('tab', { name: 'Todo' }).click();
    await page.waitForTimeout(600);
    await field.fill('monte');
    await page.waitForTimeout(2000);
    await page.getByRole('link', { name: /Parque Nacional de Monte Alén/ }).first().click();
    await page.waitForTimeout(2500);

    const path = new URL(page.url()).pathname;
    if (path.endsWith('/entidad/parque-nacional-monte-alen')) {
      ok(`la ficha abre en ${path}`);
    } else {
      bad(`tras tocar la ficha la ruta es ${path}`);
    }

    // Por rol y nombre accesible, no por texto: el nombre se parte en dos
    // líneas y buscarlo como cadena ya falló en F1.4 y aquí. Ver notas-archivo-f0-f2.md.
    await expectRole('heading', /Parque Nacional de Monte Alén/, 'la ficha muestra el nombre');

    /*
     * Desde F2.4 la ficha es el perfil ambiental completo y no la pantalla
     * mínima: el tipo y la categoría son dos píldoras separadas, las métricas
     * viven bajo "Estado por capa" y el aviso de "perfil completo en F2.4" ya
     * no existe, porque F2.4 está construida. Aquí solo se comprueba que desde
     * Buscar se llega a la ficha correcta; lo que la ficha enseña lo verifica
     * `npm run verify:f24`.
     */
    await expectLabel('Cobertura forestal: 78 %', 'la ficha muestra sus métricas');
    await expectLabel('Biodiversidad: 8,7 /10', 'muestra el estado por capa');

    // Por rol: las píldoras de tipo y categoría no tienen nombre accesible
    // propio, y buscarlas por texto es lo que ya ha fallado tres veces.
    await expectRole('button', 'Valorar', 'la ficha ofrece valorar');
    await shot('05-ficha-entidad');
  } else {
    pending('ficha de entidad: no se llegó a encontrar Monte Alén');
  }

  // --- Buscar una persona ----------------------------------------------------
  step('11. Buscar una persona y abrir su perfil');

  // La ficha de entidad no tiene barra de pestañas —es una ruta de Stack, como
  // el perfil ajeno—, así que se vuelve con el botón de la propia pantalla.
  await page.getByRole('button', { name: 'Volver' }).first().click();
  await page.waitForTimeout(2000);
  await page.getByRole('tab', { name: 'Personas' }).click();
  await page.waitForTimeout(600);

  const searchField = page.getByRole('textbox', { name: 'Buscar' });
  await searchField.fill(account.username);
  await page.waitForTimeout(2200);

  await expectRole('link', new RegExp(account.username), 'la búsqueda encuentra la cuenta');
  await shot('06-resultado-persona');

  await page.getByRole('link', { name: new RegExp(account.username) }).first().click();
  await page.waitForTimeout(2500);

  {
    const path = new URL(page.url()).pathname;
    if (path.endsWith(`/user/${account.username}`)) ok(`el perfil abre en ${path}`);
    else bad(`tras tocar la persona la ruta es ${path}`);
  }
  await shot('07-perfil-persona');
} catch (error) {
  bad(`recorrido interrumpido: ${error.message}`);
  await shot('99-estado-al-fallar');
} finally {
  if (consoleErrors.length > 0) {
    step('Errores de consola del navegador');
    for (const message of [...new Set(consoleErrors)].slice(0, 5)) {
      console.log(`  ! ${message.slice(0, 200)}`);
    }
  }

  await browser.close();
  server.close();
}

// --- Limpieza ----------------------------------------------------------------
step('12. Limpieza de los datos de prueba');

try {
  if (followsReady) await user.from('entity_follows').delete().eq('user_id', uid);
  await user.from('follows').delete().eq('follower_id', uid);
  await user.from('profiles').delete().eq('id', uid);
  ok(`perfil @${account.username} eliminado`);
} catch (error) {
  bad(`no se pudo limpiar @${account.username}: ${error.message}`);
}

console.log('\n' + '─'.repeat(64));
if (failures === 0 && blocked === 0) {
  console.log('RESULTADO: todo correcto.');
} else if (failures === 0) {
  console.log(`RESULTADO: lo comprobado está bien, pero quedan ${blocked} comprobación(es) sin hacer.`);
  console.log('Aplica supabase/migrations/004_entity_follows.sql y vuelve a ejecutar.');
} else {
  console.log(`RESULTADO: ${failures} fallo(s)${blocked > 0 ? ` y ${blocked} sin comprobar` : ''}.`);
}
console.log(`Capturas en docs/verificacion/f22/`);
console.log(`\nQueda 1 usuario en Authentication → Users (borrarlo requiere service_role):`);
console.log(`  ${account.email}`);

process.exit(failures === 0 && blocked === 0 ? 0 : 1);
