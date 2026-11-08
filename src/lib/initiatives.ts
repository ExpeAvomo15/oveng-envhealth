import type { EnvironmentalCategoryName, Entity } from './database.types';
import { shrinkToJpeg, uploadImage, type PickedImage } from './images';
import { supabase } from './supabase';

/**
 * Iniciativas creadas por la comunidad (F5.1, migración `011`).
 *
 * "El Instagram de las causas" exige que la gente pueda crear las suyas. Solo
 * iniciativas: lugares y empresas siguen siendo curados, y **lo impone RLS**,
 * no esta capa. Quien la crea queda como administradora al instante (trigger de
 * la `011`), así que publica ofertas y edita su página como cualquier admin.
 */

/** Topes de la interfaz, dentro de los `check` de la `011`. */
export const INITIATIVE_LIMITS = { name: 80, description: 1000 } as const;
/** Mínimo de caracteres del nombre (el `check` pide 3). */
export const INITIATIVE_NAME_MIN = 3;

export type InitiativeDraft = {
  name: string;
  description: string;
  category: EnvironmentalCategoryName;
  /** La zona elegida en el buscador de lugares (Open-Meteo, F4.2). */
  place: { name: string; detail: string; lat: number; lng: number };
  /** Foto de portada opcional, ya elegida. */
  cover: PickedImage | null;
};

/** ¿Está aplicada la `011`? Se pregunta una vez por sesión de la app. */
let available: Promise<boolean> | null = null;

export function communityInitiativesAvailable(): Promise<boolean> {
  available ??= (async () => {
    const { error } = await supabase.from('entities').select('created_by').limit(1);
    // Sin la columna, PostgREST responde 42703 ("column does not exist").
    return error === null;
  })();
  return available;
}

/** "Limpieza del Ntem" → "limpieza-del-ntem-k3f9": legible y sin choques. */
export function initiativeSlug(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base.length >= 3 ? base : 'iniciativa'}-${suffix}`;
}

/** El país es lo último del detalle del lugar: "Litoral, Guinea Ecuatorial". */
function countryOf(detail: string): string | null {
  const parts = detail.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1]!.slice(0, 80) : null;
}

async function uploadCover(userId: string, image: PickedImage): Promise<string> {
  const bytes = await shrinkToJpeg(image, { maxSize: 1600, quality: 0.8 });
  // En la carpeta propia de `post-images`: sus políticas ya exigen `{uid}/`.
  return uploadImage('post-images', `${userId}/iniciativa-${Date.now()}.jpg`, bytes);
}

/** Traduce los errores de la base a algo que se pueda leer. */
export function initiativeErrorMessage(error: unknown): string {
  const message = String((error as { message?: string })?.message ?? '');
  if (/tres iniciativas hoy/i.test(message)) return 'Ya has creado tres iniciativas hoy. Vuelve mañana.';
  if (/entities_name_length/.test(message)) return 'El nombre tiene que tener entre 3 y 80 caracteres.';
  if (/row-level security/i.test(message)) return 'No tienes permiso para hacer esto con tu cuenta.';
  return 'No se ha podido guardar. Prueba otra vez.';
}

/** Crea la iniciativa y devuelve su slug, para abrir su página. */
export async function createInitiative(userId: string, draft: InitiativeDraft): Promise<string> {
  const coverUrl = draft.cover ? await uploadCover(userId, draft.cover) : null;
  const slug = initiativeSlug(draft.name);

  const { error } = await supabase.from('entities').insert({
    slug,
    name: draft.name.trim(),
    type: 'iniciativa',
    category: draft.category,
    description: draft.description.trim() || null,
    location_name: draft.place.name.slice(0, 120),
    country: countryOf(draft.place.detail),
    lat: draft.place.lat,
    lng: draft.place.lng,
    cover_image_url: coverUrl,
    created_by: userId,
  });
  if (error) throw error;
  return slug;
}

export type InitiativeChanges = Omit<InitiativeDraft, 'cover' | 'place'> & {
  place: InitiativeDraft['place'] | null;
  cover: PickedImage | null;
};

/** Edita la página (solo sus administradoras: lo decide RLS). */
export async function updateInitiative(
  userId: string,
  entity: Pick<Entity, 'id'>,
  changes: InitiativeChanges,
): Promise<void> {
  const coverUrl = changes.cover ? await uploadCover(userId, changes.cover) : undefined;

  const { data, error } = await supabase
    .from('entities')
    .update({
      name: changes.name.trim(),
      description: changes.description.trim() || null,
      category: changes.category,
      ...(changes.place
        ? {
            location_name: changes.place.name.slice(0, 120),
            country: countryOf(changes.place.detail),
            lat: changes.place.lat,
            lng: changes.place.lng,
          }
        : {}),
      ...(coverUrl ? { cover_image_url: coverUrl } : {}),
    })
    .eq('id', entity.id)
    .select('id');
  if (error) throw error;
  // RLS no da error al filtrar: si no ha cambiado ninguna fila, no era tuya.
  if (!data || data.length === 0) throw new Error('row-level security');
}
