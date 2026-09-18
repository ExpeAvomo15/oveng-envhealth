import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand/logo';
import { ToastHost } from '@/components/ui/toast';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AuthProvider>
        <RootNavigator />
        {/* Un único host para todos los avisos breves de la app. */}
        <ToastHost />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Guard de rutas.
 *
 * `Stack.Protected` deja fuera del árbol el grupo que no corresponde, así que
 * no hay un instante en el que se vea la pantalla equivocada ni una redirección
 * visible: sin sesión solo existe `(auth)`, con sesión solo existe `(tabs)`.
 * Cuando `session` cambia, expo-router lleva a la primera ruta disponible.
 */
function RootNavigator() {
  const { session, loading } = useAuth();

  // Mientras se lee la sesión guardada no se puede decidir a dónde ir. Pintar
  // cualquiera de los dos grupos aquí provocaría un salto al resolverse.
  if (loading) {
    return <SessionSplash />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Protected guard={session === null}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>

      <Stack.Protected guard={session !== null}>
        <Stack.Screen name="(tabs)" />
        {/* Crear se abre sobre las pestañas, no dentro de ellas: es un modal. */}
        <Stack.Screen name="crear" options={{ presentation: 'modal' }} />
        <Stack.Screen name="editar-perfil" options={{ presentation: 'modal' }} />
        <Stack.Screen name="user/[username]" />
        <Stack.Screen name="post/[id]" />
      </Stack.Protected>
    </Stack>
  );
}

function SessionSplash() {
  return (
    <View style={styles.splash}>
      <Logo variant="mark" />
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    backgroundColor: colors.surface,
  },
});
