/**
 * Verificación de F1.4: composición de publicaciones.
 *
 * Publica de verdad desde la interfaz y comprueba la fila resultante en la base
 * de datos. El parseo de etiquetas se valida por su efecto —lo que queda en
 * `hashtags[]`— y no reimplementando la expresión regular aquí, que sería
 * comprobar que una copia coincide con otra copia.
 *
 *   npm run verify:f14                  # construye y verifica
 *   npm run verify:f14 -- --skip-build  # reutiliza dist/
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const ROOT = process.cwd();
const SHOTS = join(ROOT, 'docs/verificacion/f1');
const TMP = join(ROOT, '.tmp-verify');
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

const stamp = Date.now().toString(36);
const account = (role) => ({
  email: `oveng-f14-${role}-${stamp}@ovengtest.dev`,
  password: `Verif-${role}-${stamp}-2026`,
  username: `f14${role}${stamp}`.slice(0, 30).toLowerCase(),
  displayName: role === 'a' ? 'Autora de prueba' : 'Otra cuenta',
});

const alice = account('a');
const bob = account('b');

async function signUp(acc) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signUp({
    email: acc.email,
    password: acc.password,
    options: { data: { username: acc.username, display_name: acc.displayName } },
  });
  if (error) throw new Error(`no se pudo crear ${acc.username}: ${error.message}`);
  if (!data.session) throw new Error('el registro no devolvió sesión: ¿"Confirm email" activado?');
  return { client, id: data.user.id };
}

step('1. Cuentas de prueba');
const a = await signUp(alice);
const b = await signUp(bob);
ok(`creadas @${alice.username} y @${bob.username}`);

// --- RLS ---------------------------------------------------------------------
step('2. RLS al publicar');
{
  const { error } = await a.client
    .from('posts')
    .insert({ author_id: b.id, content: 'publicando en nombre de otra cuenta' });

  if (error) ok('A no puede publicar como B');
  else bad('¡A ha publicado en nombre de B! Revisa las políticas de posts');
}
{
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const { error } = await a.client.storage
    .from('post-images')
    .upload(`${b.id}/intruso.jpg`, bytes, { contentType: 'image/jpeg' });

  if (error) ok('A no puede subir imágenes a la carpeta de B');
  else bad('¡A ha escrito en la carpeta de B en post-images!');
}

// --- Build -------------------------------------------------------------------
step('3. Construyendo el export web');
if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}

const bundleDir = join(ROOT, 'dist/_expo/static/js/web');
const entry = readdirSync(bundleDir).find((f) => f.startsWith('entry-') && f.endsWith('.js'));
if (entry && readFileSync(join(bundleDir, entry), 'utf8').includes(url)) {
  ok('el bundle apunta al Supabase del .env');
} else {
  bad('el bundle no apunta al Supabase del .env (¿caché de Metro?)');
}

mkdirSync(SHOTS, { recursive: true });
mkdirSync(TMP, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4175 });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`) });

// Imagen de prueba apaisada: 1800 px de ancho, para que el límite de 1600 actúe.
const photoPath = join(TMP, 'foto-prueba.jpg');
{
  const canvasPage = await context.newPage();
  const dataUrl = await canvasPage.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1800;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, 1200);
    sky.addColorStop(0, '#02B8D1');
    sky.addColorStop(1, '#A5D6A7');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1800, 1200);
    ctx.fillStyle = '#2E7D32';
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(160 + i * 300, 900, 200, Math.PI, 0);
      ctx.fill();
    }
    return canvas.toDataURL('image/jpeg', 0.9);
  });
  writeFileSync(photoPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await canvasPage.close();
  ok('imagen de prueba generada (1800×1200 JPEG)');
}

const seen = (t) => page.getByText(t, { exact: false }).first();
const expectVisible = async (text, label) => {
  try {
    await seen(text).waitFor({ state: 'visible', timeout: 8000 });
    ok(label);
  } catch {
    bad(`${label} — no apareció "${text}"`);
  }
};

async function openComposer() {
  await page.getByRole('button', { name: 'Crear publicación' }).click();
  await page.waitForTimeout(1500);
}

try {
  step('4. Entrar y abrir el compositor');

  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(alice.email);
  await page.getByPlaceholder('Tu contraseña').fill(alice.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  await openComposer();
  // El placeholder es un atributo, no texto del DOM: getByText no lo ve.
  if (await page.getByPlaceholder('¿Qué está pasando en tu entorno?').isVisible()) {
    ok('el compositor muestra su placeholder');
  } else {
    bad('el compositor no muestra el placeholder esperado');
  }
  await expectVisible(`@${alice.username}`, 'muestra el autor como contexto');

  // --- El campo crece con el texto ------------------------------------------
  step('5. El campo de texto crece con el contenido');
  {
    const field = page.getByPlaceholder('¿Qué está pasando en tu entorno?');
    const alto = () => field.evaluate((n) => n.clientHeight);

    await field.fill('Una línea');
    await page.waitForTimeout(500);
    const altoCorto = await alto();

    await field.fill(Array.from({ length: 8 }, (_, i) => `Línea ${i + 1}`).join('\n'));
    await page.waitForTimeout(600);
    const altoLargo = await alto();

    if (altoLargo > altoCorto) ok(`el campo crece: ${altoCorto}px → ${altoLargo}px`);
    else bad(`el campo no crece (${altoCorto}px con 1 línea, ${altoLargo}px con 8)`);

    await field.fill('');
    await page.waitForTimeout(400);
  }

  // --- Solo texto con etiquetas ---------------------------------------------
  step('6. Publicar solo texto, con etiquetas');

  const textoConEtiquetas = 'Plantamos árboles #Reforestación #GuineaEcuatorial';
  const composer = page.getByLabel('Texto de la publicación');
  await composer.fill(textoConEtiquetas);
  await page.waitForTimeout(800);

  await expectVisible('#reforestación', 'las etiquetas se detectan y se muestran normalizadas');
  await shot('17-compositor-texto');

  await page.getByText('Publicar', { exact: true }).first().click();
  await page.waitForTimeout(3500);

  {
    const { data: post } = await a.client
      .from('posts')
      .select('content, hashtags, image_url')
      .eq('author_id', a.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (post?.content === textoConEtiquetas) ok('el texto se guardó tal cual');
    else bad(`el contenido guardado es "${post?.content}"`);

    const esperado = ['reforestación', 'guineaecuatorial'];
    const obtenido = post?.hashtags ?? [];
    if (JSON.stringify(obtenido) === JSON.stringify(esperado)) {
      ok(`hashtags = ${JSON.stringify(obtenido)} — tildes conservadas, minúsculas, sin #`);
    } else {
      bad(`hashtags = ${JSON.stringify(obtenido)}, se esperaba ${JSON.stringify(esperado)}`);
    }

    if (post?.image_url === null) ok('image_url queda nulo al publicar sin imagen');
    else bad(`image_url debería ser null, es "${post?.image_url}"`);
  }

  await shot('17b-tras-publicar');
  const rutaTrasPublicar = new URL(page.url()).pathname;
  if (rutaTrasPublicar === `${basePath}/`) ok(`al publicar vuelve a Inicio (${rutaTrasPublicar})`);
  else bad(`tras publicar la ruta es ${rutaTrasPublicar}`);
  await expectVisible('Tu feed aparecerá aquí', 'el modal se ha cerrado y se ve Inicio');

  // --- Con imagen ------------------------------------------------------------
  step('7. Publicar con imagen');

  await openComposer();
  await page.getByLabel('Texto de la publicación').fill('Jornada de limpieza en la ribera #Agua');
  await page.waitForTimeout(500);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    page.getByText('Añadir imagen', { exact: true }).first().click(),
  ]);
  await chooser.setFiles(photoPath);
  await page.waitForTimeout(2500);

  await expectVisible('Cambiar imagen', 'la vista previa aparece con opción de cambiarla');
  await shot('18-compositor-imagen');

  await page.getByText('Publicar', { exact: true }).first().click();
  await page.waitForTimeout(6000);

  {
    const { data: post } = await a.client
      .from('posts')
      .select('content, hashtags, image_url')
      .eq('author_id', a.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (post?.image_url?.includes(`${a.id}/post-`)) {
      ok('image_url apunta a la carpeta del propio autor');

      const response = await page.request.get(post.image_url);
      const bytes = Number(response.headers()['content-length'] ?? 0);
      if (response.ok()) ok(`la imagen se sirve pública (HTTP ${response.status()}, ${bytes} bytes)`);
      else bad(`la imagen no se puede descargar (HTTP ${response.status()})`);
    } else {
      bad(`image_url inesperado: ${post?.image_url}`);
    }

    if (JSON.stringify(post?.hashtags) === JSON.stringify(['agua'])) {
      ok('la etiqueta de esta publicación se guardó bien');
    } else {
      bad(`hashtags = ${JSON.stringify(post?.hashtags)}, se esperaba ["agua"]`);
    }
  }

  // --- Límite de 500 ---------------------------------------------------------
  step('8. Límite de 500 caracteres');

  await openComposer();
  await page.getByLabel('Texto de la publicación').fill('á'.repeat(510));
  await page.waitForTimeout(1000);

  const publicar = page.getByRole('button', { name: 'Publicar' }).first();
  const disabled = await publicar.evaluate((node) => node.getAttribute('aria-disabled'));
  if (disabled === 'true') ok('con 510 caracteres el botón Publicar queda deshabilitado');
  else bad(`el botón Publicar no está deshabilitado (aria-disabled="${disabled}")`);

  await expectVisible('-10', 'el contador muestra cuántos caracteres sobran');
  await shot('19-limite-caracteres');

  {
    const { count } = await a.client
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', a.id);
    if (count === 2) ok('siguen siendo 2 publicaciones: nada se coló pasado el límite');
    else bad(`hay ${count} publicaciones, se esperaban 2`);
  }
} catch (error) {
  bad(`recorrido interrumpido: ${error.message.split('\n')[0]}`);
  await shot('99-f14-estado-al-fallar');
} finally {
  await browser.close();
  server.close();
}

// --- Limpieza ----------------------------------------------------------------
step('9. Limpieza de los datos de prueba');
for (const [acc, session] of [
  [alice, a],
  [bob, b],
]) {
  try {
    for (const bucket of ['post-images', 'avatars']) {
      const { data: files } = await session.client.storage.from(bucket).list(session.id);
      if (files && files.length > 0) {
        await session.client.storage
          .from(bucket)
          .remove(files.map((f) => `${session.id}/${f.name}`));
        info(`borrados ${files.length} archivo(s) de ${bucket}/${acc.username}`);
      }
    }

    await session.client.from('posts').delete().eq('author_id', session.id);
    await session.client.from('follows').delete().eq('follower_id', session.id);
    await session.client.from('profiles').delete().eq('id', session.id);
    ok(`perfil @${acc.username} y sus publicaciones eliminados`);
  } catch (error) {
    bad(`no se pudo limpiar @${acc.username}: ${error.message}`);
  }
}

rmSync(TMP, { recursive: true, force: true });

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log('\nQuedan 2 usuarios en Authentication → Users (borrarlos requiere service_role):');
console.log(`  ${alice.email}`);
console.log(`  ${bob.email}`);
process.exit(failures === 0 ? 0 : 1);
