import type { TextStyle } from 'react-native';

/**
 * Quita el anillo de foco que pinta el navegador en los campos de texto.
 *
 * `outlineWidth: 0` **no sirve**: Chrome usa `outline-style: auto`, que dibuja
 * su propio anillo ignorando el ancho. Hace falta `outline-style: none`, y
 * React Native tipa `outlineStyle` como `'solid' | 'dotted' | 'dashed'` porque
 * en nativo no existe ese valor — de ahí la conversión.
 *
 * Solo se usa donde hay **otro** indicador de foco visible: el `TextField`
 * cambia de borde y de fondo al enfocarse, y el compositor es una pantalla
 * completa con el cursor dentro. Quitarlo sin sustituto dejaría a quien navega
 * con teclado sin saber dónde está.
 */
export const noWebFocusRing = { outlineStyle: 'none' } as unknown as TextStyle;
