import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useFontFamily } from '@/hooks/use-fonts';
import { RATING_COMMENT_MAX } from '@/lib/entities';
import { colors, noWebFocusRing, radius, spacing, typography } from '@/theme';

import { Stars } from './stars';

export type RatingSheetProps = {
  visible: boolean;
  entityName: string;
  /** La valoración que ya había, si se está cambiando. */
  current: { score: number; comment: string | null } | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (score: number, comment: string) => void;
};

/**
 * Modal para valorar una entidad.
 *
 * Si ya había valoración, entra rellenada y el botón dice "Actualizar": la
 * tabla tiene una fila por persona y entidad, así que valorar otra vez
 * **sustituye**. Enseñarlo vacío haría creer que se añade una segunda.
 *
 * El comentario se limita a 300 caracteres desde el propio campo. La base
 * admite 500 (`entity_ratings_comment_length`), así que el tope de aquí es una
 * decisión de producto —una opinión, no un artículo— y no puede chocar con la
 * restricción.
 */
export function RatingSheet({
  visible,
  entityName,
  current,
  busy,
  onClose,
  onSubmit,
}: RatingSheetProps) {
  const fontFamily = useFontFamily();
  const [score, setScore] = useState(current?.score ?? 0);
  const [comment, setComment] = useState(current?.comment ?? '');

  // El modal se monta y desmonta con `visible`, así que al abrirlo el estado
  // arranca de lo que había. La clave del padre fuerza ese remontaje.
  const left = RATING_COMMENT_MAX - comment.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text variant="subtitle" style={styles.title} numberOfLines={2}>
              {current ? 'Cambia tu valoración' : 'Valora'} {entityName}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Cerrar"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.starsRow}>
            <Stars value={score} size={32} onChange={setScore} />
          </View>

          <View style={styles.field}>
            <TextInput
              value={comment}
              onChangeText={(text) => setComment(text.slice(0, RATING_COMMENT_MAX))}
              placeholder="Cuenta por qué (opcional)"
              placeholderTextColor={colors.textMuted}
              multiline
              accessibilityLabel="Comentario de la valoración"
              style={[styles.input, noWebFocusRing, { fontFamily: fontFamily('400') }]}
            />
          </View>

          {/* El contador aparece cuando queda poco, como en el compositor. */}
          {left <= 60 ? (
            <Text variant="micro" color={left <= 0 ? 'danger' : 'textMuted'}>
              {left} caracteres
            </Text>
          ) : null}

          <Button
            label={current ? 'Actualizar valoración' : 'Publicar valoración'}
            fullWidth
            disabled={score === 0}
            loading={busy}
            onPress={() => onSubmit(score, comment)}
          />

          {score === 0 ? (
            <Text variant="micro" color="textMuted" style={styles.hint}>
              Elige de 1 a 5 estrellas para poder enviarla.
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  close: {
    padding: spacing.xs,
  },
  starsRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  field: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    padding: spacing.md,
  },
  input: {
    minHeight: 84,
    color: colors.text,
    fontSize: typography.body.fontSize,
    textAlignVertical: 'top',
  },
  hint: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
