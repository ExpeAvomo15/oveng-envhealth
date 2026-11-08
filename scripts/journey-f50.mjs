/**
 * Recorrido de usuario nuevo y casos feos (F5.0), en móvil (390 px).
 *
 *   npm run journey:f50 -- --phase antes            # contra la demo publicada
 *   npm run journey:f50 -- --phase despues --local  # contra dist/
 *
 * No es una verificación con veredicto: anota lo que pasa (✓ / ✗ / ·) y guarda
 * capturas numeradas en docs/verificacion/f50/<fase>-recorrido/. Los ✗ son
 * hallazgos para docs/auditoria-v1.md.
 *
 * El correo de recuperar contraseña **no se envía** (se intercepta la llamada):
 * el correo integrado de Supabase tiene dos envíos por hora para todo el
 * proyecto. Crea dos cuentas de prueba y las borra al terminar.
 */

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';
import { finishTestRun, preCleanTestUsers } from './lib/test-users.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');
await preCleanTestUsers();

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const phase = arg('phase', 'antes');
const local = process.argv.includes('--local');
const ROOT = process.cwd();
const OUT = join(ROOT, 'docs/verificacion/f50', `${phase}-recorrido`);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const client = () => createClient(url, anonKey, { auth: { persistSession: false } });
const anon = client();

const basePath = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
let origin = 'https://expeavomo15.github.io/oveng-envhealth';
let server = null;
if (local) {
  const served = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4251 });
  server = served.server;
  origin = served.origin;
}

const log = [];
let failures = 0;
const ok = (m) => (log.push(`✓ ${m}`), console.log(`  ✓ ${m}`));
const bad = (m) => (failures++, log.push(`✗ ${m}`), console.log(`  ✗ ${m}`));
const info = (m) => (log.push(`· ${m}`), console.log(`  · ${m}`));
const step = (m) => (log.push(`\n## ${m}`), console.log(`\n${m}`));
let n = 0;
const shot = (page, name) => page.screenshot({ path: join(OUT, `${String(++n).padStart(2, '0')}-${name}.png`) });
const visible = (l) => l.filter({ visible: true }).first();
async function seen(locator, timeout = 8000) {
  try {
    await visible(locator).waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}

const stamp = Date.now().toString(36);
const A = {
  email: `oveng-f50j-${stamp}@ovengtest.dev`,
  password: `Journey-${stamp}-A`,
  username: `f50j${stamp}`,
  name: 'Nueva Vecina',
};

// Una imagen JPEG real, para subirla como foto de la publicación.
const PNG_1PX =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  locale: 'es-ES',
  permissions: ['clipboard-read', 'clipboard-write'],
});
const page = await context.newPage();
const consoleErrors = [];
page.on('pageerror', (e) => consoleErrors.push(`pageerror ${new URL(page.url()).pathname}: ${e.message.slice(0, 200)}`));
page.on('console', (m) => {
  if (m.type() === 'error' && !/status of 404/.test(m.text()))
    consoleErrors.push(`console ${new URL(page.url()).pathname}: ${m.text().slice(0, 200)}`);
});
page.on('dialog', async (d) => {
  bad(`diálogo inesperado (¿XSS?): ${d.message()}`);
  await d.dismiss();
});

