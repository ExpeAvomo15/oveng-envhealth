/**
 * Verificación de F2.5: los datos de zona integrados en el feed.
 *
 *   npm run verify:f25                  # construye y verifica
 *   npm run verify:f25 -- --skip-build  # reutiliza dist/
 *
 * Crea una cuenta de prueba con publicaciones suficientes para dos páginas y la
 * limpia al terminar.
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
const SHOTS = join(ROOT, 'docs/verificacion/f25');
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

// Las mismas cajas que src/lib/zones.ts. Si divergen, esta comprobación deja de
// comprobar lo que la app hace.
const ZONES = {
  'guinea-ecuatorial': { name: 'Guinea Ecuatorial', lat: [-1.6, 4.0], lng: [5.0, 11.5] },
  malaga: { name: 'Málaga y Andalucía', lat: [36.0, 38.8], lng: [-7.6, -1.6] },
};

// --- 1. Los datos de zona, SIN sesión ----------------------------------------
step('1. Datos de zona con la clave anónima (sin sesión)');

const zoneData = {};

for (const [id, zone] of Object.entries(ZONES)) {
  const { data: entities, error } = await anon
    .from('entities')
    .select('id, slug, name, type, category')
    .gte('lat', zone.lat[0])
    .lte('lat', zone.lat[1])
    .gte('lng', zone.lng[0])
    .lte('lng', zone.lng[1]);

  if (error) {
    bad(`${zone.name}: ${error.message}`);
    continue;
  }

  const { data: metrics } = await anon
    .from('entity_metrics')
    .select('entity_id, metric, value, unit, label')
    .in('entity_id', entities.map((e) => e.id));

  const byEntity = new Map();
  for (const m of metrics ?? []) {
    byEntity.set(m.entity_id, [...(byEntity.get(m.entity_id) ?? []), m]);
  }

  // Mismo criterio que loadZoneData: lugar con medición de aire, más métricas
  // primero, y a igualdad por nombre.
  const reference = entities
    .filter((e) => e.type === 'lugar')
    .filter((e) => (byEntity.get(e.id) ?? []).some((m) => m.metric === 'aire'))
    .sort((a, b) => {
      const diff = (byEntity.get(b.id)?.length ?? 0) - (byEntity.get(a.id)?.length ?? 0);
      return diff !== 0 ? diff : a.name.localeCompare(b.name, 'es');
    })[0] ?? null;

  const initiatives = entities.filter((e) => e.type === 'iniciativa');
  const featured =
    initiatives.find((e) => e.category === reference?.category) ?? initiatives[0] ?? null;

  const air = reference ? (byEntity.get(reference.id) ?? []).find((m) => m.metric === 'aire') : null;

  zoneData[id] = { zone, reference, featured, air };
  ok(
    `${zone.name}: ${entities.length} entidades · referencia ${reference?.slug ?? '—'} · destacado ${featured?.slug ?? '—'}`,
  );
}

{
  const gq = zoneData['guinea-ecuatorial'];
  if (gq.reference?.slug === 'rio-ntem') ok('la referencia de Guinea Ecuatorial es el Río Ntem');
  else bad(`la referencia de Guinea Ecuatorial es ${gq.reference?.slug}`);

  if (gq.featured?.slug === 'rio-limpio-vida-sana') {
    ok('el destacado de Guinea Ecuatorial es "Río limpio, vida sana" (misma categoría)');
  } else {
    bad(`el destacado de Guinea Ecuatorial es ${gq.featured?.slug}`);
  }

  if (Number(gq.air?.value) === 42 && gq.air?.label === 'Bueno') ok('su aire es 42 AQI · Bueno');
  else bad(`su aire es ${gq.air?.value} ${gq.air?.unit} ${gq.air?.label}`);

  const mal = zoneData.malaga;
  if (mal.reference === null) ok('Málaga NO tiene lugar medido: la tarjeta tendrá que decirlo');
  else bad(`Málaga tiene referencia ${mal.reference.slug} y no debería`);

  if (mal.featured?.slug === 'reforestacion-urbana-malaga') {
    ok('Málaga sí tiene destacado: "Reforestación urbana Málaga"');
  } else {
    bad(`el destacado de Málaga es ${mal.featured?.slug}`);
  }
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

/*
 * --- 3. Cuenta con publicaciones para dos páginas -----------------------------
 *
 * Se siembra **después** del build, no antes. Una ejecución que muriera
 * construyendo —pasó: dos scripts pisándose el `dist`— dejaba las veintidós
 * publicaciones en la base para siempre, porque la limpieza está al final. Lo
 * que se crea, se crea lo más tarde posible.
 */
