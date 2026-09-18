import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { ProfileCounts as Counts } from '@/lib/profiles';
import { colors, screenPadding, spacing } from '@/theme';

/** Publicaciones · Seguidores · Siguiendo, con los números reales de la base. */
export function ProfileCounts({ counts, loading }: { counts: Counts; loading?: boolean }) {
  return (
    <View style={styles.row}>
      <Column value={counts.posts} label="Publicaciones" loading={loading} />
      <View style={styles.separator} />
      <Column value={counts.followers} label="Seguidores" loading={loading} />
      <View style={styles.separator} />
      <Column value={counts.following} label="Siguiendo" loading={loading} />
    </View>
  );
}

function Column({
  value,
  label,
  loading,
}: {
  value: number;
  label: string;
  loading?: boolean;
}) {
  return (
    <View style={styles.column} accessibilityLabel={`${value} ${label}`}>
      <Text variant="title">{loading ? '—' : String(value)}</Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: screenPadding,
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    backgroundColor: colors.border,
  },
});
