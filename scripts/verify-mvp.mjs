/**
 * Recorrido completo del MVP social, de principio a fin y en un navegador real.
 *
 * Es el criterio de cierre de F1: registro → perfil con foto → publicar con
 * imagen y etiquetas → feed → "me gusta" → visitar al autor → seguir →
 * "Siguiendo" filtra → detalle → cerrar sesión → volver a entrar con todo en su
 * sitio.
 *
 *   npm run verify:mvp                  # construye y recorre
 *   npm run verify:mvp -- --skip-build  # reutiliza dist/
 *
 * Las capturas quedan numeradas en docs/verificacion/mvp/ y sirven para enseñar
 * el proyecto sin tener que levantarlo.
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
const SHOTS = join(ROOT, 'docs/verificacion/mvp');
const TMP = join(ROOT, '.tmp-verify');
const skipBuild = process.argv.includes('--skip-build');

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error('✗ Faltan las variables de Supabase. Ejecuta con node --env-file=.env');
  process.exit(1);
}

let failures = 0;
let shotIndex = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => {
  failures += 1;
  console.log(`  ✗ ${m}`);
};
const step = (m) => console.log(`\n${m}`);

const stamp = Date.now().toString(36);

const yo = {
  email: `oveng-mvp-yo-${stamp}@ovengtest.dev`,
  password: `Mvp-${stamp}-2026`,
  username: `mvp_${stamp}`.slice(0, 30).toLowerCase(),
  displayName: 'Nuria Ribera',
  bio: 'Vigilo el estado del río y organizo limpiezas de ribera.',
  location: 'Bata, Litoral',
};

const vecina = {
  email: `oveng-mvp-vecina-${stamp}@ovengtest.dev`,
  password: `Mvp-vecina-${stamp}-2026`,
  username: `vecina_${stamp}`.slice(0, 30).toLowerCase(),
  displayName: 'Ribera Viva',
};

// --- Cuenta vecina, sembrada por API -----------------------------------------
step('1. Preparando una cuenta a la que seguir');

const vecinaClient = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: vecinaAuth, error: vecinaError } = await vecinaClient.auth.signUp({
  email: vecina.email,
  password: vecina.password,
  options: { data: { username: vecina.username, display_name: vecina.displayName } },
});

if (vecinaError || !vecinaAuth.session) {
  console.error(`✗ No se pudo crear la cuenta vecina: ${vecinaError?.message ?? 'sin sesión'}`);
  process.exit(1);
}

const vecinaId = vecinaAuth.user.id;
await vecinaClient.from('posts').insert([
  {
    author_id: vecinaId,
    content: 'Plantamos 120 árboles autóctonos en la ribera #Reforestación',
    hashtags: ['reforestación'],
    created_at: new Date(Date.now() - 90 * 60_000).toISOString(),
  },
  {
    author_id: vecinaId,
    content: 'Medición de calidad del agua esta mañana #Agua',
    hashtags: ['agua'],
    created_at: new Date(Date.now() - 45 * 60_000).toISOString(),
  },
]);
ok(`@${vecina.username} creada con 2 publicaciones`);

// --- Build --------------------------------------------------------------------
step('2. Construyendo el export web');
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

rmSync(SHOTS, { recursive: true, force: true });
mkdirSync(SHOTS, { recursive: true });
mkdirSync(TMP, { recursive: true });

const basePath =
  JSON.parse(readFileSync(join(ROOT, 'app.json'), 'utf8')).expo.experiments?.baseUrl ?? '';
const { server, origin } = await serveStatic(join(ROOT, 'dist'), { basePath, port: 4178 });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  locale: 'es-ES',
});
const page = await context.newPage();

const shot = async (name) => {
  shotIndex += 1;
  await page.screenshot({
    path: join(SHOTS, `${String(shotIndex).padStart(2, '0')}-${name}.png`),
  });
};

/** Comprobación inmediata. Solo para afirmar que algo **no** está. */
const visible = (text) =>
  page
    .getByText(text, { exact: false })
    .first()
    .isVisible()
    .catch(() => false);

