import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/**
 * Buscar — descubrimiento. La búsqueda real y los resultados son de F2; aquí
 * solo está el armazón, sin nada funcional.
 */
const CATEGORIES = ['Empresas', 'Iniciativas', 'Personas', 'Lugares'] as const;

export default function SearchScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="display">Buscar</Text>

        {/* No funcional a propósito: es una vista, no un campo. */}
        <View style={styles.searchBar} accessible accessibilityLabel="Buscar (no disponible aún)">
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <Text variant="body" color="textMuted">
            Busca personas, lugares o etiquetas
          </Text>
        </View>

        <View style={styles.chips}>
          {CATEGORIES.map((category) => (
            <View key={category} style={styles.chip}>
              <Text variant="label" color="textSecondary">
                {category}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.notice}>
          <Text variant="caption" color="textSecondary">
            Disponible en F2
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notice: {
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
});
