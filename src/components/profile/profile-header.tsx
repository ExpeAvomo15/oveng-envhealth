import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import type { Profile } from '@/lib/database.types';
import { joinedLabel, profileName } from '@/lib/profiles';
import { colors, radius, screenPadding, spacing } from '@/theme';

const COVER_HEIGHT = 120;
const AVATAR_OVERLAP = 48;

/**
 * Cabecera de perfil: portada, avatar solapado e identidad.
 *
 * La misma para el perfil propio y el de otras cuentas — lo que cambia son las
 * acciones que se le cuelgan debajo, no la identidad.
 */
export function ProfileHeader({ profile }: { profile: Profile }) {
  const name = profileName(profile);

  return (
    <View>
      {/* Portada: verde suave hasta que haya imagen de marca en docs/design/. */}
      <View style={styles.cover}>
        <Ionicons name="leaf" size={56} color={colors.surface} style={styles.coverLeaf} />
      </View>

      <View style={styles.body}>
        <View style={styles.avatarRing}>
          <Avatar name={name} uri={profile.avatar_url} size="xl" />
        </View>

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text variant="title" numberOfLines={1} style={styles.name}>
              {name}
            </Text>
          </View>

          {/* Píldora, no solo un check: es como aparece en el mockup 2. En las
              tarjetas del feed sí basta el check junto al nombre. */}
          {profile.verified ? (
            <View style={styles.verified}>
              <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
              <Text variant="micro" color="accent">
                Verificado
              </Text>
            </View>
          ) : null}

          <Text variant="body" color="textSecondary">
            @{profile.username}
          </Text>

          {profile.bio ? <Text variant="body">{profile.bio}</Text> : null}

          <View style={styles.meta}>
            {profile.location ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                <Text variant="caption" color="textSecondary">
                  {profile.location}
                </Text>
              </View>
            ) : null}

            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary">
                {joinedLabel(profile.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: COVER_HEIGHT,
    backgroundColor: colors.accentSoft,
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  coverLeaf: {
    opacity: 0.5,
    marginRight: spacing.xl,
    marginBottom: -spacing.sm,
  },
  body: {
    paddingHorizontal: screenPadding,
    marginTop: -AVATAR_OVERLAP,
    gap: spacing.md,
  },
  avatarRing: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.surface,
    backgroundColor: colors.surface,
  },
  identity: {
    gap: spacing.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flexShrink: 1,
  },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    paddingTop: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