step('3. Sembrando publicaciones');

const stamp = Date.now().toString(36);
const account = {
  email: `oveng-f25-${stamp}@ovengtest.dev`,
  password: `Verif-${stamp}-2026`,
  username: `f25${stamp}`.slice(0, 30).toLowerCase(),
  displayName: 'Cuenta de prueba F2.5',
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
  bad(`no se pudo crear la cuenta: ${authError?.message ?? 'sin sesión'}`);
  process.exit(1);
}
const uid = auth.user.id;

const TOTAL_POSTS = 22;
{
  const now = Date.now();
  const rows = Array.from({ length: TOTAL_POSTS }, (_, index) => ({
    author_id: uid,
    content: `Publicación de prueba número ${index + 1}.`,
    // Fechas descendentes para que el orden del feed sea predecible.
    created_at: new Date(now - index * 60_000).toISOString(),
  }));
  const { error: postsError } = await user.from('posts').insert(rows);
  if (postsError) bad(`no se pudieron sembrar las publicaciones: ${postsError.message}`);
  else ok(`${TOTAL_POSTS} publicaciones sembradas (dos páginas de 20)`);
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4183 });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();

const zoneTitle = () => page.getByRole('button', { name: /^Zona: / });
const featuredCard = () => page.getByRole('link', { name: /^Destacado: / });
const postLinks = () => page.getByRole('link', { name: `Perfil de ${account.displayName}` });

