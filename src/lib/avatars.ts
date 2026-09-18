import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

/**
 * Selección, reducción y subida del avatar.
 *
 * Lo que se sube nunca es lo que eligió el usuario: una foto de móvil son
 * varios megas y el bucket `avatars` admite 2 MB. Se reduce a 512 px por el
 * lado mayor y se recodifica a JPEG antes de tocar la red.
 *
 * La ruta es siempre `{uid}/…`, que es lo que exigen las políticas de
 * `storage.objects`: fuera de esa carpeta, RLS deniega la escritura.
 */

const BUCKET = 'avatars';
const MAX_SIZE = 512;
const JPEG_QUALITY = 0.8;

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
};

/** Abre la galería. `null` si se cancela. Pide permiso si hace falta (nativo). */
export async function pickAvatarImage(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Necesitamos acceso a tus fotos para cambiar el avatar.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });

  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/**
 * Decodifica base64 a bytes sin depender de `atob`, que no está garantizado en
 * el motor de JavaScript de React Native.
 */
function base64ToBytes(base64: string): Uint8Array {
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

/** Reduce a 512 px por el lado mayor y recodifica a JPEG. */
async function shrinkToJpeg(image: PickedImage): Promise<Uint8Array> {
  const context = ImageManipulator.ImageManipulator.manipulate(image.uri);

  const longestSide = Math.max(image.width, image.height);
  if (longestSide > MAX_SIZE) {
    context.resize(
      image.width >= image.height ? { width: MAX_SIZE } : { height: MAX_SIZE },
    );
  }

  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({
    format: ImageManipulator.SaveFormat.JPEG,
    compress: JPEG_QUALITY,
    base64: true,
  });

  if (!saved.base64) {
    throw new Error('No se ha podido procesar la imagen.');
  }

  return base64ToBytes(saved.base64);
}

/** Ruta dentro del bucket a partir de una URL pública, o `null` si no es de ahí. */
function storagePathFromPublicUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length).split('?')[0] ?? null;
}

/**
 * Sube el avatar y devuelve su URL pública.
 *
 * El nombre lleva marca de tiempo en vez de ser fijo: con un nombre estable, el
 * navegador seguiría enseñando la foto anterior desde su caché. El archivo viejo
 * se borra después, y solo si estaba en la carpeta del propio usuario.
 */
export async function uploadAvatar(
  userId: string,
  image: PickedImage,
  previousAvatarUrl: string | null,
): Promise<string> {
  const bytes = await shrinkToJpeg(image);
  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    contentType: 'image/jpeg',
    upsert: false,
  });

  if (error) throw error;

  const previousPath = storagePathFromPublicUrl(previousAvatarUrl);
  if (previousPath && previousPath.startsWith(`${userId}/`) && previousPath !== path) {
    // Si falla, no se interrumpe nada: queda un archivo huérfano, no un error
    // delante del usuario cuando su avatar ya se ha cambiado.
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
