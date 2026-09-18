import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, maxContentWidth, screenPadding, spacing } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /** Envuelve el contenido en un ScrollView. Desactivar con listas propias (FlatList). */
  scroll?: boolean;
  /** Margen lateral estándar. Desactivar cuando el contenido va a sangre. */
  padded?: boolean;
};

/**
 * Contenedor de pantalla: fondo, safe area y ancho máximo de contenido.
 * En web el contenido se centra y no se estira más allá de `maxContentWidth`.
 */
export function Screen({ children, scroll = true, padded = true }: ScreenProps) {
  const content = (
    <View style={[styles.content, padded && styles.padded]}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: maxContentWidth,
    alignSelf: 'center',
  },
  padded: {
    paddingHorizontal: screenPadding,
  },
});
