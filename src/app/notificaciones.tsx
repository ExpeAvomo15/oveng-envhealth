import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useIsFocused, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useChatChanges } from '@/hooks/use-messages';
import { refreshNotifications } from '@/hooks/use-notifications';
import {
  listNotifications,
  markAllNotificationsRead,
  notificationText,
  type AppNotification,
} from '@/lib/notifications';
import { relativeTime } from '@/lib/time';
import { colors, radius, screenPadding, spacing } from '@/theme';

/**
 * La campana (F4.7), como la actividad de Instagram: quién te ha seguido, a
 * quién le ha gustado o ha comentado una publicación tuya y quién la ha
 * enviado por mensaje. Lo nuevo arriba, separado de lo ya visto.
 *
 * Al abrirla todo queda leído y el número de la campana baja a cero; las filas
 * conservan cómo estaban al llegar, para que se vea qué era nuevo. Lo que llega
 * con la pantalla abierta aparece solo (Realtime).
 */
export default function NotificationsScreen() {
  const router = useRouter();
  const focused = useIsFocused();
  const { profile } = useAuth();
  const me = profile?.id ?? null;
  const [loaded, setLoaded] = useState<{ key: string; items: AppNotification[]; error: boolean } | null>(null);
  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useChatChanges(me !== null && focused, [{ table: 'notifications', filter: `user_id=eq.${me}` }], (_, payload) => {
    // Marcar como leídas también es un cambio: solo lo nuevo pide recargar.
    if (payload.eventType === 'INSERT') reload();
  });

  useEffect(() => {
    if (!me) return;
    let active = true;
    listNotifications(me)
      .then(async (items) => {
        if (!active) return;
        setLoaded({ key: me, items, error: false });
        if (items.some((n) => !n.read)) {
          await markAllNotificationsRead(me);
          refreshNotifications();
        }
      })
      .catch(() => {
        if (active) setLoaded({ key: me, items: [], error: true });
      });
    return () => {
      active = false;
    };
  }, [me, version]);

  const current = me && loaded?.key === me ? loaded : null;
  const items = current?.items ?? [];
  const fresh = items.filter((n) => !n.read);
  const seen = items.filter((n) => n.read);

  const open = (notification: AppNotification) => {
    if (notification.post) {
      router.push({ pathname: '/publicacion/[id]', params: { id: notification.post.id } });
    } else {
      router.push({ pathname: '/user/[username]', params: { username: notification.actor.username } });
    }
  };

  return (
    <Screen padded={false} scroll={false} background="surface">
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle" accessibilityRole="header">
          Notificaciones
        </Text>
      </View>

      {current === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : current.error ? (
        <View style={styles.center}>
          <Text variant="body" color="textSecondary" style={styles.centered}>
            No se han podido cargar tus notificaciones. Vuelve a intentarlo en un momento.
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-outline" size={28} color={colors.accent} />
          </View>
          <Text variant="bodyStrong">Todavía no hay nada</Text>
          <Text variant="body" color="textSecondary" style={styles.centered}>
            Aquí verás la actividad: me gusta, comentarios y nuevos seguidores.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {fresh.length > 0 ? <Section title="Nuevas" items={fresh} onOpen={open} /> : null}
          {seen.length > 0 ? <Section title="Anteriores" items={seen} onOpen={open} /> : null}
        </ScrollView>
      )}
    </Screen>
  );
}

function Section({
  title,
  items,
  onOpen,
}: {
  title: string;
  items: AppNotification[];
  onOpen: (notification: AppNotification) => void;
}) {
  return (
    <View>
      <Text variant="bodyStrong" accessibilityRole="header" style={styles.sectionTitle}>
        {title}
      </Text>
      {items.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} onOpen={onOpen} />
      ))}
    </View>
  );
}

/**
 * Una fila como en Instagram: avatar de quien lo hizo, "@usuario comentó…"
 * con el tiempo al final y, si hay publicación con foto, su miniatura a la
 * derecha. Toda la fila lleva a la publicación (o al perfil, si es un seguidor).
 */
function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification;
  onOpen: (notification: AppNotification) => void;
}) {
  const { actor, post } = notification;
  const name = actor.display_name ?? actor.username;
  const text = notificationText(notification);
  const when = relativeTime(notification.createdAt);

  return (
    <Pressable
      onPress={() => onOpen(notification)}
      accessibilityRole="link"
      accessibilityLabel={`@${actor.username} ${text}, ${when}${notification.read ? '' : ', nueva'}`}
      style={({ pressed }) => [styles.row, !notification.read && styles.unread, pressed && styles.pressed]}>
      <Avatar name={name} uri={actor.avatar_url} size="md" />
      <Text variant="body" style={styles.text}>
        <Text variant="bodyStrong">{actor.username}</Text> {text}{' '}
        <Text variant="caption" color="textSecondary">
          · {when}
        </Text>
      </Text>
      {post?.image_url ? (
        <Image source={{ uri: post.image_url }} style={styles.thumb} contentFit="cover" accessible={false} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: screenPadding,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    width: 40,
    height: 40,
    marginLeft: -spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  centered: {
    textAlign: 'center',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: spacing.xl,
  },
  sectionTitle: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
  },
  unread: {
    backgroundColor: colors.accentTint,
  },
  text: {
    flex: 1,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
  },
  pressed: {
    opacity: 0.6,
  },
});
