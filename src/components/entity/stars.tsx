import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export type StarsProps = {
  /** Estrellas encendidas, de 0 a 5. */
  value: number;
  size?: number;
  /** Si se pasa, las estrellas se pueden pulsar para elegir nota. */
  onChange?: (value: number) => void;
};

const SCORES = [1, 2, 3, 4, 5] as const;

/**
 * Cinco estrellas, para leer una nota o para ponerla.
 *
 * Cuando es para ponerla, cada estrella es un botón con su propio nombre
 * accesible ("Valorar con 4 estrellas"): un grupo de cinco iconos sin nombre no
 * se puede usar sin ver la pantalla, y tampoco se puede comprobar.
 */
export function Stars({ value, size = 16, onChange }: StarsProps) {
  const rounded = Math.round(value);

  return (
    <View
      style={styles.row}
      accessibilityRole={onChange ? 'radiogroup' : undefined}
      accessibilityLabel={onChange ? undefined : `${value} de 5 estrellas`}>
      {SCORES.map((score) => {
        const filled = score <= rounded;
        const icon = (
          <Ionicons
            name={filled ? 'star' : 'star-outline'}
            size={size}
            color={filled ? colors.warning : colors.textMuted}
          />
        );

        if (!onChange) return <View key={score}>{icon}</View>;

        return (
          <Pressable
            key={score}
            onPress={() => onChange(score)}
            accessibilityRole="radio"
            accessibilityState={{ selected: score === rounded }}
            accessibilityLabel={`Valorar con ${score} ${score === 1 ? 'estrella' : 'estrellas'}`}
            style={({ pressed }) => [styles.tap, pressed && styles.pressed]}>
            {icon}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tap: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