let B = null;
let myId = null;
try {
  // --- 1. Llegar y registrarse --------------------------------------------------------------
  step('1. Llega alguien nuevo y se registra');
  const t0 = Date.now();
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  info(`feed sin cuenta en ${Date.now() - t0} ms (networkidle)`);
  await shot(page, 'feed-sin-cuenta-base-vacia');
  const body = await page.locator('body').innerText();
  if (/Sé el primero|publicaciones/i.test(body)) info(`el feed vacío dice: «${body.match(/Sé el primero[^\n]*/)?.[0] ?? '?'}»`);

  await visible(page.getByText('Entrar', { exact: true })).click();
  await page.waitForTimeout(800);
  await shot(page, 'bienvenida');
  await visible(page.getByText('Crear cuenta', { exact: true })).click();
  await page.waitForTimeout(800);
  await page.getByPlaceholder('tu@email.com').fill(A.email);
  await page.getByPlaceholder('Mínimo 8 caracteres').fill(A.password);
  await page.getByPlaceholder('bosque_vivo').fill(A.username);
  await page.getByPlaceholder('Bosque Vivo').fill(A.name);
  await shot(page, 'registro-relleno');
  await visible(page.getByRole('button', { name: 'Crear cuenta' })).click();
  await page.waitForTimeout(4000);
  const after = new URL(page.url()).pathname.replace(basePath, '') || '/';
  if (after === '/') ok('tras registrarse aterriza en el feed');
  else bad(`tras registrarse aterriza en ${after}`);
  await shot(page, 'feed-recien-registrada');
  const { data: me } = await anon.from('profiles').select('id').eq('username', A.username).single();
  myId = me?.id ?? null;
  if (myId) ok('perfil creado por el trigger');
  else bad('no hay perfil tras el registro');
  const feedText = await page.locator('body').innerText();
  if (/Turismo Verde|mapa|Empleo|seguir|iniciativ/i.test(feedText.split('Datos ambientales')[0]))
    ok('el feed vacío propone algo más que publicar (explorar, seguir)');
  else bad('el feed vacío solo invita a publicar: nada que explorar ni a quién seguir');

  // --- 2. ¿Se entiende qué es esto? -----------------------------------------------------------
  step('2. ¿Qué es esto?');
  if (/red|medioambiente|entorno|naturaleza/i.test(feedText)) info('hay alguna frase que explica el producto en el feed');
  else bad('ningún texto del feed explica qué es OVENG a quien acaba de llegar');

  // --- 3. Seguir ----------------------------------------------------------------------------
  step('3. Buscar y seguir una iniciativa');
  await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder(/Buscar/).first().fill('EcoGuinea');
  await page.waitForTimeout(1500);
  await shot(page, 'buscar-ecoguinea');
  const follow = visible(page.getByRole('button', { name: /^Seguir/ }));
  if (await seen(page.getByRole('button', { name: /^Seguir/ }))) {
    await follow.click();
    await page.waitForTimeout(1500);
    const { count } = await anon.from('entity_follows').select('*', { count: 'exact', head: true }).eq('user_id', myId);
    if (count === 1) ok('seguir EcoGuinea persiste');
    else bad(`seguir EcoGuinea: ${count} filas`);
  } else bad('no aparece el botón Seguir en el resultado');

  // --- 4. Publicar con foto, y doble toque ---------------------------------------------------
  step('4. Publicar con foto (y doble toque en Publicar)');
  await page.goto(`${origin}/crear`, { waitUntil: 'networkidle' });
  const TEXT = `Primera vez por aquí 🌱🐢 Limpieza en la playa de Bata ${stamp} #playa #Bata`;
  await page.getByPlaceholder('¿Qué está pasando en tu entorno?').fill(TEXT);
  const chooser = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
  await visible(page.getByText('Añadir imagen')).click();
  const fc = await chooser;
  if (fc) {
    await fc.setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(PNG_1PX, 'base64') });
    await page.waitForTimeout(1500);
    ok('el selector de imagen abre y acepta el archivo');
  } else bad('el selector de imagen no se abre');
  await shot(page, 'crear-con-foto');
  const publishBtn = visible(page.getByRole('button', { name: 'Publicar' }));
  await publishBtn.dblclick();
  await page.waitForTimeout(5000);
  const { data: mine } = await anon.from('posts').select('id, image_url').eq('author_id', myId);
  if ((mine ?? []).length === 1) ok('doble toque en Publicar crea UNA publicación');
  else bad(`doble toque en Publicar crea ${(mine ?? []).length} publicaciones`);
  if (mine?.[0]?.image_url) ok('la publicación lleva la foto');
  else bad('la publicación no lleva la foto');
  await shot(page, 'feed-tras-publicar');
  const postId = mine?.[0]?.id;

  // --- 5. Comentar ------------------------------------------------------------------------------
  step('5. Comentar (y doble Enviar)');
  await page.goto(`${origin}/publicacion/${postId}`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('Añade un comentario…').fill('¡Allí estaré! 💚');
  const send = visible(page.getByRole('button', { name: /Publicar comentario|Enviar/ }));
  if (await seen(page.getByRole('button', { name: /Publicar comentario|Enviar/ }), 3000)) {
    await send.dblclick();
  } else {
    await page.getByPlaceholder('Añade un comentario…').press('Enter');
  }
  await page.waitForTimeout(2500);
  const { data: comments } = await anon.from('comments').select('id').eq('post_id', postId);
  if ((comments ?? []).length === 1) ok('un comentario, aunque se pulse dos veces');
  else bad(`se han creado ${(comments ?? []).length} comentarios`);
  await shot(page, 'publicacion-comentada');

  // --- 6. Compartir ---------------------------------------------------------------------------
  step('6. Compartir');
  await visible(page.getByRole('button', { name: /Compartir/ })).click();
  await page.waitForTimeout(800);
  await shot(page, 'hoja-compartir');
  if (await seen(page.getByText('Copiar enlace'), 3000)) {
    await visible(page.getByText('Copiar enlace')).click();
    await page.waitForTimeout(600);
    const copied = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    if (copied.includes(`/publicacion/${postId}`)) ok(`«Copiar enlace» copia ${copied}`);
    else bad(`«Copiar enlace» copia «${copied}»`);
  } else bad('la hoja de compartir no ofrece «Copiar enlace»');
  await page.keyboard.press('Escape');

  // --- 7. Notificación ------------------------------------------------------------------------
  step('7. Alguien da «me gusta» y comenta: la campana');
  B = client();
  const bAcc = { email: `oveng-f50k-${stamp}@ovengtest.dev`, password: `Journey-${stamp}-B`, username: `f50k${stamp}` };
  const { data: bData } = await B.auth.signUp({
    email: bAcc.email,
    password: bAcc.password,
    options: { data: { username: bAcc.username, display_name: 'Vecino Prueba' } },
  });
  const bId = bData.user.id;
  await B.from('likes').insert({ user_id: bId, post_id: postId });
  await B.from('comments').insert({ post_id: postId, user_id: bId, content: 'Qué bien, ¡me apunto!' });
  await B.from('follows').insert({ follower_id: bId, following_id: myId });
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, 'campana-con-aviso');
  await visible(page.getByRole('button', { name: /otificaciones/ })).click();
  await page.waitForTimeout(2000);
  await shot(page, 'notificaciones');
  const notes = await page.locator('body').innerText();
  if (/le gust|me gusta/i.test(notes) && /coment/i.test(notes) && /seguir/i.test(notes)) ok('tres avisos: me gusta, comentario, seguir');
  else bad(`la campana no enseña los tres avisos: ${notes.slice(0, 200)}`);

  // --- 8. Chat ---------------------------------------------------------------------------------
  step('8. Chat: B pide hablar, A acepta y responde');
  const pair = myId < bId ? { user_low: myId, user_high: bId } : { user_low: bId, user_high: myId };
  const { data: convo } = await B.from('conversations').insert({ ...pair, requested_by: bId, status: 'pending' }).select('id').single();
  await B.from('messages').insert({ conversation_id: convo.id, sender_id: bId, body: '¡Hola! ¿Eres de Bata?' });
  await page.goto(`${origin}/mensajes`, { waitUntil: 'networkidle' });
  await visible(page.getByText(/Solicitudes/)).click();
  await page.waitForTimeout(1000);
  await visible(page.getByText('Vecino Prueba')).click();
  await page.waitForTimeout(1500);
  await visible(page.getByRole('button', { name: 'Aceptar' })).click();
  await page.waitForTimeout(1500);
  await page.getByPlaceholder('Escribe un mensaje…').fill('¡Sí! Nos vemos el sábado 🌊');
  await page.getByPlaceholder('Escribe un mensaje…').press('Enter');
  await page.waitForTimeout(2000);
  await shot(page, 'chat');
  const { data: msgs } = await B.from('messages').select('body').eq('conversation_id', convo.id);
  if ((msgs ?? []).length === 2) ok('la respuesta llega a la base');
  else bad(`la conversación tiene ${(msgs ?? []).length} mensajes`);

  // --- 9. Turismo Verde y Empleo ---------------------------------------------------------------
  step('9. Turismo Verde y Empleo');
  await page.goto(`${origin}/turismo-verde`, { waitUntil: 'networkidle' });
  await shot(page, 'turismo-verde');
  await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
  await visible(page.getByText('Empleo', { exact: true })).click();
  await page.waitForTimeout(1500);
  await shot(page, 'empleo');
  if (await seen(page.getByText(/Oferta|Técnico|Voluntari/), 3000)) ok('el chip Empleo enseña ofertas');
  else bad('el chip Empleo no enseña ofertas');

  // --- 10. Valorar ------------------------------------------------------------------------------
  step('10. Valorar el Río Ntem (doble toque en enviar)');
  await page.goto(`${origin}/entidad/rio-ntem`, { waitUntil: 'networkidle' });
  await visible(page.getByRole('button', { name: /^Valorar/ })).click();
  await page.waitForTimeout(800);
  await visible(page.getByRole('radio', { name: /4 estrellas/ })).click();
  await page.getByPlaceholder('Cuenta por qué (opcional)').fill('Agua limpia y gente amable 🐟');
  await shot(page, 'valorar');
  await visible(page.getByRole('button', { name: /Enviar|Guardar|Publicar valoración/ })).dblclick();
  await page.waitForTimeout(2500);
  const { data: ratings } = await anon.from('entity_ratings').select('score').eq('user_id', myId);
  if (ratings?.length === 1 && ratings[0].score === 4) ok('una valoración de 4');
  else bad(`valoraciones: ${JSON.stringify(ratings)}`);
  await shot(page, 'valorado');

  // --- 11. Casos feos ---------------------------------------------------------------------------
  step('11. Casos feos');
  // XSS: el texto se pinta como texto.
  await anon.from('posts').select('id').limit(1);
  const { error: xssErr } = await B.from('posts').insert({
    author_id: bId,
    content: `<img src=x onerror=alert('xss')> <script>alert(1)</script> ${'🌍'.repeat(40)} ${'palabralarguisimasinespacios'.repeat(12)}`,
    hashtags: [],
  });
  if (xssErr) bad(`no se pudo crear la publicación de prueba XSS: ${xssErr.message}`);
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await shot(page, 'xss-y-texto-largo');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) bad('una palabra larguísima desborda el ancho de la pantalla');
  else ok('una palabra larguísima no desborda');
  ok('el HTML de una publicación se pinta como texto (ningún diálogo)');

  // Límite de longitud en el compositor.
  await page.goto(`${origin}/crear`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('¿Qué está pasando en tu entorno?').fill('a'.repeat(520));
  await page.waitForTimeout(300);
  const disabled = await visible(page.getByRole('button', { name: 'Publicar' })).isDisabled().catch(() => null);
  await shot(page, 'crear-pasado-de-limite');
  if (disabled) ok('pasado de 500 caracteres, Publicar se desactiva');
  else bad('Publicar sigue activo pasado el límite');

  // Imagen que falla al subir.
  await page.goto(`${origin}/crear`, { waitUntil: 'networkidle' });
  await page.route('**/storage/v1/object/**', (r) => r.fulfill({ status: 500, body: '{"error":"boom"}' }));
  await page.getByPlaceholder('¿Qué está pasando en tu entorno?').fill(`Foto que no sube ${stamp}`);
  const chooser2 = page.waitForEvent('filechooser', { timeout: 5000 }).catch(() => null);
  await visible(page.getByText('Añadir imagen')).click();
  await (await chooser2)?.setFiles({ name: 'foto.png', mimeType: 'image/png', buffer: Buffer.from(PNG_1PX, 'base64') });
  await page.waitForTimeout(1000);
  await visible(page.getByRole('button', { name: 'Publicar' })).click();
  await page.waitForTimeout(3000);
  await shot(page, 'imagen-falla');
  if (await seen(page.getByText('Publicar sin imagen'), 2000)) ok('si la imagen no sube, ofrece reintentar o publicar sin ella');
  else bad('si la imagen no sube, no lo dice');
  await page.unroute('**/storage/v1/object/**');

  // Sesión caducada a mitad: se borra el token y se intenta dar «me gusta».
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    for (const k of Object.keys(localStorage)) if (k.includes('auth')) localStorage.removeItem(k);
  });
  await page.route('**/rest/v1/likes**', (r) => r.fulfill({ status: 401, body: '{"message":"JWT expired"}' }));
  const like = visible(page.getByRole('button', { name: /me gusta/i }));
  if (await seen(page.getByRole('button', { name: /me gusta/i }), 3000)) {
    await like.click();
    await page.waitForTimeout(1500);
    await shot(page, 'sesion-caducada-like');
    const t = await page.locator('body').innerText();
    if (/sesión|Entra|No se ha podido/i.test(t)) ok('con la sesión caducada, el «me gusta» avisa');
    else bad('con la sesión caducada, el «me gusta» falla en silencio');
  }
  await page.unroute('**/rest/v1/likes**');

  // --- 12. Recuperar contraseña (sin enviar el correo) -------------------------------------------
  step('12. Recuperar contraseña');
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-ES' });
  const p2 = await ctx2.newPage();
  await p2.route('**/auth/v1/recover**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p2.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await visible(p2.getByText(/Olvidaste|contraseña\?/)).click();
  await p2.waitForTimeout(800);
  await visible(p2.getByPlaceholder('tu@email.com')).fill(A.email);
  await visible(p2.getByRole('button', { name: 'Enviar enlace' })).click();
  await p2.waitForTimeout(1500);
  await shot(p2, 'contrasena-enviada');
  const ptext = await p2.locator('body').innerText();
  if (/revisa|enviado|correo/i.test(ptext)) ok('tras pedir el enlace, dice qué esperar');
  else bad('tras pedir el enlace no dice nada claro');
  await p2.goto(`${origin}/restablecer?code=caducado123`, { waitUntil: 'networkidle' });
  await p2.waitForTimeout(2000);
  await shot(p2, 'restablecer-enlace-malo');
  await ctx2.close();

  step('Errores de consola durante el recorrido');
  if (consoleErrors.length === 0) ok('ninguno (sin contar los 404 de entrada de Pages)');
  for (const e of [...new Set(consoleErrors)]) bad(e);
} catch (error) {
  bad(`el recorrido se cortó: ${error.message.split('\n')[0]}`);
  await shot(page, 'corte').catch(() => {});
} finally {
  writeFileSync(join(OUT, 'recorrido.md'), log.join('\n') + '\n');
  console.log(`\n${failures} hallazgo(s) ✗ · ${OUT}`);
  await browser.close();
  server?.close();
  await finishTestRun(0);
}
