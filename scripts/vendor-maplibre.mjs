/**
 * Copia el worker de MapLibre (y el módulo compartido que importa) a
 * `public/vendor/maplibre/`, para que el export lo sirva (F5.0).
 *
 * MapLibre 6 calcula la URL del worker con `import.meta.url`, que Metro no
 * conserva: pedía `_expo/static/js/web/maplibre-gl-worker.mjs`, que no existe,
 * y cada visita al mapa daba un 404 y dos errores de consola. El mapa lo apunta
 * aquí con `setWorkerUrl`.
 *
 * Corre en `postinstall` (también en `npm ci` del deploy), así que la copia
 * siempre es la de la versión instalada. No se commitea.
 */
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const from = join('node_modules', 'maplibre-gl', 'dist');
const to = join('public', 'vendor', 'maplibre');
mkdirSync(to, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(from, file), join(to, file));
}
console.log(`MapLibre: worker copiado a ${to}`);
