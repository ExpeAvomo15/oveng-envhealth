import { useRouter } from 'expo-router';
import { forwardRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import { useFontFamily } from '@/hooks/use-fonts';
import { COMMENT_MAX } from '@/lib/comments';
import { colors, noWebFocusRing, spacing, typography } from '@/theme';

export type CommentComposerProps = {
  /** Quien comenta; `null` sin sesión. */
  viewer: { name: string; avatarUrl: string | null } | null;
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  sending: boolean;
};

/**
 * La barra fija de "Añade un comentario…" (F4.7), en píldora como la del chat.
 *
 * Sin sesión no hay campo: la misma píldora lleva a entrar. Los comentarios se
 * leen sin cuenta; escribirlos la pide, y lo dice.
 */
export const CommentComposer = forwardRef<TextInput, CommentComposerProps>(function CommentComposer(
  { viewer, value, onChange, onSubmit, sending },
  ref,
) {
  const router = useRouter();
  const fontFamily = useFontFamily();
  const empty = value.trim().length === 0;

  if (!viewer) {
    return (
      <View style={styles.bar}>
        <Pressable
          onPress={() => router.push('/welcome')}
          accessibilityRole="button"
          accessibilityLabel="Entra para comentar"
          style={({ pressed }) => [styles.pill, styles.signIn, pressed && styles.pressed]}>
          <Text variant="body" color="textSecondary">
            Entra para comentar
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.bar}>
      <Avatar name={viewer.name} uri={viewer.avatarUrl} size="sm" />
      <View style={styles.pill}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChange}
          placeholder="Añade un comentario…"
          placeholderTextColor={colors.textMuted}
          accessibilityLabel="Añade un comentario"
          multiline
          numberOfLines={1}
          maxLength={COMMENT_MAX}
          onKeyPress={(event) => {
            // En web, Intro publica y Mayús+Intro salta de línea, como en el chat.
            const native = event.nativeEvent as { key: string; shiftKey?: boolean };
            if (native.key === 'Enter' && !native.shiftKey) {
              (event as unknown as { preventDefault?: () => void }).preventDefault?.();
              onSubmit();
            }
          }}
          style={[styles.input, noWebFocusRing, { fontFamily: fontFamily('400') }]}
        />
        <Pressable
          onPress={onSubmit}
          disabled={sending || empty}
          accessibilityRole="button"
          accessibilityLabel="Publicar comentario"
          accessibilityState={{ disabled: sending || empty }}
          hitSlop={8}
          style={({ pressed }) => [styles.send, pressed && styles.pressed]}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Text variant="bodyStrong" color={empty ? 'textMuted' : 'accent'}>
              Publicar
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    minHeight: 44,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  signIn: {
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    paddingVertical: 10,
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
  },
  send: {
    height: 42,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
