import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { EntityResult } from '@/lib/entities';
import { colors, environmentalCategories, radius, shadows, spacing } from '@/theme';

export type FeaturedCardProps = {
  entity: EntityResult;
  onPress: () => void;
};

/**
 * El hero "DESTACADO" del mockup 2, en versión ligera.
 *
 * Ligera porque el mockup la pinta con una foto grande y `cover_image_url` va
 * nulo en todo el seed: se usa el degradado de la categoría con su icono, igual
 * que la portada de la ficha, para que las dos se reconozcan como la misma
 * familia.
 *
 * Es una **iniciativa** de la zona activa, elegida por la misma categoría que la
 * medición de arriba (ver `loadZoneData`). Aparece una vez y en un sitio fijo:
 * sin rotaciones ni sorpresas al recargar.
 */
export function FeaturedCard({ entity, onPress }: FeaturedCardProps) {
  const style = environmentalCategories[entity.category];
  const place = entity.location_name ?? entity.country;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Destacado: ${entity.name}${place ? `, en ${place}` : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <LinearGradient
        colors={[style.color, 'rgba(0,0,0,0.5)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      />

      <Ionicons name={style.icon} size={84} color="rgba(255,255,255,0.22)" style={styles.mark} />

      <View style={styles.badge}>
        <Text variant="micro" color="text">
          DESTACADO
        </Text>
      </View>

      <View style={styles.texts}>
        <Text variant="subtitle" color="textInverse" numberOfLines={2}>
          {entity.name}
        </Text>

        {entity.description ? (
          <Text variant="caption" color="textInverse" numberOfLines={2} style={styles.dim}>
            {entity.description}
          </Text>
        ) : null}

        {place ? (
          <View style={styles.placeRow}>
            <Ionicons name="location-outline" size={14} color={colors.textInverse} />
            <Text variant="micro" color="textInverse" numberOfLines={1} style={styles.dim}>
              {place}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 168,
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.card,
  },
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mark: {
    position: 'absolute',
    right: spacing.sm,
    top: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  texts: {
    gap: spacing.xs,
  },
  dim: {
    opacity: 0.85,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pressed: {
    opacity: 0.85,
  },
});
