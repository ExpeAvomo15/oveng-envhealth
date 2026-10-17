import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/logo';
import { Avatar, Text } from '@/components/ui';
import { colors, screenPadding, spacing } from '@/theme';

import { useAuth } from '@/hooks/use-auth';
import { useInboxCounts } from '@/hooks/use-messages';
import { useUnreadNotifications } from '@/hooks/use-notifications';
import { inboxLabel } from '@/lib/messages';
import { bellLabel } from '@/lib/notifications';

/**
 * Cabecera de Inicio: marca a la izquierda; mensajes, notificaciones y cuenta a
 * la derecha. Dos iconos, dos mundos, como en Instagram: el bocadillo es lo que
 * te escriben, la campana lo que hacen con lo tuyo (F4.7).
 */
export function HomeHeader() {
  const router = useRouter();
  const { profile, user, session } = useAuth();

  const name = profile?.display_name ?? profile?.username ?? user?.email ?? 'Tu cuenta';
  const inbox = useInboxCounts();
  const pending = inbox.unread + inbox.requests;
  const unreadNotifications = useUnreadNotifications();

  return (
    <View style={styles.header}>
      <Logo variant="inline" />

      <View style={styles.actions}>
        {/*
          Mensajes (F4.6). El número suma lo sin leer y las
          solicitudes nuevas; el nombre accesible dice cuánto es cada cosa.
        */}
        {/* Siempre a la vista: sin cuenta, lleva a entrar (se ve que se puede). */}
        <Pressable
          onPress={() => router.push(session === null ? '/welcome' : '/mensajes')}
          accessibilityRole="button"
          accessibilityLabel={inboxLabel(inbox)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="chatbubble-ellipses-outline" size={24} color={colors.text} />
          {pending > 0 ? (
            <View style={styles.badge}>
              <Text variant="micro" color="textInverse">
                {pending > 9 ? '9+' : pending}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {/* Notificaciones (F4.7): seguidores, "me gusta", comentarios y envíos. */}
        <Pressable
          onPress={() => router.push(session === null ? '/welcome' : '/notificaciones')}
          accessibilityRole="button"
          accessibilityLabel={bellLabel(unreadNotifications)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {unreadNotifications > 0 ? (
            <View style={styles.badge}>
              <Text variant="micro" color="textInverse">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {/*
          El feed es público desde F2.6, así que aquí puede no haber cuenta. El
          avatar solo se enseña si hay a quién enseñar; si no, la puerta de
          entrada a la cuenta.
        */}
        {session === null ? (
          <Pressable
            onPress={() => router.push('/welcome')}
            accessibilityRole="button"
            accessibilityLabel="Iniciar sesión o crear cuenta"
            style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}>
            <Text variant="label" color="accent">
              Entrar
            </Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.navigate('/perfil')}
            accessibilityRole="button"
            accessibilityLabel={`Tu perfil: ${name}`}
            style={({ pressed }) => pressed && styles.pressed}>
            <Avatar name={name} uri={profile?.avatar_url} size="sm" />
          </Pressable>
        )}
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
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  signIn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.6,
  },
});
