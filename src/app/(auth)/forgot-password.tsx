import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { spacing } from '@/theme';

/**
 * Segundos de espera antes de poder reenviar. Supabase rechaza un segundo envío
 * a la misma dirección antes de un minuto, y el servidor de correo del plan
 * gratuito solo manda unos pocos por hora: reenviar sin pausa solo gasta ese
 * cupo.
 */
const RESEND_COOLDOWN_S = 60;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { requestPasswordReset } = useAuth();
  const [cooldown, setCooldown] = useState(0);

  // Cuenta atrás del reenvío. El `setState` va en el temporizador, no en el
  // cuerpo del efecto.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

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

    const result = await requestPasswordReset(email, pathname);

    if (result.error) {
      setError(result.error);
    } else {
      setSentTo(email.trim());
      setCooldown(RESEND_COOLDOWN_S);
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
              {`Si hay una cuenta asociada a ${sentTo}, recibirás un enlace para elegir una contraseña nueva. Caduca en una hora.`}
            </Callout>

            <View style={styles.tips}>
              <Text variant="caption" color="textSecondary">
                Si no llega en unos minutos, revisa la carpeta de spam. El reenvío tiene un límite por
                hora: si pides muchos seguidos, dejan de salir.
              </Text>
              <Text variant="caption" color="textSecondary">
                Abre el enlace en este mismo navegador: el enlace solo funciona donde lo pediste.
              </Text>
            </View>

            {error ? <Callout tone="error">{error}</Callout> : null}

            <Button
              label={cooldown > 0 ? `Reenviar en ${cooldown} s` : 'Reenviar el email'}
              variant="secondary"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={cooldown > 0 || submitting}
              onPress={handleSubmit}
            />
            <Button label="Volver a iniciar sesión" variant="ghost" fullWidth onPress={() => router.replace('/login')} />
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
  tips: {
    gap: spacing.sm,
  },
  form: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
});
