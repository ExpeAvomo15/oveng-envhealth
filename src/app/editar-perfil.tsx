import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { pickAvatarImage, uploadAvatar } from '@/lib/avatars';
import { profileName, updateProfile } from '@/lib/profiles';
import { colors, radius, spacing } from '@/theme';

const BIO_MAX_LENGTH = 160;

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) {
    return (
      <Screen background="surface">
        <View style={styles.centeredFill}>
          <Text variant="body" color="textSecondary">
            Cargando tu perfil…
          </Text>
        </View>
      </Screen>
    );
  }

  const bioTooLong = bio.length > BIO_MAX_LENGTH;
  const nameEmpty = displayName.trim().length === 0;
  const canSave = !nameEmpty && !bioTooLong && !saving && !uploading;

  async function handlePickAvatar() {
    if (!profile) return;

    setError(null);
    setUploading(true);

    try {
      const image = await pickAvatarImage();
      if (!image) return;

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
    if (!profile || !canSave) return;

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
        <View style={styles.avatarWrap}>
          <Avatar name={profileName(profile)} uri={avatarUrl} size="xl" />
          {uploading ? (
            <View style={styles.avatarOverlay}>
              <ActivityIndicator color={colors.textInverse} />
            </View>
          ) : null}
        </View>

        <Button
          label={uploading ? 'Subiendo…' : 'Cambiar foto'}
          variant="ghost"
          onPress={handlePickAvatar}
          disabled={uploading || saving}
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
          multiline
          numberOfLines={3}
          error={bioTooLong ? `Te pasas por ${bio.length - BIO_MAX_LENGTH} caracteres.` : null}
          hint={bioTooLong ? null : `${bio.length}/${BIO_MAX_LENGTH}`}
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
  avatarBlock: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
  avatarWrap: {
    borderRadius: radius.full,
    overflow: 'hidden',
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
