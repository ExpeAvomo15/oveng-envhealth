/**
 * Paleta de OVENG EnvHealth.
 *
 * Los valores de `palette` son los fijados en AGENTS.md y salen de los mockups
 * oficiales (docs/design/). No se añaden colores nuevos sin que aparezcan allí.
 * El resto son tokens semánticos: la UI usa SIEMPRE estos, nunca un hex suelto
 * ni una entrada de `palette` directamente.
 *
 * Regla de uso del verde: es acento, no fondo. Fondos y superficies son
 * neutros; el verde marca acciones primarias y lo ambiental destacado.
 *
 * Contraste (WCAG AA, 4.5:1 para texto normal) — medido, no estimado:
 * - `accent` sobre `surface` blanca .......... 5.1:1 ✓ texto y iconos
 * - `textInverse` sobre `accent` ............. 5.1:1 ✓ botón primario
 * - `info` sobre blanco ...................... 2.4:1 ✗
 * - `textInverse` sobre `info` ............... 2.4:1 ✗
 * - `text` sobre `info` ...................... 6.7:1 ✓
 * - `text` sobre `warning` .................. 10.2:1 ✓
 * - `warningText` sobre blanco ..............  4.9:1 ✓ texto de aviso
 * - `danger` sobre blanco ...................  5.6:1 ✓ texto de error
 *
 * De ahí dos reglas:
 *
 * 1. **El azul y el amarillo de la paleta son rellenos, nunca color de texto.**
 *    El verde sí funciona como texto sobre superficies claras.
 * 2. **El color del texto sobre un relleno se decide midiendo su luminancia,**
 *    no por costumbre: estos dos son claros y piden texto oscuro, pero un
 *    relleno oscuro pide texto blanco (ver `theme/categories.ts`).
 */

const palette = {
  green: '#2E7D32',
  greenLight: '#A5D6A7',
  blue: '#02B8D1',
  yellow: '#FFC107',
  grey: '#616161',
  surface: '#F4F6F9',
  white: '#FFFFFF',
} as const;

/** Neutros derivados de la superficie base, para bordes y estados. */
const neutral = {
  /** Texto principal: gris muy oscuro, no negro puro. */
  ink: '#1C2024',
  /** Bordes y separadores hairline. */
  line: '#E3E8EF',
  /** Fondo de elemento inactivo / relleno sutil. */
  fill: '#EDF1F6',
  /** Texto y iconos deshabilitados. */
  muted: '#9AA4B2',
} as const;

export const colors = {
  // --- Superficies ---
  /** Fondo de pantalla. */
  background: palette.surface,
  /** Fondo de card, hoja o barra. */
  surface: palette.white,
  /** Relleno sutil dentro de una card: inputs, chips inactivos. */
  surfaceMuted: neutral.fill,

  // --- Texto ---
  /** Texto principal. */
  text: neutral.ink,
  /** Texto secundario: metadatos, descripciones, timestamps. */
  textSecondary: palette.grey,
  /** Texto deshabilitado o placeholder. */
  textMuted: neutral.muted,
  /** Texto sobre `accent`. Solo sobre verde: sobre azul o amarillo no contrasta. */
  textInverse: palette.white,

  // --- Acento primario (verde) ---
  /** Acciones primarias, estado activo, lo ambiental positivo. */
  accent: palette.green,
  /** Verde claro de la paleta. Relleno con texto oscuro encima: avatares, barras. */
  accentSoft: palette.greenLight,
  /** Tinte del verde para fondos de chip/badge que llevan texto `accent`. */
  accentTint: '#2E7D3214',

  // --- Acento secundario (azul): datos, capas del mapa, enlaces gráficos ---
  /** Relleno azul. Lleva texto `text` encima, nunca `textInverse`. */
  info: palette.blue,
  /** Tinte del azul para fondos de chip/badge con texto `text`. */
  infoTint: '#02B8D11F',

  // --- Aviso (amarillo): valoraciones, destacados, avisos no bloqueantes ---
  /** Relleno amarillo. Lleva texto `text` encima. */
  warning: palette.yellow,
  /** Tinte del amarillo para fondos de chip/badge con texto `text`. */
  warningTint: '#FFC1072E',
  /**
   * Ámbar oscuro para **texto** de aviso. El amarillo de la paleta da 1.6:1
   * sobre blanco y es ilegible; este da 4.9:1 y sigue leyéndose como amarillo.
   */
  warningText: '#A16207',

  // --- Error (rojo) ---
  /**
   * Rojo de error. **No está en la paleta de AGENTS.md**: se añadió en F1.4
   * porque un contador que ha superado el límite necesita decirlo con un color
   * que nadie confunda con un aviso. 5.6:1 sobre blanco. Se usa con cuentagotas:
   * solo para lo que ya está mal, nunca para lo que está a punto de estarlo.
   */
  danger: '#C62828',

  // --- Estructura ---
  /** Borde y separador. */
  border: neutral.line,
} as const;

export type ColorToken = keyof typeof colors;
