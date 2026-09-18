import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/logo';
import { Avatar } from '@/components/ui';
import { colors, screenPadding, spacing } from '@/theme';

import { useAuth } from '@/hooks/use-auth';

/**
 * Cabecera de Inicio: marca a la izquierda, notificaciones y cuenta a la
 * derecha. La campana todavía no hace nada — las notificaciones no son parte
 * del MVP — pero ocupa su sitio para que la cabecera sea la definitiva.
 */
export function HomeHeader() {
  const router = useRouter();
  const { profile, user } = useAuth();

  const name = profile?.display_name ?? profile?.username ?? user?.email ?? 'Tu cuenta';

  return (
    <View style={styles.header}>
      <Logo variant="inline" />

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={() => router.navigate('/perfil')}
          accessibilityRole="button"
          accessibilityLabel={`Tu perfil: ${name}`}
          style={({ pressed }) => pressed && styles.pressed}>
          <Avatar name={name} uri={profile?.avatar_url} size="sm" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconButton: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
