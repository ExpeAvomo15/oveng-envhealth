import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

export type CardProps = {
  children: ReactNode;
  /** Si se pasa, la card entera es pulsable (publicación, perfil, punto del mapa). */
  onPress?: () => void;
  /** Padding interior estándar. Desactivar cuando la card lleva una imagen a sangre. */
  padded?: boolean;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

/** Superficie elevada con el radio característico del producto (16px). */
export function Card({ children, onPress, padded = true, style, accessibilityLabel }: CardProps) {
  const cardStyle = [styles.card, padded && styles.padded, style];

  if (!onPress) {
    return <View style={cardStyle}>{children}</View>;
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [...cardStyle, pressed && styles.pressed]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  padded: {
    padding: spacing.lg,
  },
  pressed: {
    opacity: 0.85,
  },
});
