/**
 * Captura las pantallas construidas para compararlas con los mockups.
 *
 *   npm run capture -- antes
 *   npm run capture -- despues
 *
 * Deja las imágenes en docs/verificacion/f02c/<etiqueta>/. Siembra una cuenta
 * con contenido para que el feed y el perfil no salgan vacíos.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const label = process.argv[2];
if (!label || label.startsWith('--')) {
  console.error('Uso: npm run capture -- <antes|despues>');
  process.exit(1);
}

const ROOT = process.cwd();
const OUT = join(ROOT, 'docs/verificacion/f02c', label);
const TMP = join(ROOT, '.tmp-verify');
const skipBuild = process.argv.includes('--skip-build');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

const stamp = Date.now().toString(36);
const cuenta = {
  email: `oveng-f02c-${stamp}@ovengtest.dev`,
  password: `Captura-${stamp}-2026`,
  username: `eco_${stamp}`.slice(0, 30).toLowerCase(),
  displayName: 'EcoGuinea',
};

const client = createClient(url, anonKey, { auth: { persistSession: false } });
const { data: auth, error } = await client.auth.signUp({
  email: cuenta.email,
  password: cuenta.password,
  options: { data: { username: cuenta.username, display_name: cuenta.displayName } },
});

if (error || !auth.session) {
  console.error(`✗ No se pudo crear la cuenta: ${error?.message ?? 'sin sesión'}`);
  process.exit(1);
}

const uid = auth.user.id;
await client
  .from('profiles')
  .update({
    bio: 'Reforestación y calidad del agua en Guinea Ecuatorial.',
    location: 'Bata, Litoral',
  })
  .eq('id', uid);

if (!skipBuild) {
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4180 });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();
const shot = (name) => page.screenshot({ path: join(OUT, `${name}.png`) });

// Foto para la publicación.
const fotoPath = join(TMP, 'foto.jpg');
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
  writeFileSync(fotoPath, Buffer.from(dataUrl.split(',')[1], 'base64'));
  await canvasPage.close();
}

try {
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot('01-bienvenida');

  await page.getByText('Iniciar sesión', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.getByPlaceholder('tu@email.com').fill(cuenta.email);
  await page.getByPlaceholder('Tu contraseña').fill(cuenta.password);
  await shot('02-login');
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(4000);

  // Publicación con imagen y etiquetas, para que el feed tenga contenido real.
  await page.getByRole('button', { name: 'Crear publicación' }).click();
  await page.waitForTimeout(1500);
  await page
    .getByLabel('Texto de la publicación')
    .fill(
      `Hoy plantamos 500 árboles en el Parque Nacional de Monte Alén (${stamp}) #Reforestación #GuineaEcuatorial #AcciónClimática`,
    );
  await page.waitForTimeout(700);

  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    page.getByText('Añadir imagen', { exact: true }).first().click(),
  ]);
  await chooser.setFiles(fotoPath);
  await page.waitForTimeout(3000);
  await shot('03-compositor');

  await page.getByText('Publicar', { exact: true }).first().click();
  await page.waitForTimeout(6000);
  await shot('04-feed');

  await page.getByRole('button', { name: 'Me gusta' }).first().click();
  await page.waitForTimeout(1800);
  await shot('05-feed-valorado');

  await page.getByLabel('Ver la publicación').first().click();
  await page.waitForTimeout(3000);
  await shot('06-detalle');

  await page.goto(`${origin}/buscar`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot('07-buscar');

  await page.goto(`${origin}/mapa`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await shot('08-mapa');

  await page.goto(`${origin}/perfil`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4000);
  await shot('09-perfil');

  await page.getByText('Editar perfil', { exact: true }).first().click();
  await page.waitForTimeout(2000);
  await shot('10-editar-perfil');

  const wide = await context.newPage();
  await wide.setViewportSize({ width: 1280, height: 900 });
  await wide.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await wide.waitForTimeout(3500);
  await wide.screenshot({ path: join(OUT, '11-escritorio.png') });
  await wide.close();

  console.log(`✓ capturas de "${label}" en docs/verificacion/f02c/${label}/`);
} catch (cause) {
  console.error(`✗ ${cause.message.split('\n')[0]}`);
  await shot('99-estado-al-fallar');
} finally {
  await browser.close();
  server.close();
  rmSync(TMP, { recursive: true, force: true });
}

console.log(`Cuenta de prueba: ${cuenta.email} (bórrala con npm run cleanup:test-users)`);
