import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { spacing } from '@/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const result = await signIn(email, password);

    // Si funciona, el guard del layout raíz cambia de grupo solo: no hay que
    // navegar a ninguna parte desde aquí.
    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  return (
    <Screen background="surface" avoidKeyboard>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="display">Iniciar sesión</Text>
          <Text variant="body" color="textSecondary">
            Vuelve a tu entorno.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setError(null);
            }}
            placeholder="tu@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
            returnKeyType="next"
          />

          <TextField
            label="Contraseña"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setError(null);
            }}
            placeholder="Tu contraseña"
            password
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          <Pressable
            onPress={() => router.push('/forgot-password')}
            accessibilityRole="link"
            style={styles.forgot}>
            <Text variant="label" color="accent">
              ¿Olvidaste tu contraseña?
            </Text>
          </Pressable>

          {error ? <Callout tone="error">{error}</Callout> : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Entrar"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />

          <View style={styles.switchRow}>
            <Text variant="caption" color="textSecondary">
              ¿Todavía no tienes cuenta?
            </Text>
            <Pressable onPress={() => router.replace('/register')} accessibilityRole="link">
              <Text variant="label" color="accent">
                Crear cuenta
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.xl,
    paddingTop: spacing.xl,
  },
  header: {
    gap: spacing.xs,
  },
  form: {
    gap: spacing.lg,
  },
  forgot: {
    alignSelf: 'flex-start',
  },
  actions: {
    gap: spacing.lg,
    paddingTop: spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
