import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import {
  colors,
  environmentalCategories,
  environmentalCategoryOrder,
  radius,
  spacing,
} from '@/theme';

/** Mapa ambiental — la sección que distingue a OVENG. Se construye en F2. */
export default function MapScreen() {
  return (
    <Screen scroll={false}>
      <View style={styles.container}>
        <View style={styles.canvas}>
          <View style={styles.pin}>
            <Ionicons name="location" size={36} color={colors.accent} />
          </View>

          <Text variant="title" style={styles.centered}>
            Mapa ambiental
          </Text>
          <Text variant="body" color="textSecondary" style={styles.centered}>
            Disponible en F2
          </Text>

          {/* Leyenda de las capas previstas: el color ya está decidido (F0.3). */}
          <View style={styles.legend}>
            {environmentalCategoryOrder.map((key) => {
              const category = environmentalCategories[key];
              return (
                <View key={key} style={[styles.legendChip, { backgroundColor: category.color }]}>
                  <Text variant="micro" color={category.onColor}>
                    {category.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingVertical: spacing.xl,
  },
  canvas: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.accentTint,
  },
  pin: {
    marginBottom: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xl,
  },
  legendChip: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
