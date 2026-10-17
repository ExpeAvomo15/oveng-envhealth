/**
 * Capturas de la pasada visual F4.6b: la app entera, pantalla a pantalla.
 *
 *   npm run capture:f46b -- antes
 *   npm run capture:f46b -- despues               # mismas pantallas, mismos nombres
 *   npm run capture:f46b -- despues --skip-build  # reutiliza dist/
 *
 * Deja las imágenes en docs/verificacion/f46b/<etiqueta>/. Siembra tres
 * cuentas —A, que mira; B, con quien A tiene un chat; C, que le pide hablar— y
 * una publicación con foto, para que el feed, el perfil y los mensajes no
 * salgan vacíos. Lo borra todo al terminar (los usuarios de Auth quedan, como
 * en el resto de scripts, y se recogen solos al empezar la siguiente).
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';
import { preCleanTestUsers } from './lib/test-users.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

// Antes de crear nada: recoge las cuentas de prueba de baterías anteriores.
await preCleanTestUsers();

const label = process.argv[2];
if (!label || label.startsWith('--')) {
  console.error('Uso: npm run capture:f46b -- <antes|despues> [--skip-build]');
  process.exit(1);
}

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs/verificacion/f46b', label);
const skipBuild = process.argv.includes('--skip-build');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

const client = () =>
  createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
const anon = client();

// --- Cuentas -------------------------------------------------------------------------------------
const stamp = Date.now().toString(36);
const people = {
  a: { name: 'Lucía Mbá', bio: 'Reforestación y calidad del agua en Guinea Ecuatorial.', location: 'Bata, Litoral' },
  b: { name: 'Pablo Nsue', bio: 'Voluntario en limpiezas del río Ntem.', location: 'Ebebiyín' },
  c: { name: 'Marta Ayang', bio: null, location: null },
};
const accounts = {};
const users = {};
const ids = {};
for (const key of Object.keys(people)) {
  accounts[key] = {
    email: `oveng-f46b${key}-${stamp}@ovengtest.dev`,
    password: `Captura-${stamp}-${key.toUpperCase()}`,
    username: `f46b${key}${stamp}`,
  };
  users[key] = client();
  const { data, error } = await users[key].auth.signUp({
    email: accounts[key].email,
    password: accounts[key].password,
    options: { data: { username: accounts[key].username, display_name: people[key].name } },
  });
  if (error || !data.session) {
    console.error(`✗ No se pudo crear la cuenta ${key}: ${error?.message ?? 'sin sesión'}`);
    process.exit(1);
  }
  ids[key] = data.user.id;
  await users[key].from('profiles').update({ bio: people[key].bio, location: people[key].location }).eq('id', ids[key]);
}
const pair = (x, y) => (ids[x] < ids[y] ? { user_low: ids[x], user_high: ids[y] } : { user_low: ids[y], user_high: ids[x] });
const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

// A sigue a B, y los dos han publicado algo.
await users.a.from('follows').insert({ follower_id: ids.a, following_id: ids.b });
await users.b.from('follows').insert({ follower_id: ids.b, following_id: ids.a });

// --- Build y navegador ---------------------------------------------------------------------------
if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const basePath = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4181 });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, locale: 'es-ES' });

// Foto de la publicación, pintada en un canvas.
let imagePath = null;
{
  const canvasPage = await context.newPage();
  const dataUrl = await canvasPage.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, 1200);
    sky.addColorStop(0, '#A5D6A7');
    sky.addColorStop(1, '#2E7D32');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1600, 1200);
    ctx.fillStyle = '#1B5E20';
    for (let i = 0; i < 6; i += 1) {
      ctx.beginPath();
      ctx.arc(150 + i * 270, 1000, 220, Math.PI, 0);
      ctx.fill();
    }
    return canvas.toDataURL('image/jpeg', 0.9);
  });
  await canvasPage.close();
  imagePath = `${ids.a}/f46b-${stamp}.jpg`;
  const { error } = await users.a.storage
    .from('post-images')
    .upload(imagePath, Buffer.from(dataUrl.split(',')[1], 'base64'), { contentType: 'image/jpeg' });
  if (error) imagePath = null;
}
const imageUrl = imagePath ? users.a.storage.from('post-images').getPublicUrl(imagePath).data.publicUrl : null;

const { data: postA } = await users.a
  .from('posts')
  .insert({
    author_id: ids.a,
    content:
      'Hoy plantamos 500 árboles en el Parque Nacional de Monte Alén con el equipo de voluntariado. Gracias a todas las familias que vinieron desde Bata y Evinayong: sin vosotras no habría sido posible. #Reforestación #GuineaEcuatorial',
    image_url: imageUrl,
    hashtags: ['reforestación', 'guineaecuatorial'],
  })
  .select('id')
  .single();
await users.b.from('posts').insert({
  author_id: ids.b,
  content: 'El sábado limpiamos la orilla del Ntem: 40 bolsas de plástico. ¿Quién se apunta a la próxima? #RíoLimpio',
  hashtags: ['ríolimpio'],
});

// Chat aceptado entre A y B, con mensajes de ayer y de hoy para que haya bloques.
const { data: convAB } = await users.a
  .from('conversations')
  .insert({ ...pair('a', 'b'), requested_by: ids.a, status: 'pending' })
  .select('id')
  .single();
await users.a.from('messages').insert({ conversation_id: convAB.id, sender_id: ids.a, body: 'Hola Pablo, vi lo de la limpieza del Ntem 👏', created_at: ago(26 * 60) });
await users.b.from('conversations').update({ status: 'accepted' }).eq('id', convAB.id);
const thread = [
  ['b', '¡Gracias! Fue un día muy bonito', 26 * 60 - 2],
  ['b', 'Vinieron más de treinta personas', 26 * 60 - 3],
  ['a', '¿Organizamos otra para el mes que viene?', 50],
  ['b', 'Sí, perfecto. El sábado 14 a las 9 en el puente', 48],
  ['b', 'Llevo guantes y bolsas para todos', 47],
  ['a', 'Genial, yo aviso al grupo de Monte Alén 🌱', 5],
];
for (const [who, body, minutes] of thread) {
  await users[who].from('messages').insert({ conversation_id: convAB.id, sender_id: ids[who], body, created_at: ago(minutes) });
}
await users.b.from('messages').insert({ conversation_id: convAB.id, sender_id: ids.b, body: 'Perfecto, nos vemos allí', created_at: ago(1) });

// Solicitud de C a A, sin aceptar.
const { data: convCA } = await users.c
  .from('conversations')
  .insert({ ...pair('a', 'c'), requested_by: ids.c, status: 'pending' })
  .select('id')
  .single();
await users.c.from('messages').insert({
  conversation_id: convCA.id,
  sender_id: ids.c,
  body: 'Hola Lucía, soy profesora en Malabo. ¿Podrías venir a hablar a mi clase de reforestación?',
});

const { data: job } = await anon.from('jobs').select('id').eq('active', true).limit(1).maybeSingle();

const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });
const go = async (path, wait = 2500) => {
  await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(wait);
};

try {
  // --- Sin cuenta ---
  await go('/', 3500);
  await shot('01-feed-sin-cuenta');
  await go('/welcome');
  await shot('02-bienvenida');
  await go('/login');
  await shot('03-login');
  await go('/register');
  await shot('04-registro');
  await go('/forgot-password');
  await shot('05-recuperar');

  // --- Con cuenta (A) ---
  await go('/login', 1500);
  await page.getByPlaceholder('tu@email.com').fill(accounts.a.email);
  await page.getByPlaceholder('Tu contraseña').fill(accounts.a.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(4500);
  await shot('06-feed');
  await page.mouse.wheel(0, 900);
  await page.waitForTimeout(1200);
  await shot('07-feed-scroll');

  if (postA) {
    await go(`/post/${postA.id}`);
    await shot('08-detalle-publicacion');
  }
  await go('/crear');
  await shot('09-crear');
  await go('/buscar');
  await shot('10-buscar');
  await page.getByRole('searchbox').or(page.getByPlaceholder(/Buscar/)).first().fill('eco');
  await page.waitForTimeout(2500);
  await shot('11-buscar-resultados');
  await go('/mapa', 3500);
  await shot('12-mapa');
  await go('/turismo-verde', 3000);
  await shot('13-turismo-verde');
  if (job) {
    await go(`/empleo/${job.id}`);
    await shot('14-empleo-detalle');
  }
  await go('/entidad/parque-nacional-monte-alen', 3500);
  await shot('15-entidad');
  await go('/perfil', 3500);
  await shot('16-perfil-propio');
  await go('/editar-perfil');
  await shot('17-editar-perfil');
  await go(`/user/${accounts.b.username}`, 3000);
  await shot('18-perfil-ajeno');

  await go('/mensajes', 3000);
  await shot('19-mensajes-chats');
  await page.getByRole('tab', { name: /^Solicitudes/ }).click();
  await page.waitForTimeout(1200);
  await shot('20-mensajes-solicitudes');
  await go(`/mensajes/${convAB.id}`, 3000);
  await shot('21-conversacion');
  await go(`/mensajes/${convCA.id}`, 3000);
  await shot('22-solicitud-recibida');

  const wide = await context.newPage();
  await wide.setViewportSize({ width: 1280, height: 900 });
  await wide.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await wide.waitForTimeout(3500);
  await wide.screenshot({ path: join(OUT, '23-escritorio-feed.png') });
  await wide.goto(`${origin}/mensajes/${convAB.id}`, { waitUntil: 'networkidle' });
  await wide.waitForTimeout(3000);
  await wide.screenshot({ path: join(OUT, '24-escritorio-conversacion.png') });
  await wide.close();

  console.log(`✓ capturas de "${label}" en docs/verificacion/f46b/${label}/`);
  if (errors.length > 0) console.log(`  · errores de página: ${errors.join(' | ')}`);
} catch (cause) {
  console.error(`✗ ${cause.message.split('\n')[0]}`);
  await shot('99-estado-al-fallar');
  process.exitCode = 1;
} finally {
  await browser.close();
  server.close();
  for (const key of Object.keys(people)) {
    await users[key].from('blocks').delete().eq('blocker_id', ids[key]);
    await users[key].from('profiles').delete().eq('id', ids[key]);
  }
  if (imagePath) await users.a.storage.from('post-images').remove([imagePath]);
}

console.log(`Cuentas de prueba (${stamp}) en Auth: se recogen solas al empezar la próxima verificación`);
