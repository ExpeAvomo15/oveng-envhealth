import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

/**
 * Hueco de una ficha de resultado mientras la búsqueda va en camino.
 *
 * Sin animación, igual que el esqueleto del feed: lo que hace falta es que el
 * hueco tenga la forma de lo que va a llegar, para que nada salte al aparecer.
 */
export function ResultSkeleton() {
  return (
    <View style={styles.row} accessibilityLabel="Buscando">
      <View style={styles.circle} />
      <View style={styles.texts}>
        <View style={[styles.line, { width: '55%' }]} />
        <View style={[styles.line, { width: '35%' }]} />
      </View>
      <View style={styles.button} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  circle: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  texts: {
    flex: 1,
    gap: spacing.sm,
  },
  line: {
    height: 12,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  button: {
    width: 104,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
});
