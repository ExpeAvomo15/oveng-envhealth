import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import {
  checkUsernameAvailability,
  normalizeUsername,
  validateUsername,
  type UsernameAvailability,
} from '@/lib/usernames';
import { spacing } from '@/theme';

const PASSWORD_MIN_LENGTH = 8;
/** Espera antes de consultar la disponibilidad: no una consulta por tecla. */
const USERNAME_DEBOUNCE_MS = 450;

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [availability, setAvailability] = useState<UsernameAvailability | 'checking' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const usernameProblem = username.length > 0 ? validateUsername(username) : null;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordTooShort = password.length > 0 && password.length < PASSWORD_MIN_LENGTH;

  // --- Disponibilidad del username -----------------------------------------
  // Un contador de petición descarta las respuestas que llegan tarde: sin esto,
  // una consulta lenta de un nombre anterior pisaría el resultado del actual.
  const requestId = useRef(0);

  useEffect(() => {
    if (username.length === 0 || validateUsername(username) !== null) {
      setAvailability(null);
      return;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    setAvailability('checking');

    const timer = setTimeout(async () => {
      const result = await checkUsernameAvailability(username);
      if (requestId.current === currentRequest) {
        setAvailability(result);
      }
    }, USERNAME_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [username]);

  const usernameHint = (() => {
    if (usernameProblem) return null;
    if (availability === 'checking') return 'Comprobando disponibilidad…';
    if (availability === 'available') return `${username} está libre.`;
    if (availability === 'unknown') return 'No se ha podido comprobar la disponibilidad.';
    return 'Minúsculas, números y guion bajo. Es tu nombre público.';
  })();

  const usernameError =
    usernameProblem ?? (availability === 'taken' ? 'Ese nombre de usuario ya está ocupado.' : null);

  const canSubmit =
    emailLooksValid &&
    password.length >= PASSWORD_MIN_LENGTH &&
    validateUsername(username) === null &&
    availability !== 'taken' &&
    availability !== 'checking' &&
    displayName.trim().length > 0 &&
    !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;

    setSubmitting(true);
    setFormError(null);

    const result = await signUp({ email, password, username, displayName });

    if (result.status === 'error') {
      setFormError(result.message);
      setSubmitting(false);
      return;
    }

    if (result.status === 'confirm-email') {
      setConfirmationEmail(result.email);
      setSubmitting(false);
      return;
    }

    // status === 'session': el guard del layout raíz entra solo en (tabs).
  }

  if (confirmationEmail) {
    return (
      <Screen background="surface">
        <View style={styles.container}>
          <View style={styles.header}>
            <Text variant="display">Revisa tu correo</Text>
          </View>

          <Callout tone="success" title="Cuenta creada">
            {`Te hemos enviado un email de confirmación a ${confirmationEmail}. Ábrelo para activar tu cuenta y poder iniciar sesión.`}
          </Callout>

          <Text variant="caption" color="textSecondary">
            Si no aparece en unos minutos, mira en la carpeta de spam.
          </Text>

          <Button
            label="Ir a iniciar sesión"
            size="lg"
            fullWidth
            onPress={() => router.replace('/login')}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen background="surface" avoidKeyboard>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="display">Crear cuenta</Text>
          <Text variant="body" color="textSecondary">
            Únete a quienes cuidan su entorno.
          </Text>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setFormError(null);
            }}
            placeholder="tu@email.com"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
          />

          <TextField
            label="Contraseña"
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              setFormError(null);
            }}
            placeholder="Mínimo 8 caracteres"
            password
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={passwordTooShort ? `Necesita al menos ${PASSWORD_MIN_LENGTH} caracteres.` : null}
            hint={password.length === 0 ? `Al menos ${PASSWORD_MIN_LENGTH} caracteres.` : null}
          />

          <TextField
            label="Nombre de usuario"
            value={username}
            onChangeText={(value) => {
              // Se normaliza al teclear: así nunca se envía algo que la base de
              // datos vaya a rechazar por formato.
              setUsername(normalizeUsername(value));
              setFormError(null);
            }}
            placeholder="bosque_vivo"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            busy={availability === 'checking'}
            error={usernameError}
            hint={usernameHint}
          />

          <TextField
            label="Nombre visible"
            value={displayName}
            onChangeText={(value) => {
              setDisplayName(value);
              setFormError(null);
            }}
            placeholder="Bosque Vivo"
            autoCapitalize="words"
            autoComplete="name"
            hint="Como quieres que te vean las demás cuentas."
          />

          {formError ? <Callout tone="error">{formError}</Callout> : null}
        </View>

        <View style={styles.actions}>
          <Button
            label="Crear cuenta"
            size="lg"
            fullWidth
            loading={submitting}
            disabled={!canSubmit}
            onPress={handleSubmit}
          />

          <View style={styles.switchRow}>
            <Text variant="caption" color="textSecondary">
              ¿Ya tienes cuenta?
            </Text>
            <Pressable onPress={() => router.replace('/login')} accessibilityRole="link">
              <Text variant="label" color="accent">
                Iniciar sesión
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
