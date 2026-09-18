import { Platform } from 'react-native';

/** Dónde vive la demo publicada. Se usa para construir enlaces compartibles. */
const DEPLOYED_SITE = 'https://expeavomo15.github.io/oveng-envhealth';

/**
 * URL pública de una publicación.
 *
 * En web se toma el origen real para que compartir desde local copie un enlace
 * local; en nativo no hay `window`, así que se usa la URL desplegada.
 */
export function postUrl(postId: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const base = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
    // `pathname` puede traer la ruta actual: nos quedamos con el subpath base.
    const root = base.replace(/\/(post|user)\/.*$/, '').replace(/\/(buscar|mapa|perfil|crear|editar-perfil|login|register|welcome|forgot-password|design-system)$/, '');
    return `${root}/post/${postId}`;
  }

  return `${DEPLOYED_SITE}/post/${postId}`;
}
