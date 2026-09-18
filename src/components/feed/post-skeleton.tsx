import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

/**
 * Esqueleto de una tarjeta mientras carga la primera página.
 *
 * Sin animación a propósito: un parpadeo constante en pantalla completa marea
 * más de lo que informa. Lo que hace falta es que el hueco tenga el tamaño y la
 * forma de lo que va a llegar, para que nada salte al aparecer.
 */
export function PostSkeleton() {
  return (
    <View style={styles.card} accessibilityLabel="Cargando publicación">
      <View style={styles.headerRow}>
        <View style={styles.avatar} />
        <View style={styles.headerText}>
          <View style={[styles.line, { width: '45%' }]} />
          <View style={[styles.line, { width: '30%' }]} />
        </View>
      </View>

      <View style={[styles.line, { width: '95%' }]} />
      <View style={[styles.line, { width: '70%' }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  line: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
});
