import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Placeholder de la zona con sesión. **F1.2 lo sustituye** por las 5 secciones
 * en tabs (Inicio, Buscar, Crear, Mapa, Perfil); de momento es un Stack con lo
 * justo para probar el ciclo de sesión completo.
 */
export const unstable_settings = {
  anchor: 'index',
};

export default function TabsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
