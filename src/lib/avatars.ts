import {
  pickImage,
  shrinkToJpeg,
  storagePathFromPublicUrl,
  uploadImage,
  type PickedImage,
} from './images';
import { supabase } from './supabase';

/**
 * Avatar del perfil: 512 px por el lado mayor, JPEG, en `avatars/{uid}/`.
 * La mecánica común de selección, reducción y subida vive en `images.ts`.
 */

const BUCKET = 'avatars';
const MAX_SIZE = 512;
const JPEG_QUALITY = 0.8;

export type { PickedImage };

/** Abre la galería con recorte cuadrado. `null` si se cancela. */
export function pickAvatarImage(): Promise<PickedImage | null> {
  return pickImage({ square: true });
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
  const bytes = await shrinkToJpeg(image, { maxSize: MAX_SIZE, quality: JPEG_QUALITY });
  const path = `${userId}/avatar-${Date.now()}.jpg`;
  const url = await uploadImage(BUCKET, path, bytes);

  const previousPath = storagePathFromPublicUrl(BUCKET, previousAvatarUrl);
  if (previousPath && previousPath.startsWith(`${userId}/`) && previousPath !== path) {
    // Si falla, no se interrumpe nada: queda un archivo huérfano, no un error
    // delante del usuario cuando su avatar ya se ha cambiado.
    await supabase.storage.from(BUCKET).remove([previousPath]);
  }

  return url;
}
