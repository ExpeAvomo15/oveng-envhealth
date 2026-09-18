import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { FeedMode } from '@/lib/feed';
import { colors, radius, spacing } from '@/theme';

const OPTIONS: { key: FeedMode; label: string }[] = [
  { key: 'para-ti', label: 'Para ti' },
  { key: 'siguiendo', label: 'Siguiendo' },
];

/** Selector del feed: todas las publicaciones o solo las de quien sigo. */
export function FeedToggle({
  mode,
  onChange,
}: {
  mode: FeedMode;
  onChange: (mode: FeedMode) => void;
}) {
  return (
    <View style={styles.group} accessibilityRole="tablist">
      {OPTIONS.map((option) => {
        const selected = option.key === mode;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.option, selected && styles.optionSelected]}>
            <Text variant="label" color={selected ? 'textInverse' : 'textSecondary'}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    alignSelf: 'flex-start',
  },
  option: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  optionSelected: {
    backgroundColor: colors.accent,
  },
});
