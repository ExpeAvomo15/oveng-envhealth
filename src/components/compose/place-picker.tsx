import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Text } from '@/components/ui';
import { useFontFamily } from '@/hooks/use-fonts';
import { searchEntities, type EntityResult } from '@/lib/entities';
import { colors, noWebFocusRing, radius, spacing, typography } from '@/theme';

export type PlacePickerProps = {
  value: EntityResult | null;
  onChange: (place: EntityResult | null) => void;
  disabled?: boolean;
};

/** Espera tras la última tecla antes de buscar. */
const DEBOUNCE_MS = 300;

/**
 * "Etiquetar un lugar" en el compositor (F4.4). Opcional: una publicación casi
 * nunca lo lleva, así que aquí solo hay un botón hasta que se pulsa.
 *
 * Busca solo **lugares de Turismo Verde**, que son los que tienen perfil
 * donde enseñar lo que la gente publica de ellos. Que la entidad sea un lugar
 * lo garantiza esta búsqueda: la base no puede comprobarlo con un `check`.
 */
export function PlacePicker({ value, onChange, disabled = false }: PlacePickerProps) {
  const fontFamily = useFontFamily();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState('');
  const [settled, setSettled] = useState('');
  const [loaded, setLoaded] = useState<{ term: string; places: EntityResult[] } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setSettled(term), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    searchEntities(settled, { type: 'lugar', limit: 8 })
      .then((places) => {
        if (active) setLoaded({ term: settled, places });
      })
      .catch(() => {
        if (active) setLoaded({ term: settled, places: [] });
      });
    return () => {
      active = false;
    };
  }, [open, settled]);

  if (value) {
    return (
      <View style={styles.selected}>
        <Ionicons name="location" size={16} color={colors.accent} />
        <Text variant="label" color="accent" style={styles.flex} numberOfLines={1}>
          {value.name}
        </Text>
        <Pressable
          onPress={() => onChange(null)}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={`Quitar el lugar ${value.name}`}
          hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Etiquetar un lugar"
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}>
        <Ionicons name="location-outline" size={20} color={colors.accent} />
        <Text variant="label" color="accent">
          Etiquetar un lugar
        </Text>
      </Pressable>
    );
  }

  const results = loaded?.term === settled ? loaded.places : null;

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Busca un lugar de Turismo Verde"
          placeholderTextColor={colors.textMuted}
          autoFocus
          accessibilityLabel="Buscar un lugar para etiquetar"
          style={[styles.input, noWebFocusRing, { fontFamily: fontFamily('400') }]}
        />
        <Pressable
          onPress={() => {
            setOpen(false);
            setTerm('');
          }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sin etiquetar"
          hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {results === null ? (
        <ActivityIndicator size="small" color={colors.accent} style={styles.loading} />
      ) : results.length === 0 ? (
        <Text variant="caption" color="textSecondary" style={styles.hint}>
          Ningún lugar de Turismo Verde se llama así.
        </Text>
      ) : (
        results.map((place) => (
          <Pressable
            key={place.id}
            onPress={() => {
              onChange(place);
              setOpen(false);
              setTerm('');
            }}
            accessibilityRole="button"
            accessibilityLabel={`Etiquetar en ${place.name}`}
            style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
            <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
            <View style={styles.flex}>
              <Text variant="bodyStrong" numberOfLines={1}>
                {place.name}
              </Text>
              {place.location_name ? (
                <Text variant="micro" color="textMuted" numberOfLines={1}>
                  {place.location_name}
                </Text>
              ) : null}
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
  },
  panel: {
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    color: colors.text,
    fontSize: typography.body.fontSize,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  loading: {
    padding: spacing.sm,
  },
  hint: {
    padding: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
