import type { FeedPost } from './feed';

/**
 * Las filas del feed: publicaciones y las dos tarjetas ambientales.
 *
 * Se calculan **a partir de la lista completa de publicaciones** en cada
 * render, no se insertan al llegar cada página. Es lo que garantiza las tres
 * cosas que pedía la tarea sin código extra:
 *
 * - **No rompen la paginación**: el cursor sigue siendo de `posts`; las
 *   tarjetas no son filas de la base y no cuentan para el "hay más".
 * - **No se duplican al cargar la página 2**: la posición es fija, así que por
 *   muchas páginas que entren sigue habiendo una tarjeta de cada.
 * - **Desaparecen limpiamente**: si no hay datos de zona, simplemente no se
 *   añaden.
 */

export type FeedRow =
  | { kind: 'post'; key: string; post: FeedPost }
  | { kind: 'zone'; key: 'zone' }
  | { kind: 'featured'; key: 'featured' }
  | { kind: 'empty'; key: 'empty' };

/**
 * Tras cuántas publicaciones se cuela la tarjeta de zona.
 *
 * **El contenido social va primero.** Encabezar el feed con un panel de datos
 * lo convertiría en un cuadro de mandos con publicaciones debajo, que es
 * justo lo que la visión dice que OVENG no es: el feed es la puerta y el dato
 * aparece dentro. Con menos publicaciones que esto, las tarjetas van al final.
 */
export const ZONE_CARD_AFTER = 3;

export type FeedCards = {
  /** Hay datos de zona que enseñar (aunque sea "sin mediciones"). */
  zone: boolean;
  /** Hay iniciativa destacada en la zona. */
  featured: boolean;
};

export function buildFeedRows(posts: FeedPost[], cards: FeedCards): FeedRow[] {
  const rows: FeedRow[] = [];

  const extras: FeedRow[] = [];
  if (cards.zone) extras.push({ kind: 'zone', key: 'zone' });
  if (cards.featured) extras.push({ kind: 'featured', key: 'featured' });

  // Sin publicaciones, las tarjetas van **delante** del vacío (F5.0). La regla
  // de no encabezar el feed con datos protege a las publicaciones, y aquí no
  // hay ninguna: con la red recién nacida, el dato de tu zona es lo único que
  // ya sirve, y escondido bajo un "sé el primero" quedaba fuera de pantalla.
  if (posts.length === 0) {
    rows.push(...extras);
    rows.push({ kind: 'empty', key: 'empty' });
    return rows;
  }

  posts.forEach((post, index) => {
    if (index === ZONE_CARD_AFTER) rows.push(...extras);
    rows.push({ kind: 'post', key: post.id, post });
  });

  // Menos publicaciones que el hueco previsto: las tarjetas van al final.
  if (posts.length < ZONE_CARD_AFTER) rows.push(...extras);

  return rows;
}
