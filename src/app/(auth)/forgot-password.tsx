import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { spacing } from '@/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit = emailLooksValid && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);

    const result = await requestPasswordReset(email);

    if (result.error) {
      setError(result.error);
    } else {
      setSentTo(email.trim());
    }

    setSubmitting(false);
  }

  return (
    <Screen background="surface" avoidKeyboard>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="display">Recuperar contraseña</Text>
          <Text variant="body" color="textSecondary">
            Te enviamos un enlace para que elijas una nueva.
          </Text>
        </View>

        {sentTo ? (
          <>
            <Callout tone="success" title="Email enviado">
              {`Si hay una cuenta asociada a ${sentTo}, recibirás un enlace para restablecer la contraseña. El enlace caduca en una hora.`}
            </Callout>

            <Text variant="caption" color="textSecondary">
              Si no llega en unos minutos, revisa la carpeta de spam y comprueba que la dirección
              es la correcta.
            </Text>

            <Button label="Volver a iniciar sesión" size="lg" fullWidth onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
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
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />

              {error ? <Callout tone="error">{error}</Callout> : null}
            </View>

            <View style={styles.actions}>
              <Button
                label="Enviar enlace"
                size="lg"
                fullWidth
                loading={submitting}
                disabled={!canSubmit}
                onPress={handleSubmit}
              />
              <Button label="Volver" variant="ghost" fullWidth onPress={() => router.back()} />
            </View>
          </>
        )}
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
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
