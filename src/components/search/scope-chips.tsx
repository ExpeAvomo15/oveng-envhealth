import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { searchScopes, type SearchScope } from '@/lib/search';
import { colors, radius, spacing } from '@/theme';

export type ScopeChipsProps = {
  value: SearchScope;
  onChange: (scope: SearchScope) => void;
};

/**
 * Chips de alcance, al estilo del mockup 2: el activo en verde sólido.
 *
 * Van en un scroll horizontal porque son cinco y en un móvil estrecho no caben
 * en una línea; envolverlos en dos filas descuadra la cabecera al cambiar de
 * chip.
 *
 * Se anuncian como `tablist`/`tab` —igual que el selector del feed— y no por su
 * texto: "Personas" y "Lugares" también aparecen como títulos de sección en los
 * resultados, y buscar por texto acertaría en el sitio equivocado.
 */
export function ScopeChips({ value, onChange }: ScopeChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      accessibilityRole="tablist">
      {searchScopes.map((scope) => {
        const selected = scope.key === value;

        return (
          <Pressable
            key={scope.key}
            onPress={() => onChange(scope.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.chip, selected && styles.chipSelected]}>
            <Text variant="label" color={selected ? 'textInverse' : 'textSecondary'}>
              {scope.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
