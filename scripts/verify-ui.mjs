/**
 * Verificación visual de F1.2 en navegador real.
 *
 * Construye el export web, lo sirve como lo haría GitHub Pages, y recorre la
 * app con Chromium: entra con una cuenta, pasa por las 5 secciones, abre y
 * cierra el modal de Crear, recarga para comprobar que la sesión y la ruta
 * aguantan, y cierra sesión.
 *
 *   npm run verify:ui                     # registra una cuenta nueva por la UI
 *   E2E_EMAIL=... E2E_PASSWORD=... npm run verify:ui   # usa una cuenta existente
 *   npm run verify:ui -- --skip-build     # reutiliza dist/
 *
 * Las capturas se guardan en docs/verificacion/f1/.
 */

import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import { useLocalBrowserLibraries } from './lib/browser.mjs';
import { serveStatic } from './lib/static-server.mjs';

useLocalBrowserLibraries();
const { chromium } = await import('playwright');

const ROOT = process.cwd();

/** Nombre del bundle JS, que lleva un hash distinto en cada build. */
function globbedBundle() {
  const dir = join('_expo/static/js/web');
  const files = readdirSync(join(ROOT, 'dist', dir));
  const entry = files.find((f) => f.startsWith('entry-') && f.endsWith('.js'));
  if (!entry) throw new Error('no se encontró el bundle de entrada en dist/');
  return join(dir, entry);
}
const SHOTS = join(ROOT, 'docs/verificacion/f1');
const skipBuild = process.argv.includes('--skip-build');

