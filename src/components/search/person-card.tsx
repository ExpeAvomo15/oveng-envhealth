import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ChatButton } from '@/components/chat/chat-button';
import { Avatar, Button, Text } from '@/components/ui';
import type { Profile } from '@/lib/database.types';
import { profileName } from '@/lib/profiles';
import { colors, radius, spacing } from '@/theme';

export type PersonCardProps = {
  profile: Profile;
  following: boolean;
  busy?: boolean;
  /** Falso en la propia cuenta: nadie se sigue a sí mismo. */
  canFollow: boolean;
  onPress: () => void;
  onToggleFollow: () => void;
};

/**
 * Ficha de resultado de una persona. Mismo esqueleto que la de entidad —
 * pulsable a la izquierda, botón al lado— para que una lista mixta no parezca
 * dos listas pegadas.
 */
export function PersonCard({
  profile,
  following,
  busy = false,
  canFollow,
  onPress,
  onToggleFollow,
}: PersonCardProps) {
  const name = profileName(profile);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onPress}
        accessibilityRole="link"
        accessibilityLabel={`${name}, @${profile.username}`}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <Avatar name={name} uri={profile.avatar_url} />

        <View style={styles.texts}>
          <View style={styles.nameRow}>
            <Text variant="subtitle" numberOfLines={1} style={styles.name}>
              {name}
            </Text>
            {profile.verified ? (
              <Ionicons
                name="checkmark-circle"
                size={15}
                color={colors.accent}
                accessibilityLabel="Verificada"
              />
            ) : null}
          </View>

          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            @{profile.username}
          </Text>
        </View>
      </Pressable>

      {canFollow ? <ChatButton personId={profile.id} personName={name} size={34} /> : null}

      {canFollow ? (
        <Button
          label={following ? 'Siguiendo' : 'Seguir'}
          variant={following ? 'secondary' : 'primary'}
          size="sm"
          loading={busy}
          onPress={onToggleFollow}
          style={styles.follow}
        />
      ) : (
        <Text variant="label" color="textMuted">
          Tú
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  texts: {
    flex: 1,
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  name: {
    flexShrink: 1,
  },
  follow: {
    // Mismo ancho en los dos estados: si "Seguir" y "Siguiendo" miden distinto,
    // la fila se reacomoda al pulsar y el texto de al lado salta.
    minWidth: 88,
  },
  pressed: {
    opacity: 0.6,
  },
});
