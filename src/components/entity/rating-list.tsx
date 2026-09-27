import { StyleSheet, View } from 'react-native';

import { Avatar, Button, Text } from '@/components/ui';
import type { RatingWithAuthor } from '@/lib/entities';
import { relativeTime } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';

import { Stars } from './stars';

export type RatingListProps = {
  ratings: RatingWithAuthor[];
  /** Quedan más páginas por traer. */
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
};

/**
 * Opiniones de la comunidad.
 *
 * El seed **no trae ninguna**: una valoración necesita una persona real detrás,
 * así que toda entidad arranca sin opiniones y el estado vacío es el normal, no
 * el raro. De ahí que invite a ser el primero en vez de disculparse.
 *
 * Esto resuelve además la contradicción de los mockups, que dan a Monte Alén
 * 4.7 con 135 votos en uno y 4.9 con 312 en el otro: **no hay que elegir**,
 * porque los números no se siembran. Salen de quien valore.
 */
export function RatingList({ ratings, hasMore, loadingMore, onLoadMore }: RatingListProps) {
  if (ratings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text variant="caption" color="textSecondary">
          Todavía no hay opiniones. La primera puede ser la tuya.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {ratings.map((rating) => {
        const name = rating.author?.display_name ?? rating.author?.username ?? 'Cuenta eliminada';

        return (
          <View key={`${rating.entity_id}-${rating.user_id}`} style={styles.item}>
            <Avatar name={name} uri={rating.author?.avatar_url ?? null} size="sm" />

            <View style={styles.body}>
              <View style={styles.head}>
                <Text variant="label" numberOfLines={1} style={styles.name}>
                  {name}
                </Text>
                <Text variant="micro" color="textMuted">
                  {relativeTime(rating.created_at)}
                </Text>
              </View>

              <Stars value={rating.score} size={13} />

              {rating.comment ? <Text variant="caption">{rating.comment}</Text> : null}
            </View>
          </View>
        );
      })}

      {hasMore ? (
        <Button
          label="Ver más opiniones"
          variant="secondary"
          size="sm"
          loading={loadingMore}
          onPress={onLoadMore}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  body: {
    flex: 1,
    gap: spacing.xs,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  empty: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
