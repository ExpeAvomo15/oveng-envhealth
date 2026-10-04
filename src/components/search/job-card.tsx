import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { isExampleJob, jobTypeLabels, type JobWithEntity } from '@/lib/jobs';
import { relativeTime } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';

import { EntityAvatar } from './entity-avatar';

export type JobCardProps = {
  job: JobWithEntity;
  onPress: () => void;
  /** En el perfil de la propia entidad sobra repetir quién publica. */
  hideEntity?: boolean;
};

/**
 * Ficha de una oferta de empleo (F4.4): título, quién la publica con su
 * marcador de categoría, dónde, de qué tipo y cuándo.
 *
 * Las ofertas de ejemplo de la demo —las que cargó el seed, sin autor— llevan
 * su etiqueta: no se presentan como ofertas reales.
 */
export function JobCard({ job, onPress, hideEntity = false }: JobCardProps) {
  const example = isExampleJob(job);
  const where = job.location_name ?? job.entity.location_name;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`Oferta: ${job.title}, en ${job.entity.name}. ${jobTypeLabels[job.type]}${
        where ? `, ${where}` : ''
      }${example ? '. Oferta de ejemplo' : ''}${job.active ? '' : '. Desactivada'}`}
      style={({ pressed }) => [styles.card, !job.active && styles.inactive, pressed && styles.pressed]}>
      {hideEntity ? null : <EntityAvatar category={job.entity.category} size={40} />}

      <View style={styles.texts}>
        <Text variant="subtitle" numberOfLines={2}>
          {job.title}
        </Text>
        {hideEntity ? null : (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {job.entity.name}
          </Text>
        )}
        {where ? (
          <View style={styles.row}>
            <Ionicons name="location-outline" size={13} color={colors.textMuted} />
            <Text variant="micro" color="textMuted" numberOfLines={1} style={styles.shrink}>
              {where}
            </Text>
          </View>
        ) : null}

        <View style={styles.badges}>
          <View style={[styles.badge, styles.typeBadge]}>
            <Text variant="micro" color="accent">
              {jobTypeLabels[job.type]}
            </Text>
          </View>
          {example ? (
            <View style={[styles.badge, styles.exampleBadge]}>
              <Text variant="micro" color="textSecondary">
                Oferta de ejemplo
              </Text>
            </View>
          ) : null}
          {!job.active ? (
            <View style={[styles.badge, styles.exampleBadge]}>
              <Text variant="micro" color="textSecondary">
                Desactivada
              </Text>
            </View>
          ) : null}
          <Text variant="micro" color="textMuted">
            {relativeTime(job.created_at)}
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  inactive: {
    opacity: 0.6,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  shrink: {
    flexShrink: 1,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  typeBadge: {
    backgroundColor: colors.accentTint,
  },
  exampleBadge: {
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