async function login() {
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(account.email);
  await page.getByPlaceholder('Tu contraseña').fill(account.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(4000);
}

try {
  // --- 4. La tarjeta en el feed ----------------------------------------------
  step('4. La tarjeta de zona en el feed');

  await login();
  await zoneTitle().waitFor({ state: 'visible', timeout: 20000 });
  ok('la tarjeta de zona aparece en el feed');

  {
    const label = await zoneTitle().getAttribute('aria-label');
    if (label?.includes('Guinea Ecuatorial')) ok('arranca en Guinea Ecuatorial, la zona por defecto');
    else bad(`la zona de partida es «${label}»`);
  }

  for (const [name, label] of [
    ['Calidad del aire en Río Ntem', 'la medición nombra el lugar que la mide'],
    ['Calidad general', 'muestra una métrica secundaria'],
  ]) {
    try {
      await page.getByLabel(name, { exact: false }).first().waitFor({ timeout: 10000 });
      ok(label);
    } catch {
      bad(`${label} — no apareció «${name}»`);
    }
  }

  // El contenido social va primero: la tarjeta va tras la tercera publicación.
  {
    /*
     * Cualquier publicación, no solo las de esta cuenta: en la base hay
     * publicaciones reales y de otras pruebas, y el feed las mezcla por fecha.
     * Lo que se comprueba es la posición de la tarjeta en el feed, no de quién
     * son las tres publicaciones que tiene encima.
     */
    const anyPost = page.getByRole('link', { name: /^Perfil de / });
    const third = await anyPost.nth(2).boundingBox();
    const fourth = await anyPost.nth(3).boundingBox();
    const card = await zoneTitle().boundingBox();

    if (third && fourth && card && card.y > third.y && card.y < fourth.y) {
      ok('la tarjeta va tras la tercera publicación, no encabezando el feed');
    } else {
      bad(`posiciones inesperadas: 3ª=${third?.y} tarjeta=${card?.y} 4ª=${fourth?.y}`);
    }
  }

  await featuredCard().waitFor({ state: 'visible', timeout: 10000 });
  {
    const label = await featuredCard().getAttribute('aria-label');
    if (label?.includes('Río limpio, vida sana')) ok(`el destacado es «${label}»`);
    else bad(`el destacado es «${label}»`);
  }
  await page.screenshot({ path: join(SHOTS, '01-feed-zona.png') });

  // Las dos tarjetas van seguidas y no caben en una pantalla: se baja hasta el
  // destacado para dejar constancia de cómo se ve.
  await featuredCard().scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(SHOTS, '01b-destacado.png') });

  // --- 5. Paginación sin duplicar --------------------------------------------
  step('5. La página 2 no duplica las tarjetas');

  for (let i = 0; i < 12; i += 1) {
    await page.mouse.wheel(0, 2200);
    await page.waitForTimeout(450);
  }
  await page.waitForTimeout(2500);

  {
    /*
     * Cualquier publicación, no solo las de esta cuenta: en la base hay
     * publicaciones reales y de otras pruebas, y el feed las mezcla por fecha,
     * así que las veintidós sembradas no tienen por qué caber en las dos
     * primeras páginas. Lo que se comprueba es que el feed pasó de una página.
     */
    const posts = await page.getByRole('link', { name: /^Perfil de / }).count();
    if (posts > 20) ok(`se cargó la segunda página (${posts} publicaciones a la vista)`);
    else bad(`solo hay ${posts} publicaciones: la segunda página no entró`);

    const cards = await zoneTitle().count();
    const featured = await featuredCard().count();
    if (cards === 1 && featured === 1) ok('sigue habiendo una tarjeta de zona y un destacado');
    else bad(`hay ${cards} tarjetas de zona y ${featured} destacados`);
  }
  await page.screenshot({ path: join(SHOTS, '02-pagina-2.png') });

  // --- 6. Cambio de zona ------------------------------------------------------
  step('6. Cambiar de zona');

  await page.mouse.wheel(0, -30000);
  await page.waitForTimeout(1500);
  await zoneTitle().click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: join(SHOTS, '03-selector-zona.png') });
  await page.getByRole('radio', { name: 'Zona Málaga y Andalucía' }).click();
  await page.waitForTimeout(3000);

  {
    const label = await zoneTitle().getAttribute('aria-label');
    if (label?.includes('Málaga')) ok('la tarjeta pasa a Málaga y Andalucía');
    else bad(`la zona es «${label}»`);
  }

  /*
   * Desde F4.1 Málaga, sin ningún lugar medido, enseña el aire en vivo del
   * centro de la zona. Solo si Open-Meteo no respondiera volvería a decir que
   * no hay mediciones; las dos cosas son correctas y ninguna es desaparecer.
   * El aire en vivo lo comprueba a fondo verify:f41.
   */
  try {
    await page
      .getByLabel(/^Calidad del aire en Málaga y Andalucía: |Todavía no hay mediciones en Málaga/)
      .or(page.getByText('Todavía no hay mediciones en Málaga', { exact: false }))
      .first()
      .waitFor({ timeout: 10000 });
    ok('la tarjeta se queda en Málaga: aire en vivo, o el aviso de que no hay mediciones');
  } catch {
    bad('la tarjeta de Málaga no enseña ni el aire en vivo ni el aviso');
  }

  {
    const label = await featuredCard().getAttribute('aria-label');
    if (label?.includes('Reforestación urbana Málaga')) ok(`el destacado cambia a «${label}»`);
    else bad(`el destacado es «${label}»`);
  }
  await page.screenshot({ path: join(SHOTS, '04-zona-malaga.png') });

  // --- 7. Persistencia --------------------------------------------------------
  step('7. La zona elegida sobrevive a la recarga');

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  await zoneTitle().waitFor({ state: 'visible', timeout: 20000 });

  {
    const label = await zoneTitle().getAttribute('aria-label');
    if (label?.includes('Málaga')) ok('tras recargar sigue en Málaga');
    else bad(`tras recargar la zona es «${label}»`);
  }

  // Se vuelve a Guinea Ecuatorial para navegar desde la medición.
  await zoneTitle().click();
  await page.waitForTimeout(900);
  await page.getByRole('radio', { name: 'Zona Guinea Ecuatorial' }).click();
  await page.waitForTimeout(3000);

  // --- 8. Navegación desde las tarjetas ---------------------------------------
  step('8. De las tarjetas a los perfiles ambientales');

  await page.getByRole('link', { name: /Calidad del aire en Río Ntem/ }).first().click();
  await page.waitForTimeout(3500);
  {
    const path = new URL(page.url()).pathname.replace(basePath, '');
    if (path === '/entidad/rio-ntem') ok(`la medición lleva a ${path}`);
    else bad(`la medición lleva a ${path}`);
  }
  await page.screenshot({ path: join(SHOTS, '05-desde-la-medicion.png') });

  await page.goBack();
  await page.waitForTimeout(3500);
  await featuredCard().click();
  await page.waitForTimeout(3500);
  {
    const path = new URL(page.url()).pathname.replace(basePath, '');
    if (path === '/entidad/rio-limpio-vida-sana') ok(`el destacado lleva a ${path}`);
    else bad(`el destacado lleva a ${path}`);
  }
  await page.screenshot({ path: join(SHOTS, '06-desde-el-destacado.png') });

  // --- 9. Feed con pocas o ninguna publicación ---------------------------------
  step('9. Con menos de tres publicaciones, las tarjetas van al final');

  await user.from('posts').delete().eq('author_id', uid);
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);

  try {
    await zoneTitle().waitFor({ state: 'visible', timeout: 20000 });
    ok('la tarjeta de zona se ve igual con el feed casi vacío');
  } catch {
    bad('con pocas publicaciones la tarjeta de zona desaparece');
  }

  /*
   * Cuántas publicaciones quedan no lo decide esta comprobación: son las reales
   * de la base, que no se tocan. Así que se pregunta y se comprueba la rama que
   * toque — con cero, el estado vacío; con una o dos, que las tarjetas hayan
   * bajado al final en vez de colarse tras la tercera, que no existe.
   */
  const { count: restantes } = await anon
    .from('posts')
    .select('*', { count: 'exact', head: true });
  info(`quedan ${restantes} publicaciones reales en la base`);

  if (restantes === 0) {
    try {
      await page.getByText('Sé el primero en publicar', { exact: false }).first().waitFor({ timeout: 10000 });
      ok('con el feed vacío se ve el estado vacío, y las tarjetas debajo');
    } catch {
      bad('el estado vacío del feed no aparece');
    }
  } else {
    /*
     * Con tres o más publicaciones la tarjeta va tras la tercera; con una o dos,
     * al final. Cuántas quedan lo dice la base, no esta comprobación: son las
     * reales y no se tocan.
     */
    const anyPost = page.getByRole('link', { name: /^Perfil de / });
    const reference = restantes >= 3 ? anyPost.nth(2) : anyPost.last();
    const post = await reference.boundingBox();
    const card = await zoneTitle().boundingBox();

    if (post && card && card.y > post.y) {
      ok(
        restantes >= 3
          ? `con ${restantes} publicaciones la tarjeta sigue tras la tercera`
          : `con ${restantes} publicación(es) las tarjetas bajan al final`,
      );
    } else {
      bad(`posiciones inesperadas: publicación=${post?.y} tarjeta=${card?.y}`);
    }
  }
  await page.screenshot({ path: join(SHOTS, '07-feed-con-pocas.png') });
} catch (caught) {
  bad(`recorrido interrumpido: ${caught.message}`);
  await page.screenshot({ path: join(SHOTS, '99-estado-al-fallar.png') }).catch(() => {});
} finally {
  await browser.close();
  server.close();
}

// --- 10. Limpieza --------------------------------------------------------------
step('10. Limpieza de los datos de prueba');

try {
  await user.from('posts').delete().eq('author_id', uid);
  await user.from('profiles').delete().eq('id', uid);
  ok(`perfil @${account.username} y sus publicaciones eliminados`);
} catch (caught) {
  bad(`no se pudo limpiar: ${caught.message}`);
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('Capturas en docs/verificacion/f25/');
console.log(`\nQueda 1 usuario en Authentication → Users: ${account.email}`);
process.exit(failures === 0 ? 0 : 1);
