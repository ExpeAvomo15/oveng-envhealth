/*
 * Cada peso se importa por su subruta, no desde el índice del paquete.
 *
 * Desde el índice, Metro metía en el export **las dieciocho** variantes de
 * Inter —los nueve pesos y sus cursivas, 6,3 MB— porque el barril las
 * referencia todas y un asset no se elimina por no usarse. Con las subrutas
 * solo entran los cuatro pesos que el theme nombra: 1,37 MB. El navegador
 * nunca descargó las otras catorce, pero viajaban en el artefacto.
 */
import { useFonts } from 'expo-font';

import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { createContext, use, type ReactNode } from 'react';

import { interFontFamily, systemFontFamily, type FontWeight } from '@/theme';

/**
 * Carga de Inter.
 *
 * **No bloquea el primer pintado**: mientras la fuente llega se usa la del
 * sistema y el texto está ahí desde el principio. Dejar la pantalla en blanco
 * esperando a una fuente se nota mucho más que el cambio de forma al cargar.
 */

const FontsLoadedContext = createContext(false);

export function FontsProvider({ children }: { children: ReactNode }) {
  const [loaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return <FontsLoadedContext value={loaded}>{children}</FontsLoadedContext>;
}

/**
 * Devuelve la familia que toca para un peso: la de Inter si ya cargó, la del
 * sistema mientras tanto.
 */
export function useFontFamily(): (weight: FontWeight) => string {
  const loaded = use(FontsLoadedContext);
  return (weight) => (loaded ? interFontFamily[weight] : systemFontFamily);
}