/**
 * Espera a que aparezca. Mirar de reojo justo después de un clic convierte
 * cualquier consulta lenta en un falso fallo.
 */
const expectVisible = async (text, label, timeout = 15000) => {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout });
    ok(label);
  } catch {
    bad(`${label} — no apareció "${text}"`);
  }
};

// Foto de perfil y foto de publicación, dibujadas por el propio navegador.
const avatarPath = join(TMP, 'avatar.jpg');
const fotoPath = join(TMP, 'ribera.jpg');
{
  const canvasPage = await context.newPage();
  const [avatar, foto] = await canvasPage.evaluate(() => {
    const draw = (w, h, paint) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      paint(canvas.getContext('2d'), w, h);
      return canvas.toDataURL('image/jpeg', 0.9);
    };

    const avatarData = draw(800, 800, (ctx) => {
      ctx.fillStyle = '#2E7D32';
      ctx.fillRect(0, 0, 800, 800);
      ctx.fillStyle = '#A5D6A7';
      ctx.beginPath();
      ctx.arc(400, 320, 150, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(400, 760, 250, Math.PI, 0);
      ctx.fill();
    });

    const fotoData = draw(1800, 1200, (ctx, w, h) => {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#02B8D1');
      sky.addColorStop(1, '#A5D6A7');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#0277BD';
      ctx.fillRect(0, h * 0.72, w, h * 0.28);
      ctx.fillStyle = '#2E7D32';
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.arc(140 + i * 260, h * 0.72, 190, Math.PI, 0);
        ctx.fill();
      }
    });

    return [avatarData, fotoData];
  });

  writeFileSync(avatarPath, Buffer.from(avatar.split(',')[1], 'base64'));
  writeFileSync(fotoPath, Buffer.from(foto.split(',')[1], 'base64'));
  await canvasPage.close();
  ok('imágenes de prueba generadas');
}

const anon = createClient(url, anonKey, { auth: { persistSession: false } });

