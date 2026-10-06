import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Logo } from '@/components/brand/logo';
import { ToastHost } from '@/components/ui/toast';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { FontsProvider } from '@/hooks/use-fonts';
import { colors } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <FontsProvider>
        <AuthProvider>
          <RootNavigator />
          {/* Un único host para todos los avisos breves de la app. */}
          <ToastHost />
        </AuthProvider>
      </FontsProvider>
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
        {/* Publicar o editar una oferta: escribir pide cuenta (F4.4). */}
        <Stack.Screen name="oferta" />
      </Stack.Protected>

      {/*
        Públicas: se ven sin cuenta. Es el principio de utilidad individual de
        @docs/07_CRECIMIENTO.md — si para ver la calidad del aire hay que
        registrarse, el producto deja de servir a quien llega solo, que es la
        única pieza que funciona con la red vacía.

        El mapa vive **fuera** del grupo `(tabs)` porque la guarda de `(tabs)`
        es de todo el grupo: sacar solo una pestaña obligaba a proteger las
        otras una a una. Como la barra de pestañas es un componente propio que
        navega por ruta, el mapa la pinta él mismo y se ve igual.

        **Van al final, y el orden importa.** expo-router toma como ruta inicial
        la primera disponible cuando la URL no casa con ninguna. Declaradas
        arriba, el mapa se convertía en la puerta de entrada y al cerrar sesión
        se caía en él en vez de en la bienvenida. Al final, pedir una ruta
        privada sin sesión sigue llevando a `(auth)`, que es lo que se quiere.
        Medido en notas-archivo-f0-f2.md (2026-09-27).

        `index` es el feed, y es pública desde F2.6: quien llega sin cuenta ve
        el contenido antes de que se le pida nada. Publicar, seguir, valorar y
        el filtro "Siguiendo" siguen pidiéndola, y lo dicen.

        **Toda vista de lectura nace pública; solo las acciones piden cuenta**
        (AGENTS.md). Buscar, el perfil de otra cuenta y el detalle de una
        publicación se abrieron después del cierre de la demo: son lo que se
        comparte por enlace, y un muro de registro ahí rompe la cadena. Lo
        privado es lo propio —tu perfil, editarlo, publicar— y RLS sigue siendo
        la garantía real de que nadie escribe en nombre de otro.
      */}
      <Stack.Screen name="index" />
      <Stack.Screen name="buscar" />
      <Stack.Screen name="mapa" />
      <Stack.Screen name="entidad/[slug]" />
      <Stack.Screen name="user/[username]" />
      <Stack.Screen name="post/[id]" />
      {/*
        Adonde lleva el email de recuperación (F4.3). Pública porque se llega
        sin sesión y la sesión aparece al canjear el enlace: tiene que existir
        en los dos estados.
      */}
      <Stack.Screen name="restablecer" />
      {/* El detalle de una oferta se lee sin cuenta, como todo lo demás (F4.4). */}
      <Stack.Screen name="empleo/[id]" />
      {/* Turismo Verde por ubicación (F4.5): se lee sin cuenta. */}
      <Stack.Screen name="turismo-verde" />
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
