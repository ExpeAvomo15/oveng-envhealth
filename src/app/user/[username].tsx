import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ProfileCounts, ProfileHeader, ProfileTabs, type ProfileTab } from '@/components/profile';
import { Button, Callout, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import type { Profile } from '@/lib/database.types';
import {
  EMPTY_COUNTS,
  followUser,
  getProfileByUsername,
  getProfileCounts,
  isFollowing,
  unfollowUser,
  type ProfileCounts as Counts,
} from '@/lib/profiles';
import { colors, radius, screenPadding, spacing } from '@/theme';

/** Perfil público de otra cuenta. El propio vive en la pestaña Perfil. */
export default function PublicProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: viewer } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('publicaciones');

  const viewerId = viewer?.id ?? null;
  const isOwnProfile = profile !== null && profile.id === viewerId;

  const load = useCallback(async () => {
    if (!username) return;

    setLoading(true);
    setNotFound(false);

    try {
      const found = await getProfileByUsername(username);

      if (!found) {
        setNotFound(true);
        return;
      }

      setProfile(found);

      const [nextCounts, nextFollowing] = await Promise.all([
        getProfileCounts(found.id),
        viewerId && viewerId !== found.id ? isFollowing(viewerId, found.id) : Promise.resolve(false),
      ]);

      setCounts(nextCounts);
      setFollowing(nextFollowing);
    } catch {
      setError('No se ha podido cargar el perfil.');
    } finally {
      setLoading(false);
    }
  }, [username, viewerId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Seguir y dejar de seguir se pintan al instante y se corrigen si el servidor
   * dice otra cosa: esperar a la red para mover un botón se nota mucho.
   */
  async function toggleFollow() {
    if (!profile || !viewerId || busy) return;

    const next = !following;
    setBusy(true);
    setError(null);
    setFollowing(next);
    setCounts((current) => ({
      ...current,
      followers: Math.max(0, current.followers + (next ? 1 : -1)),
    }));

    try {
      if (next) {
        await followUser(viewerId, profile.id);
      } else {
        await unfollowUser(viewerId, profile.id);
      }

      // La verdad la tiene la base de datos, no el estado optimista.
      setCounts(await getProfileCounts(profile.id));
    } catch {
      setFollowing(!next);
      setCounts((current) => ({
        ...current,
        followers: Math.max(0, current.followers + (next ? -1 : 1)),
      }));
      setError(next ? 'No se ha podido seguir la cuenta.' : 'No se ha podido dejar de seguir.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Screen scroll={false}>
        <View style={styles.centeredFill}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (notFound || !profile) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text variant="title">Esa cuenta no existe</Text>
          <Text variant="body" color="textSecondary">
            No hay ningún perfil con el nombre @{username}.
          </Text>
          <Button label="Volver" variant="secondary" onPress={() => router.back()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.backRow}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
      </View>

      <ProfileHeader profile={profile} />

      <View style={styles.actions}>
        {isOwnProfile ? (
          <Button
            label="Editar perfil"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/editar-perfil')}
          />
        ) : (
          <Button
            label={following ? 'Siguiendo' : 'Seguir'}
            variant={following ? 'secondary' : 'primary'}
            fullWidth
            loading={busy}
            onPress={toggleFollow}
          />
        )}
      </View>

      {error ? (
        <View style={styles.inset}>
          <Callout tone="error">{error}</Callout>
        </View>
      ) : null}

      <ProfileCounts counts={counts} />

      <ProfileTabs active={tab} onChange={setTab} />

      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name={tab === 'publicaciones' ? 'document-text-outline' : 'bookmark-outline'}
            size={28}
            color={colors.accent}
          />
        </View>
        <Text variant="subtitle" style={styles.centered}>
          {tab === 'publicaciones' ? 'Todavía no hay publicaciones' : 'Guardados'}
        </Text>
        <Text variant="caption" color="textSecondary" style={styles.centered}>
          {tab === 'publicaciones'
            ? 'Cuando esta cuenta publique, lo verás aquí.'
            : 'Los guardados de otras cuentas son privados.'}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.md,
  },
  backRow: {
    position: 'absolute',
    top: spacing.md,
    left: screenPadding,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  actions: {
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.lg,
  },
  inset: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
    paddingHorizontal: screenPadding,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
});
