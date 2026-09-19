import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
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
