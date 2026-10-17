import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Text } from '@/components/ui';
import type { Comment } from '@/lib/comments';
import { relativeTime } from '@/lib/time';
import { colors, screenPadding, spacing } from '@/theme';

export type CommentRowProps = {
  comment: Comment;
  /** Quien escribió el comentario o la publicación: puede borrarlo. */
  canDelete: boolean;
  /** Aún no lo ha confirmado la base (publicación optimista). */
  pending?: boolean;
  onDelete: (comment: Comment) => void;
};

/**
 * Un comentario con el patrón de Instagram (F4.7): avatar pequeño, @usuario en
 * negrita seguido del texto en la misma línea y el tiempo debajo.
 *
 * Borrar va en "···", con la confirmación en la propia fila: un diálogo del
 * sistema no existe en web, y la fila ya dice qué se borra.
 */
export function CommentRow({ comment, canDelete, pending = false, onDelete }: CommentRowProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const { username, display_name, avatar_url } = comment.author;

  return (
    <View style={[styles.row, pending && styles.pending]} accessibilityLabel={`Comentario de @${username}`}>
      <Pressable
        onPress={() => router.push({ pathname: '/user/[username]', params: { username } })}
        accessibilityRole="link"
        accessibilityLabel={`Perfil de @${username}`}
        style={({ pressed }) => pressed && styles.pressed}>
        <Avatar name={display_name ?? username} uri={avatar_url} size="xs" />
      </Pressable>

      <View style={styles.body}>
        <Text variant="body">
          <Text variant="bodyStrong">{username}</Text> {comment.content}
        </Text>
        <Text variant="micro" color="textSecondary">
          {pending ? 'Publicando…' : relativeTime(comment.createdAt)}
        </Text>

        {confirming ? (
          <View style={styles.confirm}>
            <Text variant="caption">¿Borrar este comentario? No se puede deshacer.</Text>
            <View style={styles.confirmButtons}>
              <Button
                label="Sí, borrar"
                size="sm"
                onPress={() => {
                  setConfirming(false);
                  onDelete(comment);
                }}
              />
              <Button label="Cancelar" variant="ghost" size="sm" onPress={() => setConfirming(false)} />
            </View>
          </View>
        ) : null}
      </View>

      {canDelete && !pending ? (
        <Pressable
          onPress={() => setConfirming((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={`Opciones del comentario de @${username}`}
          hitSlop={spacing.sm}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}>
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
  },
  pending: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  confirm: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  more: {
    paddingTop: 2,
  },
  pressed: {
    opacity: 0.6,
  },
});
