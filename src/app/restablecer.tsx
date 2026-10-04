import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { spacing } from '@/theme';

const MIN_PASSWORD = 8;

type LinkProblem = { kind: 'expired' | 'other-browser'; detail?: string };

/**
 * Lo que dejó el enlace del email en la URL, leído **una vez** al montar.
 *
 * Con PKCE, el cliente de Supabase canjea el `?code=` al arrancar —antes de que
 * esta pantalla exista— y, si sale bien, **lo borra de la URL** y emite
 * `PASSWORD_RECOVERY`. Así que lo que quede aquí es un problema:
 *
 * - `error_description` / `error_code`: Supabase rechazó el enlace (caducado o
 *   ya usado). Llega en la query o en el hash.
 * - `code` todavía presente: no se pudo canjear. Casi siempre porque el enlace
 *   se abrió en **otro navegador o dispositivo**: el verificador de PKCE vive en
 *   el navegador donde se pidió el email.
 */
function readLinkProblem(): LinkProblem | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const error = params.get('error_description') ?? hash.get('error_description');
  const code = params.get('error_code') ?? hash.get('error_code');
  if (error || code) return { kind: 'expired', detail: error ?? code ?? undefined };
  if (params.get('code')) return { kind: 'other-browser' };
  return null;
}

/**
 * Elegir una contraseña nueva: adonde lleva el enlace del email de
 * recuperación (F4.3).
 *
 * **Ruta pública de primer nivel**, fuera de `(auth)` y de `(tabs)`: se llega
 * sin sesión —el cliente la crea al canjear el enlace— y tiene que seguir
 * existiendo cuando la sesión aparece. Al guardar, la sesión ya está iniciada y
 * se va al feed.
 *
 * También sirve a quien ya tiene sesión y quiere cambiar la contraseña:
 * `updateUser` lo permite igual.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const { session, passwordRecovery, updatePassword } = useAuth();

  const [problem] = useState(readLinkProblem);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = repeat.length > 0 && repeat !== password;
  const canSubmit = password.length >= MIN_PASSWORD && repeat === password && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const result = await updatePassword(password);
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    showToast('Contraseña cambiada. Ya has entrado con la nueva.');
    // Se dice a dónde se va, no se confía en qué ruta queda (ver notas).
    router.replace('/');
  }

  const canChange = passwordRecovery || session !== null;

  return (
    <Screen background="surface" avoidKeyboard>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="display">Nueva contraseña</Text>
          <Text variant="body" color="textSecondary">
            Elige una contraseña nueva para tu cuenta de OVENG.
          </Text>
        </View>

        {canChange ? (
          <>
            <View style={styles.form}>
              <TextField
                label="Contraseña nueva"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError(null);
                }}
                password
                accessibilityLabel="Contraseña nueva"
                autoComplete="new-password"
                textContentType="newPassword"
                hint={`Al menos ${MIN_PASSWORD} caracteres.`}
                error={tooShort ? `Tiene que tener al menos ${MIN_PASSWORD} caracteres.` : null}
              />
              <TextField
                label="Repite la contraseña"
                value={repeat}
                onChangeText={(value) => {
                  setRepeat(value);
                  setError(null);
                }}
                password
                accessibilityLabel="Repite la contraseña"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
                error={mismatch ? 'Las dos contraseñas no coinciden.' : null}
              />

              {error ? <Callout tone="error">{error}</Callout> : null}
            </View>

            <Button
              label="Guardar contraseña"
              size="lg"
              fullWidth
              loading={submitting}
              disabled={!canSubmit}
              onPress={handleSubmit}
            />
          </>
        ) : (
          <>
            <Callout tone="error" title={problem ? 'Este enlace ya no sirve' : 'Falta el enlace'}>
              {problem?.kind === 'expired'
                ? 'El enlace ha caducado o ya se usó. Los enlaces duran una hora y valen una sola vez.'
                : problem?.kind === 'other-browser'
                  ? 'Este enlace se abrió en un navegador distinto del que lo pidió. Pide uno nuevo desde aquí y ábrelo en este mismo navegador.'
                  : 'Para elegir una contraseña nueva, abre el enlace que te enviamos por email.'}
            </Callout>

            <Button
              label="Pedir un enlace nuevo"
              size="lg"
              fullWidth
              onPress={() => router.replace('/forgot-password')}
            />
            <Button label="Ir al inicio" variant="ghost" fullWidth onPress={() => router.replace('/')} />
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
});
