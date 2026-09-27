import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import type { EntityResult } from '@/lib/entities';
import { colors, environmentalCategories, radius, spacing } from '@/theme';

import { EntityAvatar } from './entity-avatar';
import { RatingBadge } from './rating-badge';

export type EntityCardProps = {
  entity: EntityResult;
  following: boolean;
  /** En curso: el botón se pinta cargando sin bloquear la fila. */
  busy?: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
};

/**
 * Ficha de resultado de una entidad, según la pantalla 2 de los mockups.
 *
 * **La fila no es un único Pressable.** El botón Seguir tendría que ir dentro,
 * y un pulsable dentro de otro hace que en web el clic burbujee: seguir a una
 * entidad navegaría además a su ficha. Así que la zona de texto es el pulsable
 * y el botón va al lado, hermanos en la misma fila. Es lo que ya hace la
 * tarjeta del feed, donde el avatar y el cuerpo llevan a sitios distintos.
 */
export function EntityCard({
  entity,
  following,
  busy = false,
  onPress,
  onToggleFollow,
}: EntityCardProps) {
  const category = environmentalCategories[entity.category];
  const place = entity.location_name ?? entity.country;

  /**
   * "Energía · Malabo, Bioko Norte", saltándose lo que no haya.
   *
   * **Sin el tipo a propósito.** Estaba, y se comía la ubicación: en un móvil
   * estrecho "Empresa · Energía · Mal…" deja fuera justo el dato que distingue
   * una empresa de otra. Y es redundante por los dos lados — con alcance "Todo"
   * lo dice el título de la sección, y con un chip puesto lo dice el chip.
   */
  const subtitle = [category.label, place]
    .filter((part): part is string => Boolean(part))
    .join(' · ');

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={`${entity.name}. ${subtitle}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <EntityAvatar category={entity.category} />

        <View style={styles.texts}>
          <View style={styles.nameRow}>
            <Text variant="subtitle" numberOfLines={1} style={styles.name}>
              {entity.name}
            </Text>
            {entity.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.accent}
                accessibilityLabel="Verificada"
              />
            ) : null}
          </View>

          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {subtitle}
          </Text>

          <RatingBadge average={entity.ratingAverage} count={entity.ratingsCount} />
        </View>
      </Pressable>

      <Button
        label={following ? 'Siguiendo' : 'Seguir'}
        variant={following ? 'secondary' : 'primary'}
        size="sm"
        loading={busy}
        onPress={onToggleFollow}
        style={styles.follow}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
  },
  follow: {
    // Mismo ancho en los dos estados: si "Seguir" y "Siguiendo" miden distinto,
    // la fila se reacomoda al pulsar y el texto de al lado salta.
    minWidth: 88,
  },
  pressed: {
    opacity: 0.6,
  },
});
