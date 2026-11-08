import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import type { Profile } from '@/lib/database.types';
import { pickAvatarImage, uploadAvatar } from '@/lib/avatars';
import { PROFILE_LIMITS, profileName, updateProfile } from '@/lib/profiles';
import { colors, radius, spacing } from '@/theme';

const BIO_MAX_LENGTH = PROFILE_LIMITS.bio;

export default function EditProfileScreen() {
  const { profile } = useAuth();

  /*
   * Abierta por URL directa, la pantalla se pinta antes de que llegue el
   * perfil. Si el formulario naciera entonces, sus campos se inicializarían
   * vacíos y ya no cambiarían: el nombre salía en blanco con su aviso de
   * error. Así que el formulario solo se monta con el perfil en la mano, y
   * mientras tanto se dice que se está cargando.
   */
  if (!profile) {
    return (
      <Screen background="surface">
        <View style={styles.centeredFill} accessibilityLiveRegion="polite">
          <ActivityIndicator color={colors.accent} />
          <Text variant="body" color="textSecondary">
            Cargando tu perfil…
          </Text>
        </View>
      </Screen>
    );
  }

  // `key`: si cambiara la cuenta, el formulario empieza de nuevo con la suya.
  return <EditProfileForm key={profile.id} profile={profile} />;
}

function EditProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile.display_name ?? '');
  const [bio, setBio] = useState(profile.bio ?? '');
  const [location, setLocation] = useState(profile.location ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bioTooLong = bio.length > BIO_MAX_LENGTH;
  const nameEmpty = displayName.trim().length === 0;
  const canSave = !nameEmpty && !bioTooLong && !saving && !uploading;

  async function handlePickAvatar() {
    if (uploading) return;
    setError(null);

    /*
     * La galería se abre **sin** marcar "Subiendo…" (F5.1). Antes se marcaba
     * antes de abrirla, y en web la app solo se entera de que se cerró sin
     * elegir si el navegador emite `cancel`, que los navegadores integrados
     * (WhatsApp, Instagram) y los iOS antiguos no emiten: el botón se quedaba
     * en "Subiendo…" para siempre y, como Guardar espera a la subida, tampoco
     * se podía guardar la biografía. Ni foto ni bio: lo que reportó el autor.
     */
    let image;
    try {
      image = await pickAvatarImage();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido abrir la galería.');
      return;
    }
    if (!image) return;

    setUploading(true);
    try {
      // Se sube antes de guardar el resto: si falla, no se toca el perfil.
      const url = await uploadAvatar(profile.id, image, avatarUrl);
      await updateProfile(profile.id, { avatar_url: url });
      setAvatarUrl(url);
      await refreshProfile();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `No se ha podido cambiar la foto: ${cause.message}`
          : 'No se ha podido cambiar la foto.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!canSave) return;

    setSaving(true);
    setError(null);

    try {
      await updateProfile(profile.id, {
        display_name: displayName.trim(),
        bio: bio.trim() === '' ? null : bio.trim(),
        location: location.trim() === '' ? null : location.trim(),
      });
      await refreshProfile();
      router.back();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `No se han podido guardar los cambios: ${cause.message}`
          : 'No se han podido guardar los cambios.',
      );
      setSaving(false);
    }
  }

  return (
    <Screen background="surface" avoidKeyboard>
      <View style={styles.header}>
        <Text variant="display">Editar perfil</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.avatarBlock}>
        {/* Tocar la foto también la cambia, como en Instagram (F5.1). */}
        <Pressable
          onPress={handlePickAvatar}
          disabled={uploading || saving}
          accessibilityRole="button"
          accessibilityLabel="Cambiar la foto de perfil"
          style={({ pressed }) => pressed && styles.pressed}>
          <View style={styles.avatarWrap}>
            <Avatar name={profileName(profile)} uri={avatarUrl} size="xl" />
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color={colors.textInverse} />
              </View>
            ) : null}
          </View>
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={colors.textInverse} />
          </View>
        </Pressable>

        <Button
          label={uploading ? 'Subiendo…' : 'Cambiar foto'}
          variant="ghost"
          onPress={handlePickAvatar}
          disabled={uploading || saving}
          style={styles.centerSelf}
        />
      </View>

      <View style={styles.form}>
        <TextField
          label="Nombre visible"
          value={displayName}
          onChangeText={(value) => {
            setDisplayName(value);
            setError(null);
          }}
          placeholder="Tu nombre"
          autoCapitalize="words"
          maxLength={PROFILE_LIMITS.displayName}
          error={nameEmpty ? 'El nombre visible no puede quedar vacío.' : null}
        />

        <TextField
          label="Biografía"
          value={bio}
          onChangeText={(value) => {
            setBio(value);
            setError(null);
          }}
          placeholder="Cuenta en una línea qué te mueve"
          maxLength={BIO_MAX_LENGTH}
          multiline
          numberOfLines={3}
          error={bioTooLong ? `Te pasas por ${bio.length - BIO_MAX_LENGTH} caracteres.` : null}
          hint={bioTooLong ? null : `${bio.length}/${BIO_MAX_LENGTH}`}
          accessibilityHint={`Hasta ${BIO_MAX_LENGTH} caracteres`}
        />

        <TextField
          label="Ubicación"
          value={location}
          onChangeText={(value) => {
            setLocation(value);
            setError(null);
          }}
          placeholder="Dónde vives o dónde actúas"
          autoCapitalize="words"
          maxLength={PROFILE_LIMITS.location}
        />

        <View style={styles.readonly}>
          <Text variant="label" color="textSecondary">
            Nombre de usuario
          </Text>
          <Text variant="body">@{profile.username}</Text>
          <Text variant="caption" color="textSecondary">
            El nombre de usuario no se puede cambiar por ahora.
          </Text>
        </View>

        {error ? <Callout tone="error">{error}</Callout> : null}
      </View>

      <View style={styles.actions}>
        <Button
          label="Guardar cambios"
          size="lg"
          fullWidth
          loading={saving}
          disabled={!canSave}
          onPress={handleSave}
        />
        <Button label="Cancelar" variant="ghost" fullWidth onPress={() => router.back()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centeredFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  close: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  centerSelf: {
    alignSelf: 'center',
  },
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatarWrap: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  cameraBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: spacing.lg,
  },
  readonly: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  actions: {
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
