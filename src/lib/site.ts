import { Platform } from 'react-native';

/** Dónde vive la demo publicada. Se usa para construir enlaces compartibles. */
const DEPLOYED_SITE = 'https://expeavomo15.github.io/oveng-envhealth';

/**
 * Raíz de la app tal como está servida ahora mismo.
 *
 * En web la app cuelga de un subpath (`/oveng-envhealth` en Pages, el mismo en
 * las verificaciones locales), así que la raíz no es el origen. Se obtiene
 * **restándole a `window.location.pathname` la ruta de expo-router**: si el
 * navegador está en `/oveng-envhealth/entidad/rio-ntem` y la ruta interna es
 * `/entidad/rio-ntem`, lo que sobra es la raíz.
 *
 * Antes se hacía quitando por expresión regular una lista de rutas conocidas, y
 * era una bomba de relojería: la lista no incluía `/entidad/...`, así que
 * compartir desde una ficha de entidad habría copiado un enlace roto. Restar la
 * ruta no necesita saber qué rutas existen.
 */
export function appRoot(currentRoutePath: string): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { origin, pathname } = window.location;

    const base =
      currentRoutePath !== '/' && pathname.endsWith(currentRoutePath)
        ? pathname.slice(0, pathname.length - currentRoutePath.length)
        : pathname;

    return `${origin}${base}`.replace(/\/+$/, '');
  }

  return DEPLOYED_SITE;
}

/**
 * Enlace público a una ruta de la app.
 *
 * `currentRoutePath` es el `usePathname()` de quien llama: hace falta para
 * saber de dónde cuelga la app.
 */
export function shareUrl(target: string, currentRoutePath: string): string {
  return `${appRoot(currentRoutePath)}${target}`;
}

/** URL pública de una publicación. */
export function postUrl(postId: string, currentRoutePath: string): string {
  return shareUrl(`/post/${postId}`, currentRoutePath);
}

/** URL pública de una entidad. */
export function entityUrl(slug: string, currentRoutePath: string): string {
  return shareUrl(`/entidad/${slug}`, currentRoutePath);
}
