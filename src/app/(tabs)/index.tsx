import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Callout, Card, Divider, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { spacing } from '@/theme';

/**
 * Placeholder de la zona con sesión. **F1.2 lo sustituye** por el feed.
 * Existe para poder comprobar el ciclo completo: registro, sesión persistente
 * y cierre de sesión.
 */
export default function HomePlaceholderScreen() {
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
        <View style={styles.header}>
          <Text variant="display">Sesión iniciada</Text>
          <Text variant="caption" color="textSecondary">
            Pantalla provisional de F1.1. El feed llega en F1.2.
          </Text>
        </View>

        <Card>
          <View style={styles.identity}>
            <Avatar name={name} uri={profile?.avatar_url} size="lg" />
            <View style={styles.identityText}>
              <Text variant="subtitle">{name}</Text>
              {profile ? (
                <Text variant="caption" color="textSecondary">
                  @{profile.username}
                </Text>
              ) : null}
            </View>
            {profile?.verified ? <Badge label="Verificada" tone="accent" /> : null}
          </View>

          <View style={styles.gap} />
          <Divider />
          <View style={styles.gap} />

          <Text variant="caption" color="textSecondary">
            Email
          </Text>
          <Text variant="body">{user?.email ?? '—'}</Text>

          <View style={styles.gap} />

          <Text variant="caption" color="textSecondary">
            Perfil en la base de datos
          </Text>
          <Text variant="body">
            {profileLoading
              ? 'Cargando…'
              : profile
                ? `Creado el ${new Date(profile.created_at).toLocaleDateString('es-ES')}`
                : 'No encontrado'}
          </Text>
        </Card>

        {!profileLoading && !profile ? (
          <Callout tone="error" title="No hay perfil para esta cuenta">
            La sesión existe pero `profiles` no tiene su fila. Suele significar que las migraciones
            de F0.3 no están aplicadas o que el trigger on_auth_user_created falló.
          </Callout>
        ) : null}

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
  header: {
    gap: spacing.xs,
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
