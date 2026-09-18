import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radius, shadows, spacing } from '@/theme';

import { Text } from './text';

/**
 * Aviso breve y efímero.
 *
 * Se dispara desde cualquier sitio con `showToast()` y lo pinta un único
 * `<ToastHost />` montado en el layout raíz: así no hay dos avisos superpuestos
 * ni cada pantalla tiene que llevar el suyo.
 */

let notify: ((message: string) => void) | null = null;

export function showToast(message: string): void {
  notify?.(message);
}

const VISIBLE_MS = 2600;

export function ToastHost() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    notify = setMessage;
    return () => {
      notify = null;
    };
  }, []);

  useEffect(() => {
    if (message === null) return;

    const timer = setTimeout(() => setMessage(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (message === null) return null;

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View style={styles.toast} accessibilityLiveRegion="polite">
        <Text variant="caption" color="textInverse">
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  toast: {
    maxWidth: 420,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.text,
    ...shadows.floating,
  },
});
