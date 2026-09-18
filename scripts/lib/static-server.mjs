import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

/**
 * Sirve el export estático imitando a GitHub Pages:
 *
 * - todo cuelga de `basePath` (el subpath del repositorio);
 * - las rutas limpias se resuelven al `.html` correspondiente (`/mapa` →
 *   `mapa.html`), que es lo que hace Pages;
 * - lo que no existe cae en `404.html`, no en un 404 pelado, que es donde
 *   entra el fallback de SPA.
 */
export function serveStatic(root, { port = 4173, basePath = '' } = {}) {
  const base = basePath.replace(/\/$/, '');

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);

    // Fuera del subpath, Pages no sirve nada de este sitio.
    if (base && !pathname.startsWith(`${base}/`) && pathname !== base) {
      res.writeHead(404);
      res.end('fuera del basePath');
      return;
    }
    if (base) {
      pathname = pathname.slice(base.length) || '/';
    }

    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, safe);

    if (safe === '/' || safe === '') {
      file = join(root, 'index.html');
    } else if (!existsSync(file) || statSync(file).isDirectory()) {
      const asHtml = `${file.replace(/\/$/, '')}.html`;
      file = existsSync(asHtml) ? asHtml : join(root, '404.html');
    }

    if (!existsSync(file)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    const status = file.endsWith('404.html') ? 404 : 200;
    res.writeHead(status, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, origin: `http://localhost:${port}${base}` }));
  });
}
