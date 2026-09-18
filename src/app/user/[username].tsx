import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

type PublicProfileData = {
  username: string;
  profile: Profile | null;
  counts: Counts;
  following: boolean;
};

/** Todo lo que hace falta para pintar un perfil ajeno, en una sola llamada. */
async function loadPublicProfile(
  username: string,
  viewerId: string | null,
): Promise<PublicProfileData> {
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return { username, profile: null, counts: EMPTY_COUNTS, following: false };
  }

  const [counts, following] = await Promise.all([
    getProfileCounts(profile.id),
    viewerId && viewerId !== profile.id
      ? isFollowing(viewerId, profile.id)
      : Promise.resolve(false),
  ]);

  return { username, profile, counts, following };
}

/** Perfil público de otra cuenta. El propio vive en la pestaña Perfil. */
export default function PublicProfileScreen() {
  const router = useRouter();
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: viewer } = useAuth();

  /**
   * Todo lo que describe el perfil visitado, junto al nombre de usuario al que
   * pertenece: así `loading` se deriva de que aún no haya datos para el actual,
   * y cambiar de perfil no necesita limpiar cuatro estados a mano.
   */
  const [loaded, setLoaded] = useState<PublicProfileData | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ProfileTab>('publicaciones');

  const viewerId = viewer?.id ?? null;
  const current = loaded?.username === username ? loaded : null;

  const profile = current?.profile ?? null;
  const counts = current?.counts ?? EMPTY_COUNTS;
  const following = current?.following ?? false;
  const loading = current === null;
  const notFound = current !== null && current.profile === null;
  const isOwnProfile = profile !== null && profile.id === viewerId;

  useEffect(() => {
    if (!username) return;

    let active = true;

    // La carga es una función pura que devuelve datos; el `setState` vive en el
    // callback de la promesa. Mezclarlos dentro del efecto dispara renders en
    // cascada.
    loadPublicProfile(username, viewerId)
      .then((data) => {
        if (active) setLoaded(data);
      })
      .catch(() => {
        if (!active) return;
        setError('No se ha podido cargar el perfil.');
        setLoaded({ username, profile: null, counts: EMPTY_COUNTS, following: false });
      });

    return () => {
      active = false;
    };
  }, [username, viewerId]);

  /**
   * Seguir y dejar de seguir se pintan al instante y se corrigen si el servidor
   * dice otra cosa: esperar a la red para mover un botón se nota mucho.
   */
  async function toggleFollow() {
    if (!profile || !viewerId || busy) return;

    const next = !following;
    setBusy(true);
    setError(null);

    const optimistic = {
      followers: Math.max(0, counts.followers + (next ? 1 : -1)),
    };
    setLoaded((previous) =>
      previous === null
        ? previous
        : { ...previous, following: next, counts: { ...previous.counts, ...optimistic } },
    );

    try {
      if (next) {
        await followUser(viewerId, profile.id);
      } else {
        await unfollowUser(viewerId, profile.id);
      }

      // La verdad la tiene la base de datos, no el estado optimista.
      const confirmed = await getProfileCounts(profile.id);
      setLoaded((previous) =>
        previous === null ? previous : { ...previous, counts: confirmed },
      );
    } catch {
      setLoaded((previous) =>
        previous === null
          ? previous
          : {
              ...previous,
              following: !next,
              counts: {
                ...previous.counts,
                followers: Math.max(0, previous.counts.followers + (next ? -1 : 1)),
              },
            },
      );
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
