import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Almacenamiento de la sesión de Supabase Auth.
 *
 * - **Web:** `localStorage`. Durante el render estático del export web no hay
 *   `window`, así que todas las operaciones se protegen y devuelven vacío.
 * - **Nativo:** `expo-secure-store` (Keychain en iOS, EncryptedSharedPreferences
 *   en Android).
 *
 * ## Por qué se trocea el valor
 *
 * SecureStore limita cada valor a **2048 bytes** y una sesión de Supabase
 * (access token + refresh token + objeto de usuario) ronda los 3–4 KB, así que
 * no cabe. Se guarda repartida en varias entradas: una cabecera en `key` con el
 * número de trozos y los trozos en `key.0`, `key.1`, … Al leer se recomponen.
 *
 * La cabecera se escribe **al final**: si la escritura se interrumpe a medias,
 * la lectura no encuentra cabecera válida, la sesión se descarta y el usuario
 * vuelve a entrar. Nunca se recompone una sesión a medias.
 *
 * La alternativa oficial de Supabase es cifrar la sesión con AES y guardarla en
 * AsyncStorage dejando solo la clave en SecureStore; se descartó porque añade
 * tres dependencias y deja el contenido fuera del almacén seguro. Ver
 * docs/notas.md.
 */
export type SessionStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

/**
 * Unidades UTF-16 por trozo. Un carácter ocupa como mucho 3 bytes en UTF-8, así
 * que 600 unidades son 1800 bytes en el peor caso: por debajo del límite de 2048.
 */
const CHUNK_SIZE = 600;

/** Tope de barrido al borrar sin cabecera válida: 16 trozos ≈ 28 KB. */
const MAX_CHUNKS = 16;

const chunkKey = (key: string, index: number) => `${key}.${index}`;

/** Corta respetando los pares suplentes: partir uno guardaría un carácter inválido. */
function splitIntoChunks(value: string): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < value.length) {
    let end = Math.min(start + CHUNK_SIZE, value.length);

    const code = value.charCodeAt(end - 1);
    const isHighSurrogate = code >= 0xd800 && code <= 0xdbff;
    if (isHighSurrogate && end < value.length) {
      end -= 1;
    }

    chunks.push(value.slice(start, end));
    start = end;
  }

  return chunks;
}

const secureStoreStorage: SessionStorage = {
  async getItem(key) {
    const header = await SecureStore.getItemAsync(key);
    if (header === null) {
      return null;
    }

    const count = Number.parseInt(header, 10);
    if (!Number.isInteger(count) || count < 1 || count > MAX_CHUNKS) {
      await secureStoreStorage.removeItem(key);
      return null;
    }

    const chunks: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, index));
      if (chunk === null) {
        // Sesión incompleta: se descarta entera en lugar de devolver algo roto.
        await secureStoreStorage.removeItem(key);
        return null;
      }
      chunks.push(chunk);
    }

    return chunks.join('');
  },

  async setItem(key, value) {
    // Limpia primero: un valor anterior más largo dejaría trozos huérfanos.
    await secureStoreStorage.removeItem(key);

    const chunks = splitIntoChunks(value);
    for (let index = 0; index < chunks.length; index += 1) {
      await SecureStore.setItemAsync(chunkKey(key, index), chunks[index] ?? '');
    }

    // La cabecera, la última: hasta que exista, la sesión no se considera escrita.
    await SecureStore.setItemAsync(key, String(chunks.length));
  },

  async removeItem(key) {
    const header = await SecureStore.getItemAsync(key);
    const count = header === null ? Number.NaN : Number.parseInt(header, 10);
    const bound = Number.isInteger(count) && count > 0 && count <= MAX_CHUNKS ? count : MAX_CHUNKS;

    for (let index = 0; index < bound; index += 1) {
      await SecureStore.deleteItemAsync(chunkKey(key, index));
    }

    await SecureStore.deleteItemAsync(key);
  },
};

const browserStorage: SessionStorage = {
  async getItem(key) {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(key);
  },

  async setItem(key, value) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem(key, value);
  },

  async removeItem(key) {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.removeItem(key);
  },
};

export const sessionStorage: SessionStorage =
  Platform.OS === 'web' ? browserStorage : secureStoreStorage;
