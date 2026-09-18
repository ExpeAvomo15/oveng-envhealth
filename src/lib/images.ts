import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * Selección, reducción y subida de imágenes.
 *
 * Lo comparten el avatar (F1.3) y la imagen de una publicación (F1.4), que solo
 * se diferencian en el tamaño máximo y el bucket de destino. Lo que se sube
 * nunca es lo que eligió el usuario: una foto de móvil son varios megas y los
 * buckets tienen límite.
 */

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

export type PickOptions = {
  /** Recorte cuadrado obligatorio. Para avatares. */
  square?: boolean;
};

/** Abre la galería. `null` si se cancela. Pide permiso si hace falta (nativo). */
export async function pickImage({ square = false }: PickOptions = {}): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Necesitamos acceso a tus fotos para adjuntar una imagen.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: square,
    aspect: square ? [1, 1] : undefined,
    quality: 1,
  });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Decodifica base64 a bytes sin depender de `atob`, que no está garantizado en
 * el motor de JavaScript de React Native. Son quince líneas: no compensa añadir
 * una dependencia solo para esto.
 */
export function base64ToBytes(base64: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = base64.replace(/[^A-Za-z0-9+/]/g, '');
  const length = Math.floor((clean.length * 3) / 4);
  const bytes = new Uint8Array(length);

  let byteIndex = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const chunk =
      (alphabet.indexOf(clean[i] ?? 'A') << 18) |
      (alphabet.indexOf(clean[i + 1] ?? 'A') << 12) |
      (alphabet.indexOf(clean[i + 2] ?? 'A') << 6) |
      alphabet.indexOf(clean[i + 3] ?? 'A');

    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 16) & 0xff;
    if (byteIndex < length) bytes[byteIndex++] = (chunk >> 8) & 0xff;
    if (byteIndex < length) bytes[byteIndex++] = chunk & 0xff;
  }

  return bytes;
}

/** Reduce al tamaño máximo por el lado mayor y recodifica a JPEG. */
export async function shrinkToJpeg(
  image: PickedImage,
  { maxSize, quality }: { maxSize: number; quality: number },
): Promise<Uint8Array> {
  const context = ImageManipulator.ImageManipulator.manipulate(image.uri);

  if (Math.max(image.width, image.height) > maxSize) {
    context.resize(image.width >= image.height ? { width: maxSize } : { height: maxSize });
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: quality,
    base64: true,
  });

  if (!saved.base64) {
    throw new Error('No se ha podido procesar la imagen.');
  }

  return base64ToBytes(saved.base64);
}

/**
 * Sube los bytes y devuelve la URL pública.
 *
 * La ruta tiene que empezar por `{uid}/`: es lo que exigen las políticas de
 * `storage.objects`, que deniegan escribir fuera de la carpeta propia.
 */
export async function uploadImage(
  bucket: 'avatars' | 'post-images',
  path: string,
  bytes: Uint8Array,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) throw error;

  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Ruta dentro de un bucket a partir de su URL pública, o `null` si no es de ahí. */
export function storagePathFromPublicUrl(bucket: string, url: string | null): string | null {
  if (!url) return null;
  const marker = `/${bucket}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : (url.slice(index + marker.length).split('?')[0] ?? null);
}