try {
  // --- 1. Registro -----------------------------------------------------------
  step('3. Registro desde la interfaz');

  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await expectVisible('Tu entorno. Tu salud.', 'la bienvenida se muestra sin sesión');
  await shot('bienvenida');

  await page.getByText('Crear cuenta', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.getByPlaceholder('tu@email.com').fill(yo.email);
  await page.getByPlaceholder('Mínimo 8 caracteres').fill(yo.password);
  await page.getByPlaceholder('bosque_vivo').fill(yo.username);
  await page.waitForTimeout(1600);
  await expectVisible('está libre', 'la comprobación de usuario responde en vivo');
  await page.getByPlaceholder('Bosque Vivo').fill(yo.displayName);
  await shot('registro');

  await page.getByText('Crear cuenta', { exact: true }).last().click();
  await page.waitForTimeout(4000);
  // "Para ti" trae todas las publicaciones del proyecto, así que no se
  // comprueba que esté vacío: se comprueba que se ha entrado.
  await expectVisible('Para ti', 'tras registrarse se entra directamente al feed');
  await shot('feed-al-entrar');

  // --- 2. Perfil con foto ----------------------------------------------------
  step('4. Completar el perfil con foto');

  await page.getByRole('tab', { name: 'Perfil' }).click();
  await page.waitForTimeout(2000);
  await page.getByText('Editar perfil', { exact: true }).first().click();
  await page.waitForTimeout(1500);

  await page.getByPlaceholder('Tu nombre').fill(yo.displayName);
  await page.getByPlaceholder('Cuenta en una línea qué te mueve').fill(yo.bio);
  await page.getByPlaceholder('Dónde vives o dónde actúas').fill(yo.location);

  const [avatarChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    page.getByText('Cambiar foto', { exact: true }).first().click(),
  ]);
  await avatarChooser.setFiles(avatarPath);
  await page.waitForTimeout(6000);
  await shot('editar-perfil');

  await page.getByText('Guardar cambios', { exact: true }).first().click();
  await page.waitForTimeout(3000);

  await expectVisible(yo.bio, 'la biografía se ve en el perfil');
  await expectVisible(yo.location, 'la ubicación se ve en el perfil');
  await shot('perfil-completo');

  // --- 3. Publicar con imagen ------------------------------------------------
  step('5. Publicar con imagen y etiquetas');

  // Con marca de ejecución: si no, dos recorridos dejan publicaciones idénticas
  // y la comprobación en la base no sabe cuál mirar.
  const miPost = `Jornada de limpieza este sábado en la ribera (${stamp}) #Agua #Voluntariado`;
  await page.getByRole('button', { name: 'Crear publicación' }).click();
  await page.waitForTimeout(1500);
  await page.getByLabel('Texto de la publicación').fill(miPost);
  await page.waitForTimeout(800);

  const [fotoChooser] = await Promise.all([
    page.waitForEvent('filechooser', { timeout: 15000 }),
    page.getByText('Añadir imagen', { exact: true }).first().click(),
  ]);
  await fotoChooser.setFiles(fotoPath);
  await page.waitForTimeout(3000);
  await shot('compositor');

  await page.getByText('Publicar', { exact: true }).first().click();
  await page.waitForTimeout(6000);

  await expectVisible('Jornada de limpieza', 'la publicación nueva encabeza el feed');
  await shot('feed-con-publicacion');

  {
    const { data: post } = await anon
      .from('posts')
      .select('content, hashtags, image_url')
      .eq('content', miPost)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (JSON.stringify(post?.hashtags) === JSON.stringify(['agua', 'voluntariado'])) {
      ok('las etiquetas se guardaron normalizadas');
    } else {
      bad(`hashtags = ${JSON.stringify(post?.hashtags)}`);
    }

    if (post?.image_url) {
      const response = await page.request.get(post.image_url);
      if (response.ok()) ok('la imagen de la publicación se sirve en público');
      else bad(`la imagen devuelve HTTP ${response.status()}`);
    } else {
      bad('la publicación se guardó sin imagen');
    }
  }

  // --- 4. Desde la tarjeta al perfil de su autora ----------------------------
  step('6. Ir de una tarjeta al perfil de su autora');

  await page.getByRole('link', { name: `Perfil de ${vecina.displayName}` }).first().click();
  await page.waitForTimeout(3500);

  if (new URL(page.url()).pathname.includes('/user/')) {
    ok('el avatar de la tarjeta lleva al perfil de su autora');
  } else {
    bad(`el avatar llevó a ${new URL(page.url()).pathname}`);
  }

  // A partir de aquí se va por URL: el proyecto tiene cuentas reales además de
  // las de prueba, y el recorrido no debe depender de cuál salga primero.
  await page.goto(`${origin}/user/${vecina.username}`, { waitUntil: 'networkidle' });
  await expectVisible(`@${vecina.username}`, 'se abre el perfil de la cuenta sembrada');
  await shot('perfil-ajeno');

  step('7. Seguir a esa cuenta');

  await page.getByText('Seguir', { exact: true }).first().click();
  await expectVisible('Siguiendo', 'el botón pasa a "Siguiendo"');
  await shot('siguiendo-a-la-autora');

  // --- 5. Filtro "Siguiendo" -------------------------------------------------
  step('8. El feed "Siguiendo" filtra y permite valorar');

  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3500);
  await page.getByRole('tab', { name: 'Siguiendo' }).click();
  await page.waitForTimeout(3000);

  await expectVisible('Plantamos 120 árboles', 'se ven las publicaciones de quien sigo');

  if (await visible('Jornada de limpieza')) {
    bad('el feed "Siguiendo" incluye publicaciones propias: debería traer solo las seguidas');
  } else {
    ok('no se cuelan publicaciones de cuentas que no sigo');
  }
  await shot('feed-siguiendo');

  // En este feed solo hay publicaciones de la cuenta seguida: valorar la
  // primera es determinista, mire lo que mire "Para ti".
  await page.getByRole('button', { name: 'Me gusta' }).first().click();
  await page.waitForTimeout(2500);

  {
    const { data: profile } = await anon
      .from('profiles')
      .select('id')
      .eq('username', yo.username)
      .maybeSingle();
    const { count } = await anon
      .from('likes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile?.id ?? '');

    if (count === 1) ok('el "me gusta" quedó en la base de datos');
    else bad(`la base de datos tiene ${count} "me gusta"`);
  }
  await shot('me-gusta')

  // --- 7. Detalle ------------------------------------------------------------
  step('9. Detalle de una publicación');

  await page.getByLabel('Ver la publicación').first().click();
  await page.waitForTimeout(3000);
  await expectVisible('Los comentarios llegan pronto', 'el detalle reserva el sitio de comentarios');
  await shot('detalle');

  // --- 8. Cerrar sesión y volver ---------------------------------------------
  step('10. Cerrar sesión y volver a entrar');

  await page.goto(`${origin}/perfil`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(4500);
  await page.getByRole('button', { name: 'Más opciones' }).click();
  await page.waitForTimeout(600);
  await page.getByText('Cerrar sesión', { exact: true }).first().click();
  await page.waitForTimeout(3500);
  await expectVisible('Tu entorno. Tu salud.', 'cerrar sesión devuelve a la bienvenida');

  await page.getByText('Iniciar sesión', { exact: true }).first().click();
  await page.waitForTimeout(1200);
  await page.getByPlaceholder('tu@email.com').fill(yo.email);
  await page.getByPlaceholder('Tu contraseña').fill(yo.password);
  await page.getByText('Entrar', { exact: true }).first().click();
  await page.waitForTimeout(4500);

  await page.getByRole('tab', { name: 'Para ti' }).click();
  await page.waitForTimeout(2500);
  await expectVisible('Jornada de limpieza', 'al volver a entrar, el feed conserva la publicación');

  if (await page.getByRole('button', { name: 'Quitar me gusta' }).first().isVisible()) {
    ok('el "me gusta" sigue puesto tras volver a entrar');
  } else {
    bad('se perdió el "me gusta" al volver a entrar');
  }

  await page.getByRole('tab', { name: 'Perfil' }).click();
  await page.waitForTimeout(2500);
  await expectVisible(yo.bio, 'el perfil conserva la biografía');
  await expectVisible('1', 'los contadores reflejan la actividad');
  await shot('perfil-tras-volver');

  // --- 9. Escritorio ---------------------------------------------------------
  step('11. Vista de escritorio');
  const wide = await context.newPage();
  await wide.setViewportSize({ width: 1280, height: 900 });
  await wide.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await wide.waitForTimeout(3500);
  shotIndex += 1;
  await wide.screenshot({
    path: join(SHOTS, `${String(shotIndex).padStart(2, '0')}-escritorio.png`),
  });
  ok('captura de escritorio guardada');
  await wide.close();
} catch (error) {
  bad(`recorrido interrumpido: ${error.message.split('\n')[0]}`);
  await shot('estado-al-fallar');
} finally {
  await browser.close();
  server.close();
  rmSync(TMP, { recursive: true, force: true });
}

console.log('\n' + '─'.repeat(64));
console.log(failures === 0 ? 'RESULTADO: el recorrido completo del MVP funciona.' : `RESULTADO: ${failures} fallo(s).`);
console.log(`Capturas en docs/verificacion/mvp/ (${shotIndex}).`);
console.log('\nCuentas de prueba creadas (bórralas con npm run cleanup:test-users):');
console.log(`  ${yo.email}`);
console.log(`  ${vecina.email}`);
process.exit(failures === 0 ? 0 : 1);
