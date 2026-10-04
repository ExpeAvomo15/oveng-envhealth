/**
 * Genera los derivados de la marca a partir de los originales de
 * `docs/design/brand/`, que son la fuente de verdad y no se tocan.
 *
 *   npm run brand:derivatives
 *
 * Los derivados se commitean, así que esto solo hace falta cuando cambie un
 * original. Salen:
 *
 * - `src/assets/brand/`: lo que empaqueta la app (lockup y tortuga-O a 3x del
 *   tamaño al que se pintan, que es lo que pide una pantalla de alta densidad).
 * - `assets/images/favicon-oveng.png`: entrada de `web.favicon` en app.json;
 *   el export de Expo lo convierte en `favicon.ico`.
 * - `public/`: icono táctil de iOS y los del manifest de la webapp. Llevan
 *   fondo blanco y margen: iOS rellena de negro lo transparente, y un icono de
 *   pantalla de inicio pegado al borde se ve recortado.
 *
 * Usa `jimp-compact`, que llega con las dependencias de Expo
 * (`@expo/image-utils`): no hay que instalar nada para ejecutarlo.
 */
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const Jimp = require('jimp-compact');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const brand = (name) => join(root, 'docs/design/brand', name);

const LOCKUP_GREEN = brand('logo-oveng-hq-verde.png');
const TURTLE_GREEN = brand('logo-oveng-tortuga-hq-verde.png');

/** Escala al alto pedido, conservando la proporción. */
async function byHeight(source, height, out) {
  const image = await Jimp.read(source);
  image.resize(Jimp.AUTO, height, Jimp.RESIZE_BICUBIC);
  await write(image, out);
}

/** Centra el original en un lienzo cuadrado, opcionalmente con fondo y margen. */
async function square(source, size, out, { background = 0x00000000, padding = 0 } = {}) {
  const image = await Jimp.read(source);
  const inner = Math.round(size * (1 - 2 * padding));
  image.scaleToFit(inner, inner, Jimp.RESIZE_BICUBIC);

  const canvas = new Jimp(size, size, background);
  const x = Math.round((size - image.bitmap.width) / 2);
  const y = Math.round((size - image.bitmap.height) / 2);
  canvas.composite(image, x, y);
  await write(canvas, out);
}

async function write(image, relative) {
  const out = join(root, relative);
  mkdirSync(dirname(out), { recursive: true });
  image.deflateLevel(9);
  await image.writeAsync(out);
  console.log(`  ✓ ${relative} (${image.bitmap.width}×${image.bitmap.height})`);
}

const WHITE = 0xffffffff;

console.log('Derivados de la marca');

// Cabecera de Inicio: el lockup se pinta a 32 px de alto.
await byHeight(LOCKUP_GREEN, 96, 'src/assets/brand/lockup-verde.png');
// Bienvenida: el lockup se pinta a 64 px de alto.
await byHeight(LOCKUP_GREEN, 192, 'src/assets/brand/lockup-verde-lg.png');
// Pantalla de carga: la tortuga-O sola, a 88 px.
await square(TURTLE_GREEN, 264, 'src/assets/brand/tortuga-verde.png');

// Favicon: Expo lo reduce y lo convierte a .ico en el export.
await square(TURTLE_GREEN, 196, 'assets/images/favicon-oveng.png');

// Icono de la webapp.
await square(TURTLE_GREEN, 180, 'public/apple-touch-icon.png', { background: WHITE, padding: 0.08 });
await square(TURTLE_GREEN, 192, 'public/icon-192.png', { background: WHITE, padding: 0.08 });
await square(TURTLE_GREEN, 512, 'public/icon-512.png', { background: WHITE, padding: 0.08 });
