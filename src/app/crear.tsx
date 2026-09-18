import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Avatar, Button, Callout, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { refreshFeed } from '@/hooks/use-feed';
import { parseHashtags } from '@/lib/hashtags';
import {
  createPost,
  pickPostImage,
  POST_COUNTER_THRESHOLD,
  POST_MAX_LENGTH,
  uploadPostImage,
  type PickedImage,
} from '@/lib/posts';
import { profileName } from '@/lib/profiles';
import {
  colors,
  fontFamily,
  noWebFocusRing,
  radius,
  spacing,
  typography,
  type ColorToken,
} from '@/theme';

/** Margen de caracteres a partir del cual el contador pasa de gris a ámbar. */
const AMBER_MARGIN = 40;
const INPUT_MIN_HEIGHT = 140;

export default function CreatePostScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [content, setContent] = useState('');
  const [inputHeight, setInputHeight] = useState(INPUT_MIN_HEIGHT);
  const inputRef = useRef<TextInput>(null);
  const [image, setImage] = useState<PickedImage | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Crecimiento del campo con el texto.
   *
   * En nativo lo resuelve `onContentSizeChange`. En web no: react-native-web
   * renderiza un `<textarea>` y ese evento no informa del alto real —medido,
   * se quedaba en 140 px con cinco líneas dentro—. Ahí se mide el nodo: se
   * suelta el alto, se lee `scrollHeight` y se vuelve a fijar.
   */
  function growToFitOnWeb() {
    if (Platform.OS !== 'web') return;

    const node = inputRef.current as unknown as HTMLTextAreaElement | null;
    if (!node?.style) return;

    node.style.height = 'auto';
    const next = Math.max(INPUT_MIN_HEIGHT, node.scrollHeight);
    node.style.height = `${next}px`;
    setInputHeight(next);
  }

  const remaining = POST_MAX_LENGTH - content.length;
  const overLimit = remaining < 0;
  const hashtags = useMemo(() => parseHashtags(content), [content]);

  const canPublish = content.trim().length > 0 && !overLimit && !publishing;

  /**
   * Cierra el modal y aterriza en Inicio.
   *
   * `dismissTo` es lo que cierra de verdad una pantalla presentada como modal;
   * `replace` cambiaba la ruta por debajo y dejaba el modal abierto encima.
   */
  function goToFeed() {
    if (router.canDismiss()) {
      router.dismissTo('/');
    } else {
      router.replace('/');
    }
  }

  function close() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }

  async function handlePickImage() {
    setError(null);
    setImageFailed(false);

    try {
      const picked = await pickPostImage();
      if (picked) {
        setImage(picked);
        setUploadedImageUrl(null);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido abrir la galería.');
    }
  }

  function removeImage() {
    setImage(null);
    setUploadedImageUrl(null);
    setImageFailed(false);
  }

  async function publish({ withoutImage = false } = {}) {
    if (!profile || !canPublish) return;

    setPublishing(true);
    setError(null);
    setImageFailed(false);

    let imageUrl = withoutImage ? null : uploadedImageUrl;

    // La imagen primero: si no sube, no se publica un texto huérfano que el
    // usuario creía que iba con foto.
    if (!withoutImage && image && !imageUrl) {
      try {
        imageUrl = await uploadPostImage(profile.id, image);
        setUploadedImageUrl(imageUrl);
      } catch {
        setImageFailed(true);
        setPublishing(false);
        return;
      }
    }

    try {
      await createPost({ authorId: profile.id, content, imageUrl });
      // F1.5 escuchará esto para recargar el feed.
      refreshFeed();
      goToFeed();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se ha podido publicar. Inténtalo de nuevo.',
      );
      setPublishing(false);
    }
  }

  const counterColor: ColorToken = overLimit
    ? 'danger'
    : remaining <= AMBER_MARGIN
      ? 'warningText'
      : 'textSecondary';

  return (
    <Screen background="surface" scroll={false} avoidKeyboard>
      <View style={styles.header}>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>

        <Text variant="subtitle">Crear publicación</Text>

        <Button
          label="Publicar"
          onPress={() => publish()}
          disabled={!canPublish}
          loading={publishing}
        />
      </View>

      <View style={styles.body}>
        {profile ? (
          <View style={styles.author}>
            <Avatar name={profileName(profile)} uri={profile.avatar_url} size="md" />
            <View>
              <Text variant="bodyStrong">{profileName(profile)}</Text>
              <Text variant="caption" color="textSecondary">
                @{profile.username}
              </Text>
            </View>
          </View>
        ) : null}

        <TextInput
          ref={inputRef}
          value={content}
          onChangeText={(value) => {
            setContent(value);
            setError(null);
            growToFitOnWeb();
          }}
          placeholder="¿Qué está pasando en tu entorno?"
          placeholderTextColor={colors.textMuted}
          multiline
          autoFocus
          // Crece con el texto en vez de hacer scroll dentro de una caja fija.
          onContentSizeChange={(event) =>
            setInputHeight(Math.max(INPUT_MIN_HEIGHT, event.nativeEvent.contentSize.height))
          }
          style={[styles.input, noWebFocusRing, { height: inputHeight }]}
          accessibilityLabel="Texto de la publicación"
        />

        {hashtags.length > 0 ? (
          <View style={styles.hashtags}>
            {hashtags.map((tag) => (
              <View key={tag} style={styles.hashtag}>
                <Text variant="label" color="accent">
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {image ? (
          <View style={styles.preview}>
            <Image source={{ uri: image.uri }} style={styles.previewImage} contentFit="cover" />
            <Pressable
              onPress={removeImage}
              accessibilityRole="button"
              accessibilityLabel="Quitar imagen"
              style={({ pressed }) => [styles.removeImage, pressed && styles.pressed]}>
              <Ionicons name="close" size={18} color={colors.textInverse} />
            </Pressable>
          </View>
        ) : null}

        {imageFailed ? (
          <View style={styles.recovery}>
            <Callout tone="error" title="La imagen no se ha podido subir">
              El texto no se ha publicado todavía. Puedes reintentarlo o publicar sin la imagen.
            </Callout>
            <View style={styles.recoveryActions}>
              <Button label="Reintentar" variant="secondary" onPress={() => publish()} />
              <Button
                label="Publicar sin imagen"
                variant="ghost"
                onPress={() => publish({ withoutImage: true })}
              />
            </View>
          </View>
        ) : null}

        {error ? <Callout tone="error">{error}</Callout> : null}
      </View>

      <View style={styles.footer}>
        <Pressable
          onPress={handlePickImage}
          disabled={publishing}
          accessibilityRole="button"
          accessibilityLabel="Añadir imagen"
          style={({ pressed }) => [styles.attach, pressed && styles.pressed]}>
          {publishing && image && !uploadedImageUrl ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <Ionicons name="image-outline" size={22} color={colors.accent} />
          )}
          <Text variant="label" color="accent">
            {image ? 'Cambiar imagen' : 'Añadir imagen'}
          </Text>
        </Pressable>

        {content.length >= POST_COUNTER_THRESHOLD ? (
          <Text variant="label" color={counterColor}>
            {remaining}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconButton: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  author: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  input: {
    color: colors.text,
    fontFamily: fontFamily.sans,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlignVertical: 'top',
  },
  hashtags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hashtag: {
    borderRadius: radius.sm,
    backgroundColor: colors.accentTint,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  preview: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 220,
    backgroundColor: colors.surfaceMuted,
  },
  removeImage: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recovery: {
    gap: spacing.sm,
  },
  recoveryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  attach: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
