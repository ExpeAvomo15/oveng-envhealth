import { Tabs } from 'expo-router';

import { TabBar } from '@/components/navigation/tab-bar';
import { colors } from '@/theme';

/** Inicio es la sección por defecto al entrar con sesión. */
export const unstable_settings = {
  anchor: 'index',
};

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => <TabBar />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="buscar" options={{ title: 'Buscar' }} />
      {/* Mapa no está aquí: es una ruta pública de primer nivel y pinta la
          barra ella misma. Ver src/app/_layout.tsx. */}
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />

      {/* Referencia visual del design system: accesible por URL, fuera de la barra. */}
      <Tabs.Screen name="design-system" options={{ href: null, title: 'Design system' }} />
    </Tabs>
  );
}
