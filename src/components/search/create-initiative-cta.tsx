import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { communityInitiativesAvailable } from '@/lib/initiatives';
import { colors, radius, spacing } from '@/theme';

/**
 * "Crea tu iniciativa" (F5.1): la puerta a que la gente traiga sus causas.
 *
 * Sin cuenta se enseña igual y lleva a la bienvenida —"lectura libre, cuenta
 * para participar"—. Sin la migración `011` no se enseña: no hay dónde
 * guardarla.
 */
export function CreateInitiativeCta() {
  const router = useRouter();
  const { session } = useAuth();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let live = true;
    void communityInitiativesAvailable().then((ok) => live && setAvailable(ok));
    return () => {
      live = false;
    };
  }, []);

  if (!available) return null;

  return (
    <Pressable
      onPress={() => router.push(session === null ? '/welcome' : '/iniciativa')}
      accessibilityRole="button"
      accessibilityLabel={
        session === null ? 'Inicia sesión para crear tu iniciativa' : 'Crea tu iniciativa'
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.icon}>
        <Ionicons name="add" size={24} color={colors.textInverse} />
      </View>
      <View style={styles.texts}>
        <Text variant="bodyStrong">Crea tu iniciativa</Text>
        <Text variant="caption" color="textSecondary">
          {session === null
            ? 'Entra y cuéntale al mundo tu causa: una limpieza, un huerto, un grupo.'
            : 'Una limpieza, un huerto, un grupo que cuida un río: que la gente se una.'}
        </Text>
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
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accentTint,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
