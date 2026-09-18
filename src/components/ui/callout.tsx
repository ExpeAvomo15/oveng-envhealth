import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing, type ColorToken } from '@/theme';

import { Text } from './text';

export type CalloutTone = 'error' | 'info' | 'success';

const tones: Record<CalloutTone, { background: ColorToken; border: ColorToken }> = {
  // El amarillo de aviso, no el rojo: no hay rojo en la paleta y el mensaje
  // acompaña siempre al campo que falla, así que no depende del color.
  error: { background: 'warningTint', border: 'warning' },
  info: { background: 'infoTint', border: 'info' },
  success: { background: 'accentTint', border: 'accent' },
};

export type CalloutProps = {
  children: string;
  tone?: CalloutTone;
  /** Título opcional en negrita sobre el mensaje. */
  title?: string;
};

/** Mensaje destacado: error de formulario, confirmación, aviso. */
export function Callout({ children, tone = 'info', title }: CalloutProps) {
  const { background, border } = tones[tone];

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.callout,
        { backgroundColor: colors[background], borderColor: colors[border] },
      ]}>
      {title ? <Text variant="bodyStrong">{title}</Text> : null}
      <Text variant="caption">{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  callout: {
    gap: spacing.xs,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    padding: spacing.md,
  },
});
