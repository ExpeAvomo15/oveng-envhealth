import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * Chromium necesita libnspr4/libnss3/libasound, que en esta máquina no están
 * instaladas en el sistema y no se pueden instalar sin root. Se descargaron con
 * `apt-get download` y se extrajeron en ~/.local/chromium-deps; aquí se añaden
 * al LD_LIBRARY_PATH que heredará el proceso del navegador.
 *
 * En una máquina con las librerías del sistema, esa carpeta no existe y esto no
 * hace nada.
 */
export function useLocalBrowserLibraries() {
  const localLibs = join(homedir(), '.local/chromium-deps/usr/lib/x86_64-linux-gnu');

  if (existsSync(localLibs)) {
    const current = process.env.LD_LIBRARY_PATH;
    process.env.LD_LIBRARY_PATH = current ? `${localLibs}:${current}` : localLibs;
    return true;
  }

  return false;
}
