import { Stack } from 'expo-router';

import { colors } from '@/theme';

/**
 * Sin sesión, la puerta de entrada es `welcome`: es la ruta a la que llega
 * quien abre la app o cierra sesión.
 */
export const unstable_settings = {
  anchor: 'welcome',
};

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
      }}
    />
  );
}
