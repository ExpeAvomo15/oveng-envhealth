import type { ColorToken } from '@/theme';

import { AIR_LEVELS } from './air-quality';
import type { EntityMetricName } from './database.types';
import { SOIL_LEVELS } from './live-soil';

/**
 * Explicaciones en lenguaje llano (F4.3).
 *
 * **Regla de producto (AGENTS.md):** toda cifra o término técnico visible lleva
 * palabra llana primero y una explicación que se abre tocándola. Esto es el
 * contenido de esas explicaciones; `InfoButton` las abre. Escritas para que
 * las entienda alguien de 12 años: frases cortas, sin siglas sin explicar, y
 * siempre qué significa **para ti**.
 */

export type ExplainerTopic =
  | 'aqi'
  | 'aqi-reference'
  | 'pm'
  | 'satellite'
  | 'reference'
  | 'soil'
  | 'nature'
  | 'water'
  | 'entities-count'
  | 'ph'
  | 'index10'
  | 'forest'
  | 'temperature'
  | 'general';

export type Explainer = {
  title: string;
  /** Qué es, en una o dos frases. */
  what: string;
  /** Escala con colores y palabras, si la tiene. */
  scale?: { label: string; range: string; color: ColorToken }[];
  /** Qué significa para quien lo lee. */
  forYou?: string[];
  /** De dónde sale el dato, en una frase simple. */
  source?: string;
};

/**
 * "0 a 20", "21 a 40"… y "más de 100". Sin bordes repetidos: la app cuenta el
 * 20 como Excelente, y "0 a 20 / 20 a 40" haría preguntar en cuál cae.
 */
const range = (from: number, to: number) => (to === Infinity ? `más de ${from}` : `${from} a ${to}`);

