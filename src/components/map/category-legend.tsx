import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

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
  /** Elegir una capa; `null` vuelve a todas. */
  onChoose: (category: EnvironmentalCategoryName | null) => void;
};

/**
 * Las capas del mapa, como **chips deslizables** bajo el buscador (F5.0).
 *
 * Antes era una leyenda vertical fija que ocupaba un cuarto del alto de un
 * móvil. Ahora es el patrón de Google Maps y Airbnb: una fila que se desliza,
 * y los chips **son** la leyenda —cada uno lleva el punto de color de su capa—,
 * así que no hay que mirar dos sitios para lo mismo.
 *
 * Sigue eligiendo **una** capa (F4.3): tocar "Suelo" deja sus marcadores y
 * cambia la tarjeta a su dato; "Todo", o volver a tocar la elegida, devuelve
 * todas. El estado no se confía solo al color: el chip elegido se rellena de
 * verde y se anuncia como opción marcada.
 */
export function CategoryLegend({ chosen, onChoose }: CategoryLegendProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="radiogroup"
      accessibilityLabel="Capas del mapa">
      <Chip label="Todo" accessibilityLabel="Todas las capas" on={chosen === null} onPress={() => onChoose(null)} />
      {environmentalCategoryOrder.map((key) => {
        const category = environmentalCategories[key];
        return (
          <Chip
            key={key}
            label={category.label}
            accessibilityLabel={`Capa ${category.label}`}
            dot={category.color}
            on={chosen === key}
            onPress={() => onChoose(chosen === key ? null : key)}
          />
        );
      })}
    </ScrollView>
  );
}

function Chip({
  label,
  accessibilityLabel,
  dot,
  on,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  dot?: string;
  on: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }, on && styles.dotOn]} /> : null}
      <Text variant="captionStrong" color={on ? 'textInverse' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingVertical: 2,
    paddingRight: spacing.md,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  chipOn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  dotOn: {
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
});
