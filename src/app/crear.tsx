import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen, Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

/**
 * Crear publicación — placeholder.
 *
 * Se abre como modal sobre la pestaña activa desde el botón central de la
 * barra. La composición real (texto, imagen, ubicación, categoría) es F1.4.
 */
export default function CreateScreen() {
  const router = useRouter();

  function close() {
    // El modal puede abrirse por URL directa, sin nada a lo que volver.
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  return (
    <Screen background="surface" scroll={false}>
      <View style={styles.header}>
        <Text variant="title">Crear publicación</Text>

        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.body}>
        <View style={styles.illustration}>
          <Ionicons name="create-outline" size={40} color={colors.accent} />
        </View>

        <Text variant="body" color="textSecondary" style={styles.centered}>
          Aquí se escribirá la publicación: texto, imagen, ubicación y categoría ambiental.
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.centered}>
          Disponible en F1.4
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  close: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  illustration: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
});