export const explainers: Record<ExplainerTopic, Explainer> = {
  aqi: {
    title: '¿Qué es el índice de calidad del aire?',
    what:
      'Es un número, del 0 a más de 100, que resume cuán limpio está el aire. Cuanto más bajo, mejor. Junta en una sola cifra el polvo fino y los gases que respiras.',
    scale: AIR_LEVELS.map((band, index) => ({
      label: band.label,
      range:
        band.max === Infinity
          ? range(AIR_LEVELS[index - 1]!.max, band.max)
          : range(index === 0 ? 0 : AIR_LEVELS[index - 1]!.max + 1, band.max),
      color: band.color,
    })),
    forYou: [
      'Excelente o Buena: puedes hacer deporte al aire libre sin problema.',
      'Moderada: bien para casi todo el mundo. Si tienes asma o problemas de corazón, tómatelo con calma.',
      'Mala o peor: mejor no hacer ejercicio fuerte fuera, sobre todo niños, personas mayores y quien tenga asma.',
    ],
    source:
      'Usamos la escala europea, la de la Agencia Europea de Medio Ambiente. El número lo calcula Copernicus, el programa de la Unión Europea que vigila la Tierra desde satélites.',
  },
  'aqi-reference': {
    title: 'El índice de aire de la ficha',
    what:
      'Es un índice de calidad del aire que la ficha del lugar tiene guardado. Usa una escala distinta de la europea, así que no lo compares número a número con el de arriba: fíjate en la palabra.',
    source: 'Dato de referencia guardado en la ficha. No se actualiza solo.',
  },
  pm: {
    title: '¿Qué es el polvo fino?',
    what:
      'Son partículas de polvo, humo y hollín tan pequeñas que entran hasta el fondo de los pulmones. PM10 son las pequeñas y PM2.5 las todavía más pequeñas. Se cuentan en microgramos por metro cúbico de aire (µg/m³): cuánto pesa el polvo que hay en un cubo de aire de un metro de lado.',
    forYou: [
      'Menos es mejor. Por debajo de 5 de PM2.5 es aire muy limpio.',
      'Sube con el tráfico, las hogueras, los incendios y el polvo del desierto.',
    ],
    source: 'Lo estima el modelo CAMS del programa Copernicus de la Unión Europea.',
  },
  satellite: {
    title: '¿Qué es una estimación satelital?',
    what:
      'Nadie está midiendo con un aparato en ese punto exacto. Un ordenador junta lo que ven los satélites con el tiempo que hace y calcula cómo está el aire en cada trozo del mapa, de unos 10 a 40 km.',
    forYou: [
      'Sirve para saber cómo está tu zona en general, ahora mismo.',
      'Puede no notar algo muy cercano, como el humo de una hoguera en tu calle.',
    ],
    source: 'Modelo CAMS del programa Copernicus de la Unión Europea, servido por Open-Meteo.',
  },
  reference: {
    title: '¿Qué es un dato de referencia?',
    what:
      'Es un dato que OVENG guarda en la ficha de un lugar. No cambia solo: es una referencia de cómo es ese sitio, no una medición de ahora mismo.',
    forYou: ['Úsalo para hacerte una idea del lugar, no para saber cómo está hoy.'],
  },
  soil: {
    title: '¿Qué es la humedad del suelo?',
    what:
      'Cuánta agua hay en la capa de arriba de la tierra, el primer centímetro. Se da en %: de cada 100 partes de tierra, cuántas son agua.',
    scale: SOIL_LEVELS.map((level, index) => ({
      label: level.label,
      // Sin bordes repetidos: un 15 % ya es Normal y un 30 % ya es Húmedo.
      range:
        level.max === Infinity
          ? `${SOIL_LEVELS[index - 1]!.max} % o más`
          : index === 0
            ? `menos del ${level.max} %`
            : `${SOIL_LEVELS[index - 1]!.max} a ${level.max - 1} %`,
      color: level.color,
    })),
    forYou: [
      'Seco: las plantas necesitan agua y el fuego prende con más facilidad.',
      'Húmedo: ha llovido hace poco o la tierra guarda bien el agua.',
      'Los cortes son orientativos: una tierra arenosa y una de barro guardan el agua distinto.',
    ],
    source: 'Lo calcula el modelo del tiempo de Open-Meteo. Es una estimación, no una medición en ese punto.',
  },
  nature: {
    title: '¿Qué es la naturaleza registrada?',
    what:
      'Cuántas veces alguien ha visto y apuntado un ser vivo —una planta, un animal, un hongo— a menos de 10 km de este punto, y de cuántas especies distintas.',
    forYou: [
      'Muchas observaciones no siempre quiere decir más naturaleza: también quiere decir que ahí mira más gente.',
      'Pocas puede ser un sitio poco estudiado, no un sitio vacío.',
    ],
    source:
      'GBIF, una red mundial y pública donde museos, científicos y gente aficionada comparten lo que observan.',
  },
  water: {
    title: '¿Por qué no hay datos de agua en vivo?',
    what:
      'Nadie mide la calidad del agua de todos los ríos y lagos del mundo a la vez y lo publica abierto. Para saberla hay que coger muestras de agua y analizarlas, sitio por sitio.',
    forYou: [
      'OVENG solo enseña datos que tienen una fuente que cualquiera puede comprobar.',
      'Cuando un lugar tiene una medición en su ficha, la verás aquí como dato de referencia.',
    ],
  },
  'entities-count': {
    title: '¿Qué estoy viendo?',
    what:
      'De esta capa no hay un dato del entorno en vivo. Lo que sí hay son empresas, iniciativas y lugares de OVENG que trabajan en ello: los contamos en lo que ves del mapa.',
  },
  ph: {
    title: '¿Qué es el pH?',
    what:
      'Dice si el agua es ácida o lo contrario, con un número del 0 al 14. El 7 es neutro. El agua de un río sano suele estar entre 6,5 y 8,5.',
    source: 'Dato de referencia guardado en la ficha del lugar.',
  },
  index10: {
    title: '¿Qué es esta nota sobre 10?',
    what: 'Una nota del 0 al 10 que resume cómo está esa parte del entorno en la ficha del lugar. Más alto es mejor.',
    source: 'Dato de referencia guardado en la ficha del lugar.',
  },
  forest: {
    title: '¿Qué es la cobertura forestal?',
    what: 'Qué parte del terreno está cubierta de árboles, en %. Un 78 % quiere decir que casi 8 de cada 10 trozos tienen bosque.',
    source: 'Dato de referencia guardado en la ficha del lugar.',
  },
  temperature: {
    title: '¿Qué es la temperatura media?',
    what: 'La temperatura habitual del lugar, en grados. No es la de ahora mismo.',
    source: 'Dato de referencia guardado en la ficha del lugar.',
  },
  general: {
    title: '¿Qué es la calidad ambiental general?',
    what: 'Una nota del 0 al 10 que resume a la vez el aire, el agua, el suelo y la naturaleza del lugar. Más alto es mejor.',
    source: 'Dato de referencia guardado en la ficha del lugar.',
  },
};

/** Qué explicación lleva cada métrica curada de una entidad. */
export function explainerForMetric(metric: EntityMetricName): ExplainerTopic {
  switch (metric) {
    case 'aire':
      return 'aqi-reference';
    case 'agua':
      return 'ph';
    case 'cobertura_forestal':
      return 'forest';
    case 'temperatura_media':
      return 'temperature';
    case 'calidad_general':
      return 'general';
    default:
      return 'index10';
  }
}
