import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Text } from '@/components/ui';
import type { Profile } from '@/lib/database.types';
import { joinedLabel, profileName, type ProfileCounts as Counts } from '@/lib/profiles';
import { colors, radius, screenPadding, spacing } from '@/theme';

import { ProfileCounts } from './profile-counts';

/**
 * Cabecera de perfil con el patrón de Instagram (F4.6b): avatar a la izquierda
 * y, a su lado, los tres contadores en fila; debajo, nombre, bio y datos. Sin
 * portada: ocupaba un tercio de la pantalla para enseñar un verde liso.
 *
 * La misma para el perfil propio y el de otras cuentas — lo que cambia son la
 * barra de arriba y las acciones de debajo, no la identidad.
 */
export function ProfileHeader({
  profile,
  counts,
  countsLoading,
  onPressAvatar,
}: {
  profile: Profile;
  counts: Counts;
  countsLoading?: boolean;
  /** Solo en el perfil propio: tocar la foto lleva a cambiarla (F5.1). */
  onPressAvatar?: () => void;
}) {
  const name = profileName(profile);

  return (
    <View style={styles.body}>
      <View style={styles.top}>
        {onPressAvatar ? (
          <Pressable
            onPress={onPressAvatar}
            accessibilityRole="button"
            accessibilityLabel="Cambiar la foto de perfil"
            style={({ pressed }) => pressed && styles.pressed}>
            <Avatar name={name} uri={profile.avatar_url} size="lg" />
            {/* Sin foto, el "+" dice que aquí se pone una, como en Instagram. */}
            {profile.avatar_url ? null : (
              <View style={styles.addBadge}>
                <Ionicons name="add" size={14} color={colors.textInverse} />
              </View>
            )}
          </Pressable>
        ) : (
          <Avatar name={name} uri={profile.avatar_url} size="lg" />
        )}
        <ProfileCounts counts={counts} loading={countsLoading} />
      </View>

      <View style={styles.identity}>
        <View style={styles.nameRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.name}>
            {name}
          </Text>
          {profile.verified ? (
            <View style={styles.verified} accessibilityLabel="Verificado">
              <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
              <Text variant="micro" color="accent">
                Verificado
              </Text>
            </View>
          ) : null}
        </View>

        {profile.bio ? <Text variant="body">{profile.bio}</Text> : null}

        <View style={styles.meta}>
          {profile.location ? (
            // Con nombre accesible propio: el icono y el texto son dos nodos
            // y un lector de pantalla los lee como fragmentos sueltos.
            <View style={styles.metaItem} accessibilityLabel={`Ubicación: ${profile.location}`}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary">
                {profile.location}
              </Text>
            </View>
          ) : null}

          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
            <Text variant="caption" color="textSecondary">
              {joinedLabel(profile.created_at)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Barra de arriba del perfil: el @usuario como título, como en Instagram, con
 * hueco para volver a la izquierda y para una acción a la derecha.
 */
export function ProfileTopBar({
  username,
  left,
  right,
}: {
  username: string;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <View style={styles.bar}>
      {left}
      <Text variant="subtitle" numberOfLines={1} accessibilityRole="header" style={styles.barTitle}>
        @{username}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  addBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: screenPadding,
    backgroundColor: colors.surface,
  },
  barTitle: {
    flex: 1,
  },
  body: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
    gap: spacing.md,
    backgroundColor: colors.surface,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
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
    gap: 2,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.lg,
    rowGap: spacing.xs,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
