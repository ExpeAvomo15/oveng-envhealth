import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { showToast } from '@/components/ui/toast';
import { useFontFamily } from '@/hooks/use-fonts';
import { colors, noWebFocusRing, radius, spacing, typography } from '@/theme';

export type SearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  autoFocus?: boolean;
};

/**
 * Barra de búsqueda: gris, redondeada y con el icono de filtros a la derecha,
 * como en los dos mockups.
 *
 * El botón de filtros **avisa en vez de no hacer nada**. El panel de filtros
 * avanzados es post-demo, y un control que se ve pulsable y no responde se lee
 * como una avería; es el mismo criterio que ya seguían los comentarios y las
 * etiquetas del feed.
 */
export function SearchBar({ value, onChange, autoFocus = false }: SearchBarProps) {
  const fontFamily = useFontFamily();

  return (
    <View style={styles.field}>
      <Ionicons name="search-outline" size={20} color={colors.textMuted} />

      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Buscar empresas, iniciativas, temas…"
        placeholderTextColor={colors.textMuted}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        accessibilityLabel="Buscar"
        style={[styles.input, noWebFocusRing, { fontFamily: fontFamily('400') }]}
      />

      {value.length > 0 ? (
        <Pressable
          onPress={() => onChange('')}
          accessibilityRole="button"
          accessibilityLabel="Borrar la búsqueda"
          style={({ pressed }) => [styles.clear, pressed && styles.pressed]}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => showToast('Los filtros avanzados llegan después de la demo.')}
        accessibilityRole="button"
        accessibilityLabel="Filtros"
        style={({ pressed }) => [styles.filters, pressed && styles.pressed]}>
        <Ionicons name="options-outline" size={20} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    // En web el input hereda una altura mínima que descuadra la píldora.
    paddingVertical: 0,
  },
  clear: {
    padding: spacing.xs,
  },
  filters: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
