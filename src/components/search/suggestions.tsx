import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { EnvironmentalCategoryName } from '@/lib/database.types';
import { colors, environmentalCategories, radius, spacing } from '@/theme';

export type Suggestion = {
  title: string;
  subtitle: string;
  category: EnvironmentalCategoryName;
};

/**
 * Las cuatro tarjetas temáticas de la pantalla 2 del mockup 2.
 *
 * Cada una **ejecuta la búsqueda de su categoría**, no una búsqueda de texto:
 * la categoría es una columna de `entities`, así que filtrar por ella devuelve
 * el conjunto exacto y no depende de que la palabra aparezca en la descripción.
 *
 * El mapeo de título a categoría es el único sitio donde el vocabulario del
 * mockup y el enumerado de la base se tienen que entender: "Agricultura
 * sostenible" es la categoría `suelo`, que es lo que mide el terreno.
 */
export const suggestions: Suggestion[] = [
  { title: 'Energía renovable', subtitle: 'Empresas e iniciativas', category: 'energia' },
  { title: 'Gestión de residuos', subtitle: 'Empresas e iniciativas', category: 'residuos' },
  { title: 'Calidad del aire', subtitle: 'Datos y monitoreo', category: 'aire' },
  { title: 'Agricultura sostenible', subtitle: 'Empresas e iniciativas', category: 'suelo' },
];

/** Temas en tendencia, los chips de la pantalla 2 del mockup 1. */
export const trendingTopics = [
  'Energía renovable',
  'Reforestación',
  'Reciclaje',
  'Biodiversidad',
  'Cambio climático',
  'Economía circular',
];

export function SuggestionCard({
  suggestion,
  onPress,
}: {
  suggestion: Suggestion;
  onPress: () => void;
}) {
  const category = environmentalCategories[suggestion.category];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${suggestion.title}. ${suggestion.subtitle}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: category.color }]}>
        <Ionicons name={category.icon} size={20} color={colors[category.onColor]} />
      </View>

      <View style={styles.texts}>
        <Text variant="body" numberOfLines={1}>
          {suggestion.title}
        </Text>
        <Text variant="caption" color="textSecondary" numberOfLines={1}>
          {suggestion.subtitle}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

export function TrendChip({ topic, onPress }: { topic: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Buscar ${topic}`}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
      <Text variant="label" color="textSecondary">
        {topic}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
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
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
