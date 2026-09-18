import type { Post } from './database.types';
import { pickImage, shrinkToJpeg, uploadImage, type PickedImage } from './images';
import { parseHashtags } from './hashtags';
import { supabase } from './supabase';

/**
 * Publicaciones: composición y subida de su imagen.
 *
 * El feed (leer publicaciones de las cuentas seguidas) llega en F1.5 y se
 * añadirá aquí.
 */

const BUCKET = 'post-images';
/** Ancho máximo. Una foto de feed no necesita más, y el bucket admite 10 MB. */
const MAX_SIZE = 1600;
const JPEG_QUALITY = 0.8;

/** Límite de caracteres de una publicación. La base admite 2000; la UI, esto. */
export const POST_MAX_LENGTH = 500;
/** A partir de aquí se enseña el contador. */
export const POST_COUNTER_THRESHOLD = 400;

export type { PickedImage };

/** Abre la galería sin recorte: la foto se publica con su encuadre. */
export function pickPostImage(): Promise<PickedImage | null> {
  return pickImage();
}

/** Reduce, sube a `post-images/{uid}/` y devuelve la URL pública. */
export async function uploadPostImage(userId: string, image: PickedImage): Promise<string> {
  const bytes = await shrinkToJpeg(image, { maxSize: MAX_SIZE, quality: JPEG_QUALITY });
  const path = `${userId}/post-${Date.now()}.jpg`;
  return uploadImage(BUCKET, path, bytes);
}

export type NewPost = {
  authorId: string;
  content: string;
  imageUrl?: string | null;
};

/**
 * Crea la publicación. Las etiquetas se extraen del propio texto: no hay un
 * campo aparte que rellenar ni forma de que texto y etiquetas se contradigan.
 */
export async function createPost({ authorId, content, imageUrl = null }: NewPost): Promise<Post> {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    throw new Error('La publicación no puede estar vacía.');
  }
  if (trimmed.length > POST_MAX_LENGTH) {
    throw new Error(`La publicación no puede pasar de ${POST_MAX_LENGTH} caracteres.`);
  }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      author_id: authorId,
      content: trimmed,
      image_url: imageUrl,
      hashtags: parseHashtags(trimmed),
    })
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('No se ha podido publicar: la base de datos no aceptó el cambio.');
  }

  return data;
}
