import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/tab-bar';
import { colors } from '@/theme';

/**
 * Lo que queda aquí son **las pestañas que exigen cuenta**: hoy, el perfil
 * propio.
 *
 * Inicio, Buscar y Mapa viven fuera del grupo, como rutas públicas de primer
 * nivel: la guarda de `(tabs)` es de todo el grupo, así que una pestaña pública
 * no puede estar dentro. Pintan la barra ellas mismas, que es un componente
 * propio y navega por ruta. Ver src/app/_layout.tsx.
 */
export const unstable_settings = {
  anchor: 'perfil',
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <TabBar />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      {/* Inicio, Buscar y Mapa no están aquí: son rutas públicas. Ver el layout raíz. */}
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />

      {/* Referencia visual del design system: accesible por URL, fuera de la barra. */}
      <Tabs.Screen name="design-system" options={{ href: null, title: 'Design system' }} />
    </Tabs>
  );
}
