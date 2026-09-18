/**
 * Etiquetas de una publicación.
 *
 * Los hashtags son la clasificación temática del contenido: libres, escritos
 * por quien publica. Las categorías ambientales estructuradas (aire, agua,
 * suelo…) NO viven aquí — pertenecen a las entidades y a las capas del mapa de
 * F2. Ver la decisión en @docs/notas.md.
 */

/**
 * Captura `#` seguido de letras, números o guion bajo **en cualquier idioma**.
 *
 * `\p{L}` con la bandera `u` cubre tildes, `ñ`, diéresis y alfabetos no latinos;
 * `[a-z]` habría partido "#Reforestación" en "reforestaci". `\p{M}` admite las
 * marcas diacríticas que van sueltas cuando el texto no está normalizado.
 */
const HASHTAG_PATTERN = /#([\p{L}\p{M}\p{N}_]+)/gu;

export type TextSegment =
  | { kind: 'text'; value: string }
  | { kind: 'hashtag'; value: string; tag: string };

/**
 * Parte el texto en trozos normales y etiquetas, para poder pintar las segundas
 * en verde sin tocar el contenido.
 */
export function splitByHashtags(content: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(HASHTAG_PATTERN)) {
    const start = match.index ?? 0;

    if (start > lastIndex) {
      segments.push({ kind: 'text', value: content.slice(lastIndex, start) });
    }

    segments.push({
      kind: 'hashtag',
      value: match[0],
      tag: (match[1] ?? '').toLowerCase(),
    });

    lastIndex = start + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({ kind: 'text', value: content.slice(lastIndex) });
  }

  return segments;
}

/** Máximo de etiquetas por publicación: más que esto no clasifica, es ruido. */
export const MAX_HASHTAGS = 10;

/**
 * Extrae las etiquetas del texto, normalizadas: en minúsculas, sin `#` y sin
 * repetir. Se conservan las tildes — "reforestación" y "reforestacion" son
 * palabras distintas y quitarlas sería decidir por quien escribe.
 */
export function parseHashtags(content: string): string[] {
  const found: string[] = [];
  const seen = new Set<string>();

  for (const match of content.matchAll(HASHTAG_PATTERN)) {
    const raw = match[1];
    if (!raw) continue;

    const tag = raw.toLowerCase();
    if (seen.has(tag)) continue;

    seen.add(tag);
    found.push(tag);

    if (found.length === MAX_HASHTAGS) break;
  }

  return found;
}