let failures = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ✗ ${m}`);
};
const step = (m) => console.log(`\n${m}`);

// --- Build -------------------------------------------------------------------
if (!skipBuild) {
  step('1. Construyendo el export web');
  rmSync(join(ROOT, 'dist'), { recursive: true, force: true });
  // --clear es obligatorio: Metro cachea el valor incrustado de las variables
  // EXPO_PUBLIC_*, así que sin limpiar se verificaría un bundle con la URL de
  // una build anterior. Ya pasó una vez.
  execSync('npx expo export --platform web --clear', { stdio: 'pipe' });

  const bundle = readFileSync(
    join(ROOT, 'dist', globbedBundle()),
    'utf8',
  );
  const expected = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  if (expected && bundle.includes(expected)) {
    ok(`dist/ generado y apunta a ${expected}`);
  } else {
    bad('el bundle NO contiene la URL de Supabase del .env — caché rancia');
  }
} else {
  step('1. Build omitida (--skip-build)');
}

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });

// --- Servidor y navegador ----------------------------------------------------
const { server, origin } = await serveStatic(join(ROOT, 'dist'));
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();

const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));

const shot = async (name) => {
  await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: false });
};

const seen = (text) => page.getByText(text, { exact: false }).first();

async function expectVisible(text, label) {
  try {
    await seen(text).waitFor({ state: 'visible', timeout: 8000 });
    ok(label);
    return true;
  } catch {
    bad(`${label} — no apareció "${text}"`);
    return false;
  }
}

try {
  // --- Bienvenida ------------------------------------------------------------
  step('2. Pantalla de bienvenida (sin sesión)');
  await page.goto(origin, { waitUntil: 'networkidle' });
  await expectVisible('Tu entorno. Tu salud.', 'welcome se renderiza');
  await expectVisible('Crear cuenta', 'botón "Crear cuenta" visible');
  await shot('01-welcome');

  // Una ruta privada sin sesión debe acabar en welcome.
  await page.goto(`${origin}/perfil`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  if (page.url().includes('/welcome') || (await seen('Crear cuenta').isVisible())) {
    ok('el guard manda a welcome al pedir /perfil sin sesión');
  } else {
    bad(`el guard no protegió /perfil (URL: ${page.url()})`);
  }

  // --- Entrar ----------------------------------------------------------------
  const existingEmail = process.env.E2E_EMAIL;
  const existingPassword = process.env.E2E_PASSWORD;

  if (existingEmail && existingPassword) {
    step('3. Iniciando sesión con la cuenta indicada');
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.getByText('Iniciar sesión', { exact: true }).first().click();
    await page.getByPlaceholder('tu@email.com').fill(existingEmail);
    await page.getByPlaceholder('Tu contraseña').fill(existingPassword);
    await shot('02-login');
    await page.getByText('Entrar', { exact: true }).first().click();
  } else {
    step('3. Registrando una cuenta nueva desde la UI');
    const stamp = Date.now().toString(36);
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.getByText('Crear cuenta', { exact: true }).first().click();
    await page.getByPlaceholder('tu@email.com').fill(`oveng-ui-${stamp}@ovengtest.dev`);
    await page.getByPlaceholder('Mínimo 8 caracteres').fill(`Verif-${stamp}-2026`);
    await page.getByPlaceholder('bosque_vivo').fill(`ui_${stamp}`.slice(0, 30));

    // La comprobación de disponibilidad tiene 450 ms de debounce.
    await page.waitForTimeout(1500);
    await expectVisible('está libre', 'la comprobación de username responde "libre"');

    await page.getByPlaceholder('Bosque Vivo').fill('Cuenta de prueba UI');
    await shot('02-register');
    await page.getByText('Crear cuenta', { exact: true }).last().click();
  }

  await page.waitForTimeout(3000);

  if (await seen('Revisa tu correo').isVisible().catch(() => false)) {
    bad('el registro pide confirmar el email: no se puede continuar sin una cuenta confirmada');
    console.log('    Desactiva "Confirm email" en Supabase o pasa E2E_EMAIL/E2E_PASSWORD.');
    await shot('03-confirmar-email');
    throw new Error('sesión no iniciada');
  }

  // --- Secciones -------------------------------------------------------------
  step('4. Las 5 secciones');
  await expectVisible('Tu feed aparecerá aquí', 'Inicio muestra su estado vacío');
  await expectVisible('Inicio', 'la barra de navegación está presente');
  await shot('03-inicio');

  for (const [label, marker, file] of [
    ['Buscar', 'Busca personas, lugares o etiquetas', '04-buscar'],
    ['Mapa', 'Mapa ambiental', '05-mapa'],
    ['Perfil', 'Cerrar sesión', '06-perfil'],
  ]) {
    await page.getByRole('tab', { name: label }).click();
    await page.waitForTimeout(700);
    await expectVisible(marker, `la pestaña ${label} navega y carga`);
    await shot(file);
  }

  // --- Modal de Crear --------------------------------------------------------
  step('5. Modal de Crear');
  await page.getByRole('button', { name: 'Crear publicación' }).click();
  await page.waitForTimeout(900);
  await expectVisible('Crear publicación', 'el modal se abre');
  await shot('07-crear-modal');

  await page.getByRole('button', { name: 'Cerrar' }).click();
  await page.waitForTimeout(900);
  if (await seen('Crear publicación').isVisible().catch(() => false)) {
    bad('el modal no se cerró');
  } else {
    ok('el modal se cierra');
  }

  // --- Persistencia ----------------------------------------------------------
  step('6. Recarga: sesión y ruta');
  await page.getByRole('tab', { name: 'Mapa' }).click();
  await page.waitForTimeout(700);
  const beforeReload = page.url();

  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  if (await seen('Mapa ambiental').isVisible().catch(() => false)) {
    ok(`la sesión y la ruta aguantan la recarga (${beforeReload})`);
  } else {
    bad('tras recargar no se mantuvo la sesión o la ruta');
  }
  await shot('08-recarga-mapa');

  // --- Cierre de sesión ------------------------------------------------------
  step('7. Cerrar sesión');
  await page.getByRole('tab', { name: 'Perfil' }).click();
  await page.waitForTimeout(700);
  await page.getByText('Cerrar sesión', { exact: true }).first().click();
  await page.waitForTimeout(2500);
  await expectVisible('Tu entorno. Tu salud.', 'cerrar sesión devuelve a welcome');
  await shot('09-logout-welcome');

  // --- Escritorio ------------------------------------------------------------
  step('8. Vista de escritorio');
  const wide = await context.newPage();
  await wide.setViewportSize({ width: 1280, height: 900 });
  await wide.goto(origin, { waitUntil: 'networkidle' });
  await wide.waitForTimeout(1500);
  await wide.screenshot({ path: join(SHOTS, '10-escritorio-welcome.png') });
  ok('captura de escritorio guardada');
  await wide.close();
} catch (error) {
  bad(`recorrido interrumpido: ${error.message}`);
  await shot('99-estado-al-fallar');
} finally {
  if (consoleErrors.length > 0) {
    step('Errores de consola del navegador');
    for (const message of [...new Set(consoleErrors)].slice(0, 10)) {
      console.log(`  ! ${message.slice(0, 200)}`);
    }
  }

  await browser.close();
  server.close();
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: todo correcto.' : `RESULTADO: ${failures} fallo(s).`);
console.log(`Capturas en docs/verificacion/f1/`);
process.exit(failures === 0 ? 0 : 1);
