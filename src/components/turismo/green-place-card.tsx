import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { EntityAvatar, RatingBadge } from '@/components/search';
import { Text } from '@/components/ui';
import type { EntityResult } from '@/lib/entities';
import { directionsUrl, formatDistance } from '@/lib/geo';
import { colors, radius, spacing } from '@/theme';

export type GreenPlaceCardProps = {
  place: EntityResult;
  /** Distancia al punto buscado, en km. Sin punto, no se enseña. */
  distanceKm?: number | null;
  onOpen: () => void;
};

/**
 * Tarjeta de un rincón verde (F4.5): la capa OVENG —categoría, qué disfrutar,
 * valoración de la comunidad— y "Cómo llegar", que abre Google Maps en las
 * coordenadas exactas del lugar.
 *
 * **Dos pulsables hermanos, no uno dentro de otro**: el cuerpo lleva al perfil
 * del lugar y el botón a Google Maps. Anidados, en web el toque burbujearía y
 * abriría las dos cosas.
 */
export function GreenPlaceCard({ place, distanceKm = null, onOpen }: GreenPlaceCardProps) {
  const canDirect = place.lat !== null && place.lng !== null;

  return (
    <View style={styles.card}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="link"
        accessibilityLabel={`${place.name}${distanceKm !== null ? `, ${formatDistance(distanceKm)}` : ''}. Ver el lugar`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <EntityAvatar category={place.category} size={48} />
        <View style={styles.texts}>
          <Text variant="subtitle" numberOfLines={2}>
            {place.name}
          </Text>
          {/*
            La descripción entera, recortada a tres líneas: en los lugares de
            F2.1 la primera frase es el dato y el "qué disfrutar" va detrás.
          */}
          <Text variant="caption" color="textSecondary" numberOfLines={3}>
            {place.description ?? ''}
          </Text>
          <View style={styles.meta}>
            {distanceKm !== null ? (
              <View style={styles.distance}>
                <Ionicons name="navigate-outline" size={13} color={colors.accent} />
                <Text variant="label" color="accent">
                  {formatDistance(distanceKm)}
                </Text>
              </View>
            ) : null}
            <RatingBadge average={place.ratingAverage} count={place.ratingsCount} />
          </View>
        </View>
      </Pressable>

      {canDirect ? (
        <Pressable
          onPress={() => void Linking.openURL(directionsUrl({ lat: place.lat!, lng: place.lng! }))}
          accessibilityRole="link"
          accessibilityLabel={`Cómo llegar a ${place.name}. Abre Google Maps, fuera de OVENG`}
          style={({ pressed }) => [styles.directions, pressed && styles.pressed]}>
          <Ionicons name="location" size={16} color={colors.textInverse} />
          <Text variant="label" color="textInverse">
            Cómo llegar
          </Text>
          {/* El aviso sutil de que se sale de OVENG. */}
          <Ionicons name="open-outline" size={13} color={colors.textInverse} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  main: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  distance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  directions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
});
