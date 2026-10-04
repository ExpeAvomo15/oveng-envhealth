import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EntityAvatar } from '@/components/search';
import { Text } from '@/components/ui';
import { entityTypeLabels } from '@/lib/entities';
import { getAdministeredPages, type AdministeredPage } from '@/lib/entity-admins';
import { colors, radius, screenPadding, spacing } from '@/theme';

/**
 * "Páginas que administras" en el perfil propio (F4.4). Se relee al volver a
 * la pestaña, porque el claim se hace en otra pantalla. Si no administras
 * ninguna, la sección no sale.
 */
export function AdministeredPages({ userId }: { userId: string }) {
  const router = useRouter();
  const [pages, setPages] = useState<{ userId: string; pages: AdministeredPage[] } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAdministeredPages(userId)
        .then((found) => {
          if (active) setPages({ userId, pages: found });
        })
        .catch(() => {
          if (active) setPages({ userId, pages: [] });
        });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  const list = pages?.userId === userId ? pages.pages : [];
  if (list.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="subtitle">Páginas que administras</Text>
      {list.map((page) => (
        <Pressable
          key={page.id}
          onPress={() => router.push(`/entidad/${page.slug}`)}
          accessibilityRole="link"
          accessibilityLabel={`Página que administras: ${page.name}`}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
          <EntityAvatar category={page.category} size={36} />
          <View style={styles.flex}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {page.name}
            </Text>
            <Text variant="caption" color="textSecondary">
              {entityTypeLabels[page.type]}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  flex: {
    flex: 1,
  },
  pressed: {
    opacity: 0.6,
  },
});
