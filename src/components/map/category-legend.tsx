import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { EnvironmentalCategoryName } from '@/lib/database.types';
import {
  colors,
  environmentalCategories,
  environmentalCategoryOrder,
  radius,
  shadows,
  spacing,
} from '@/theme';

export type CategoryLegendProps = {
  /** Categorías visibles. Vacío no existe: se trata como "todas". */
  active: Set<EnvironmentalCategoryName>;
  onToggle: (category: EnvironmentalCategoryName) => void;
};

/**
 * Leyenda flotante que además filtra, como la lista vertical del mockup 2.
 *
 * Es leyenda y control a la vez a propósito: una leyenda que solo explica
 * colores obliga a mirar dos sitios para lo mismo. Aquí el color se explica y
 * se apaga desde la misma fila.
 *
 * Una categoría apagada baja la opacidad **y tacha el color**: el estado no se
 * puede confiar solo al color, que es justo lo que el theme advierte de estas
 * seis (varias parejas se distinguen por tono pero no por luminancia).
 */
export function CategoryLegend({ active, onToggle }: CategoryLegendProps) {
  return (
    <View style={styles.panel} accessibilityLabel="Capas del mapa">
      {environmentalCategoryOrder.map((key) => {
        const category = environmentalCategories[key];
        const on = active.has(key);

        return (
          <Pressable
            key={key}
            onPress={() => onToggle(key)}
            // Es un interruptor y se anuncia como tal. No lleva además
            // `role="listitem"`: en React Native Web `role` gana a
            // `accessibilityRole`, y la fila dejaba de ser un interruptor.
            accessibilityRole="switch"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`Capa ${category.label}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <View
              style={[
                styles.dot,
                { backgroundColor: on ? category.color : colors.surfaceMuted },
                !on && styles.dotOff,
              ]}
            />
            <Text variant="micro" color={on ? 'text' : 'textMuted'}>
              {category.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 3,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  dotOff: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.6,
  },
});
