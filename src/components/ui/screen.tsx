import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, maxContentWidth, screenPadding, spacing } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Envuelve el contenido en un ScrollView. Desactivar con listas propias (FlatList). */
  scroll?: boolean;
  /** Margen lateral estándar. Desactivar cuando el contenido va a sangre. */
  padded?: boolean;
  /** `app` es el gris de fondo; `surface` es blanco (pantallas de auth y formularios). */
  background?: 'app' | 'surface';
  /** Aparta el contenido del teclado. Para pantallas con formulario. */
  avoidKeyboard?: boolean;
  /** Centra el contenido verticalmente. Para pantallas de una sola pieza. */
  center?: boolean;
};

/**
 * Contenedor de pantalla: fondo, safe area y ancho máximo de contenido.
 * En web el contenido se centra y no se estira más allá de `maxContentWidth`.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  background = 'app',
  avoidKeyboard = false,
  center = false,
}: ScreenProps) {
  const content = (
    <View style={[styles.content, padded && styles.padded, center && styles.centered]}>
      {children}
    </View>
  );

  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, center && styles.scrollCentered]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {content}
    </ScrollView>
  ) : (
    content
  );

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: background === 'surface' ? colors.surface : colors.background },
      ]}
      edges={['top', 'left', 'right']}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.select({ ios: 'padding', default: undefined })}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  scrollCentered: {
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  centered: {
    justifyContent: 'center',
  },
  padded: {
    paddingHorizontal: screenPadding,
  },
});
