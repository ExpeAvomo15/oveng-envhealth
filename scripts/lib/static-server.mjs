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
 * Sirve el export estático como lo haría GitHub Pages: las rutas limpias
 * (`/buscar`) se resuelven al `.html` correspondiente.
 */
export function serveStatic(root, port = 4173) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname = decodeURIComponent(url.pathname);

    // Evita salir de la raíz con ../
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    let file = join(root, safe);

    if (safe === '/' || safe === '') {
      file = join(root, 'index.html');
    } else if (!existsSync(file) || statSync(file).isDirectory()) {
      const asHtml = `${file.replace(/\/$/, '')}.html`;
      file = existsSync(asHtml) ? asHtml : join(root, '+not-found.html');
    }

    if (!existsSync(file)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve({ server, origin: `http://localhost:${port}` }));
  });
}
