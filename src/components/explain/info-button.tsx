import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { explainers, type ExplainerTopic } from '@/lib/explainers';
import { colors, radius, spacing } from '@/theme';

export type InfoButtonProps = {
  topic: ExplainerTopic;
  /**
   * De qué es la explicación, para el nombre accesible: "Qué significa: índice
   * de calidad del aire".
   */
  about: string;
  size?: number;
};

/**
 * El ⓘ tocable de la regla de lenguaje llano (AGENTS.md): **toda cifra o
 * término técnico visible lleva su explicación a un toque**.
 *
 * Abre una hoja con el mismo esqueleto para cualquier métrica —qué es, la
 * escala con colores y palabras, qué significa para ti y de dónde sale el
 * dato—, así que explicar algo nuevo es escribir su texto en
 * src/lib/explainers.ts, no una pantalla.
 *
 * Es su propio pulsable y vive **al lado** del de la tarjeta, nunca dentro: un
 * pulsable dentro de otro hace que en web el toque burbujee y abra las dos
 * cosas.
 */
export function InfoButton({ topic, about, size = 18 }: InfoButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Qué significa: ${about}`}
        hitSlop={10}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Ionicons name="information-circle-outline" size={size} color={colors.textSecondary} />
      </Pressable>

      {open ? <ExplainerSheet topic={topic} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function ExplainerSheet({ topic, onClose }: { topic: ExplainerTopic; onClose: () => void }) {
  const explainer = explainers[topic];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Cerrar la explicación">
        {/* El contenido no cierra al tocarlo: solo el fondo y el botón. */}
        <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
          <ScrollView contentContainerStyle={styles.content} accessibilityRole="summary">
            <Text variant="subtitle" accessibilityRole="header">
              {explainer.title}
            </Text>
            <Text variant="body">{explainer.what}</Text>

            {explainer.scale ? (
              <View style={styles.scale} accessibilityLabel="Escala">
                {explainer.scale.map((step) => (
                  <View key={step.label} style={styles.step} accessibilityLabel={`${step.label}: ${step.range}`}>
                    <View style={[styles.dot, { backgroundColor: colors[step.color] }]} />
                    <Text variant="bodyStrong" style={styles.stepLabel}>
                      {step.label}
                    </Text>
                    <Text variant="caption" color="textSecondary">
                      {step.range}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {explainer.forYou?.length ? (
              <View style={styles.block}>
                <Text variant="label" color="textSecondary">
                  Qué significa para ti
                </Text>
                {explainer.forYou.map((line) => (
                  <Text key={line} variant="body">
                    • {line}
                  </Text>
                ))}
              </View>
            ) : null}

            {explainer.source ? (
              <View style={styles.block}>
                <Text variant="label" color="textSecondary">
                  De dónde sale
                </Text>
                <Text variant="caption" color="textSecondary">
                  {explainer.source}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Entendido"
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
              <Text variant="bodyStrong" color="accent">
                Entendido
              </Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 2,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    maxHeight: '85%',
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
  },
  content: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  scale: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
  },
  stepLabel: {
    flex: 1,
  },
  block: {
    gap: spacing.xs,
  },
  close: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
});
