import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { EntityAvatar } from '@/components/search';
import { Text } from '@/components/ui';
import type { PlaceSearch } from '@/hooks/use-place-search';
import type { EntityResult } from '@/lib/entities';
import type { Place } from '@/lib/geocoding';
import { colors, radius, shadows, spacing } from '@/theme';

export type MapSearchResultsProps = {
  /** Entidades de OVENG que casan con el texto. */
  entities: EntityResult[];
  /** Lugares del mundo de la geocodificación. */
  places: PlaceSearch;
  onPickEntity: (entity: EntityResult) => void;
  onPickPlace: (place: Place) => void;
};

/** Cuántas entidades se ofrecen como máximo: el resto sigue en el mapa. */
const MAX_ENTITIES = 5;

/**
 * Resultados del buscador del mapa (F4.2): **dos búsquedas a la vez**, en dos
 * grupos.
 *
 * - **En OVENG:** las entidades, como hasta ahora; además siguen filtrando los
 *   marcadores mientras se escribe.
 * - **Lugares del mundo:** cualquier ciudad, región o país, con su región y su
 *   país al lado para distinguir la Málaga de España de la de Colombia.
 *
 * Elegir cualquiera de las dos cosas lleva el mapa allí.
 */
export function MapSearchResults({ entities, places, onPickEntity, onPickPlace }: MapSearchResultsProps) {
  const shown = entities.slice(0, MAX_ENTITIES);

  return (
    <View style={styles.card} accessibilityRole="list" accessibilityLabel="Resultados de la búsqueda">
      {shown.length > 0 ? (
        <View style={styles.section}>
          <Text variant="label" color="textSecondary" style={styles.heading}>
            En OVENG
          </Text>
          {shown.map((entity) => (
            <Pressable
              key={entity.id}
              onPress={() => onPickEntity(entity)}
              accessibilityRole="button"
              accessibilityLabel={`Ir a ${entity.name}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <EntityAvatar category={entity.category} size={28} />
              <View style={styles.texts}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {entity.name}
                </Text>
                {entity.location_name ? (
                  <Text variant="micro" color="textMuted" numberOfLines={1}>
                    {entity.location_name}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text variant="label" color="textSecondary" style={styles.heading}>
          Lugares del mundo
        </Text>

        {places.status === 'loading' ? (
          <View style={styles.status} accessibilityLabel="Buscando lugares">
            <ActivityIndicator size="small" color={colors.accent} />
            <Text variant="caption" color="textSecondary">
              Buscando lugares…
            </Text>
          </View>
        ) : places.status === 'error' ? (
          <View style={styles.status}>
            <Text variant="caption" color="textSecondary">
              No hemos podido buscar lugares ahora. Revisa tu conexión y prueba otra vez.
            </Text>
          </View>
        ) : places.status === 'done' && places.places.length === 0 ? (
          <View style={styles.status}>
            <Text variant="caption" color="textSecondary">
              No encontramos ese lugar.
            </Text>
          </View>
        ) : places.status === 'done' ? (
          places.places.map((place) => (
            <Pressable
              key={place.id}
              onPress={() => onPickPlace(place)}
              accessibilityRole="button"
              accessibilityLabel={`Ir a ${place.name}${place.detail ? `, ${place.detail}` : ''}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <View style={styles.placeIcon}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.texts}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {place.name}
                </Text>
                {place.detail ? (
                  <Text variant="micro" color="textMuted" numberOfLines={1}>
                    {place.detail}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.status}>
            <Text variant="caption" color="textSecondary">
              Escribe al menos dos letras.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  section: {
    gap: 2,
  },
  heading: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  placeIcon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 1,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
