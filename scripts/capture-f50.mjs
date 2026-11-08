/**
 * Auditoría pre-v1 (F5.0): recorre todas las rutas en móvil (390 px) y en
 * escritorio, con y sin sesión, y guarda captura, errores de consola,
 * peticiones a Supabase y tiempos. No comprueba nada: **mide**, para que el
 * informe (docs/auditoria-v1.md) se escriba sobre datos y no sobre impresiones.
 *
 *   npm run capture:f50 -- --phase antes            # contra la demo publicada
 *   npm run capture:f50 -- --phase despues --local  # contra dist/ (export previo)
 *
 * Deja en docs/verificacion/f50/<fase>/ las capturas y `report.json`.
 * Crea dos cuentas de prueba y las borra al terminar.
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
const only = arg('only', null); // filtra rutas por subcadena

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs/verificacion/f50', phase);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supaHost = new URL(url).host;
const client = () => createClient(url, anonKey, { auth: { persistSession: false } });

const basePath = JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
let origin = 'https://expeavomo15.github.io/oveng-envhealth';
let server = null;
if (local) {
  const served = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4250 });
  server = served.server;
  origin = served.origin;
}
console.log(`Auditoría F5.0 · fase ${phase} · ${origin}`);

// --- Cuentas: A es la recién llegada; B tiene algo publicado -------------------------------
const stamp = Date.now().toString(36);
const accounts = {};
const users = {};
const ids = {};
for (const key of ['a', 'b']) {
  accounts[key] = {
    email: `oveng-f50${key}-${stamp}@ovengtest.dev`,
    password: `Audit-${stamp}-${key.toUpperCase()}`,
    username: `f50${key}${stamp}`,
    name: key === 'a' ? 'Recién llegada' : 'Ana Verde (prueba)',
  };
  users[key] = client();
  const { data, error } = await users[key].auth.signUp({
    email: accounts[key].email,
    password: accounts[key].password,
    options: { data: { username: accounts[key].username, display_name: accounts[key].name } },
  });
  if (error || !data.session) throw new Error(`cuenta ${key}: ${error?.message ?? 'sin sesión'}`);
  ids[key] = data.user.id;
}
const { data: post } = await users.b
  .from('posts')
  .insert({
    author_id: ids.b,
    content: `Hoy hemos limpiado la ribera del Ntem 🌿🐢 ${stamp}. #Ntem #limpieza ${'Texto largo para ver cómo corta. '.repeat(6)}`,
    hashtags: ['ntem', 'limpieza'],
  })
  .select('id')
  .single();
const pair = ids.a < ids.b ? { user_low: ids.a, user_high: ids.b } : { user_low: ids.b, user_high: ids.a };
const { data: convo } = await users.b
  .from('conversations')
  .insert({ ...pair, requested_by: ids.b, status: 'pending' })
  .select('id')
  .single();
await users.b.from('messages').insert({ conversation_id: convo.id, sender_id: ids.b, body: 'Hola 👋 ¿vienes el sábado?' });
const { data: job } = await client().from('jobs').select('id').eq('active', true).limit(1).single();

const browser = await chromium.launch();
const VIEWPORTS = {
  movil: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  escritorio: { viewport: { width: 1280, height: 800 } },
};

const anonRoutes = [
  '/',
  '/buscar',
  '/mapa',
  '/turismo-verde',
  '/entidad/rio-ntem',
  '/entidad/parque-nacional-monte-alen',
  `/empleo/${job.id}`,
  `/publicacion/${post.id}`,
  '/publicacion/00000000-0000-4000-8000-000000000000',
  `/user/${accounts.b.username}`,
  '/user/nadie_existe_aqui',
  '/entidad/no-existe',
  '/restablecer',
  '/welcome',
  '/register',
  '/login',
  '/forgot-password',
  '/esta-ruta-no-existe',
  '/notificaciones',
  '/crear',
  '/perfil',
  '/design-system',
];
const sessionRoutes = [
  '/',
  '/buscar',
  '/mapa',
  '/perfil',
  '/editar-perfil',
  '/crear',
  '/notificaciones',
  '/mensajes',
  `/mensajes/${convo.id}`,
  `/publicacion/${post.id}`,
  `/user/${accounts.b.username}`,
  '/entidad/rio-ntem',
  '/turismo-verde',
  '/oferta',
  '/design-system',
];

const report = { phase, origin, at: new Date().toISOString(), routes: [] };
const slug = (s) => s.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'inicio';

async function newContext(vp) {
  const context = await browser.newContext({ ...VIEWPORTS[vp], locale: 'es-ES' });
  return context;
}

async function login(context) {
  const page = await context.newPage();
  await page.goto(`${origin}/login`, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('tu@email.com').fill(accounts.a.email);
  await page.getByPlaceholder('Tu contraseña').fill(accounts.a.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(3500);
  await page.close();
}

async function visit(context, vp, mode, path) {
  const page = await context.newPage();
  const consoleMsgs = [];
  const requests = [];
  const failed = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 240)}`);
  });
  page.on('pageerror', (e) => consoleMsgs.push(`pageerror: ${e.message.slice(0, 240)}`));
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.host === supaHost) requests.push(`${r.method()} ${u.pathname}${u.search.slice(0, 160)}`);
    else if (!u.host.includes('github.io') && !u.host.startsWith('localhost') && !u.host.includes('tile.openstreetmap'))
      requests.push(`EXT ${u.host}${u.pathname}`);
  });
  page.on('requestfailed', (r) => failed.push(`${r.url().slice(0, 160)} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().slice(0, 160)}`);
  });

  const name = `${vp}-${mode}-${slug(path)}`;
  const t0 = Date.now();
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, `${name}-0700ms.png`) });
  let idle = null;
  try {
    await page.waitForLoadState('networkidle', { timeout: 20000 });
    idle = Date.now() - t0;
  } catch {
    idle = 'timeout';
  }
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
  const finalPath = new URL(page.url()).pathname.replace(basePath, '') || '/';
  const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 400);
  const tiles = (await page.locator('.maplibregl-canvas').count()) > 0;
  const entry = { vp, mode, path, finalPath, idleMs: idle, console: consoleMsgs, requests, failed, text, map: tiles };
  report.routes.push(entry);
  const dup = requests.filter((r, i) => requests.indexOf(r) !== i);
  console.log(
    `${vp.padEnd(10)} ${mode.padEnd(6)} ${path.slice(0, 48).padEnd(48)} → ${finalPath.slice(0, 30).padEnd(30)} ` +
      `${String(idle).padStart(6)}ms  req ${requests.length}${dup.length ? ` (dup ${dup.length})` : ''}  ` +
      `err ${consoleMsgs.length}  fail ${failed.length}`,
  );
  await page.close();
}

try {
  for (const vp of Object.keys(VIEWPORTS)) {
    const anonCtx = await newContext(vp);
    for (const path of anonRoutes) if (!only || path.includes(only)) await visit(anonCtx, vp, 'anon', path);
    await anonCtx.close();

    const sessCtx = await newContext(vp);
    await login(sessCtx);
    for (const path of sessionRoutes) if (!only || path.includes(only)) await visit(sessCtx, vp, 'sesion', path);
    await sessCtx.close();
  }

  // Red lenta en móvil: feed y mapa a 1,5 Mbps / 300 ms, primera visita sin caché.
  for (const path of ['/', '/mapa']) {
    if (only && !path.includes(only)) continue;
    const context = await newContext('movil');
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 300,
      downloadThroughput: (1.5 * 1024 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    const t0 = Date.now();
    await page.goto(`${origin}${path}`, { waitUntil: 'commit' });
    const marks = [];
    for (const at of [2000, 5000, 9000, 15000]) {
      await page.waitForTimeout(at - (Date.now() - t0));
      const file = `lenta-${slug(path)}-${at}ms.png`;
      await page.screenshot({ path: join(OUT, file) });
      marks.push(file);
    }
    report.routes.push({ vp: 'movil', mode: 'lenta', path, marks });
    console.log(`lenta ${path}: ${marks.join(', ')}`);
    await context.close();
  }
} finally {
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  await browser.close();
  server?.close();
  await finishTestRun(0);
}
