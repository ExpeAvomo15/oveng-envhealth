import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { ProfileCounts as Counts } from '@/lib/profiles';
import { spacing } from '@/theme';

/**
 * Publicaciones · Seguidores · Siguiendo, con los números reales de la base.
 * Van en fila junto al avatar, como en Instagram (F4.6b), sin líneas que los
 * encajen: la cifra en negrita basta para leerlos como una unidad.
 */
export function ProfileCounts({ counts, loading }: { counts: Counts; loading?: boolean }) {
  return (
    <View style={styles.row}>
      <Column value={counts.posts} label="Publicaciones" loading={loading} />
      <Column value={counts.followers} label="Seguidores" loading={loading} />
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
      <Text variant="subtitle">{loading ? '—' : String(value)}</Text>
      <Text variant="label" color="textSecondary" numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
});
