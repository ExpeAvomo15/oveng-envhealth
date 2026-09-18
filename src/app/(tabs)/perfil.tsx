import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Callout, Card, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { spacing } from '@/theme';

/**
 * Perfil — cabecera mínima y cierre de sesión. El perfil completo (edición,
 * seguidores, publicaciones, tipo de cuenta) es F1.3.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, profile, profileLoading, signOut } = useAuth();

  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    setError(null);

    const result = await signOut();

    // Si funciona, el guard del layout raíz vuelve a (auth) solo.
    if (result.error) {
      setError(result.error);
      setSigningOut(false);
    }
  }

  const name = profile?.display_name ?? profile?.username ?? user?.email ?? 'Tu cuenta';

  return (
    <Screen>
      <View style={styles.container}>
        <Card>
          <View style={styles.identity}>
            <Avatar name={name} uri={profile?.avatar_url} size="lg" />

            <View style={styles.identityText}>
              <Text variant="title">{name}</Text>
              {profile ? (
                <Text variant="body" color="textSecondary">
                  @{profile.username}
                </Text>
              ) : (
                <Text variant="body" color="textSecondary">
                  {profileLoading ? 'Cargando perfil…' : 'Sin perfil'}
                </Text>
              )}
            </View>

            {profile?.verified ? <Badge label="Verificada" tone="accent" /> : null}
          </View>

          {profile?.bio ? (
            <>
              <View style={styles.gap} />
              <Text variant="body">{profile.bio}</Text>
            </>
          ) : null}
        </Card>

        {!profileLoading && !profile ? (
          <Callout tone="error" title="No hay perfil para esta cuenta">
            La sesión existe pero `profiles` no tiene su fila. Suele significar que las migraciones
            de F0.3 no están aplicadas o que el trigger on_auth_user_created falló.
          </Callout>
        ) : null}

        <Text variant="caption" color="textSecondary">
          La edición del perfil, seguidores y publicaciones llegan en F1.3.
        </Text>

        {error ? <Callout tone="error">{error}</Callout> : null}

        <View style={styles.actions}>
          <Button
            label="Cerrar sesión"
            variant="secondary"
            size="lg"
            fullWidth
            loading={signingOut}
            onPress={handleSignOut}
          />
          <Button
            label="Ver el design system"
            variant="ghost"
            fullWidth
            onPress={() => router.push('/design-system')}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
    paddingTop: spacing.xl,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
  },
  gap: {
    height: spacing.md,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
});
