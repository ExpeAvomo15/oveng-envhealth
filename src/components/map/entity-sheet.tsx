import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { EntityAvatar, RatingBadge } from '@/components/search';
import { Badge, Text } from '@/components/ui';
import { entityTypeLabels, type EntityResult } from '@/lib/entities';
import { colors, environmentalCategories, radius, shadows, spacing } from '@/theme';

export type EntitySheetProps = {
  entity: EntityResult;
  onClose: () => void;
  onOpen: () => void;
};

/**
 * Tarjeta inferior al tocar un marcador, como la del mockup 2.
 *
 * **Sin distancia.** El mockup pone "12.5 km", que exige saber dónde está quien
 * mira: geolocalización, su permiso y su gestión cuando lo deniega. Es una
 * funcionalidad propia y está anotada para después de la demo; inventar una
 * distancia desde el centro del encuadre sería enseñar un número falso.
 */
export function EntitySheet({ entity, onClose, onOpen }: EntitySheetProps) {
  const category = environmentalCategories[entity.category];
  const place = entity.location_name ?? entity.country;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="link"
        accessibilityLabel={`Abrir la ficha de ${entity.name}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <EntityAvatar category={entity.category} size={56} />

        <View style={styles.texts}>
          <View style={styles.topRow}>
            <Badge label={entityTypeLabels[entity.type]} tone="accent" />
            {entity.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.accent}
                accessibilityLabel="Verificada"
              />
            ) : null}
          </View>

          <Text variant="subtitle" numberOfLines={1}>
            {entity.name}
          </Text>

          <Text variant="caption" color="textSecondary" numberOfLines={2}>
            {entity.description ?? `${category.label}${place ? ` · ${place}` : ''}`}
          </Text>

          <RatingBadge average={entity.ratingAverage} count={entity.ratingsCount} />
        </View>
      </Pressable>

      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar la tarjeta"
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <Ionicons name="close" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  close: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
