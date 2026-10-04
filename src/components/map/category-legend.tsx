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
  /** La capa elegida. `null`: todas a la vista. */
  chosen: EnvironmentalCategoryName | null;
  onChoose: (category: EnvironmentalCategoryName) => void;
};

/**
 * Leyenda flotante que además **elige una capa**, como la lista vertical del
 * mockup 2.
 *
 * Es leyenda y control a la vez a propósito: una leyenda que solo explica
 * colores obliga a mirar dos sitios para lo mismo.
 *
 * **Desde F4.3 se elige una capa; antes se apagaban.** Tocar "Suelo" enseña
 * solo sus marcadores y la tarjeta de abajo pasa a contar el suelo; volver a
 * tocarla devuelve todas. Con interruptores, tocar una capa para ver su dato la
 * escondía, y "toco una categoría y veo su dato" se contradecía.
 *
 * Una capa no elegida baja la opacidad **y vacía su punto**: el estado no se
 * puede confiar solo al color, que es justo lo que el theme advierte de estas
 * seis (varias parejas se distinguen por tono pero no por luminancia).
 */
export function CategoryLegend({ chosen, onChoose }: CategoryLegendProps) {
  return (
    <View style={styles.panel} accessibilityRole="radiogroup" accessibilityLabel="Capas del mapa">
      {environmentalCategoryOrder.map((key) => {
        const category = environmentalCategories[key];
        const on = chosen === null || chosen === key;

        return (
          <Pressable
            key={key}
            onPress={() => onChoose(key)}
            // Es una opción de un grupo y se anuncia como tal. No lleva además
            // `role="listitem"`: en React Native Web `role` gana a
            // `accessibilityRole`.
            accessibilityRole="radio"
            accessibilityState={{ checked: chosen === key }}
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
