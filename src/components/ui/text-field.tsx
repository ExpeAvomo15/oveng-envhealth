import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { colors, fontFamily, radius, spacing, typography } from '@/theme';

import { Text } from './text';

export type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  /** Mensaje de error. Si está presente, el campo se marca y el hint se oculta. */
  error?: string | null;
  /** Ayuda bajo el campo: formato esperado, disponibilidad, etc. */
  hint?: string | null;
  /** Campo de contraseña: arranca oculto y muestra el botón de mostrar/ocultar. */
  password?: boolean;
  /** Muestra un indicador de actividad dentro del campo (comprobaciones en curso). */
  busy?: boolean;
};

/** Campo de texto del design system. Toda entrada de la app pasa por aquí. */
export function TextField({
  label,
  error,
  hint,
  password = false,
  busy = false,
  ...inputProps
}: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const hasError = Boolean(error);

  return (
    <View style={styles.wrapper}>
      <Text variant="label" color={hasError ? 'text' : 'textSecondary'}>
        {label}
      </Text>

      <View
        style={[styles.field, focused && styles.fieldFocused, hasError && styles.fieldError]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={password && !revealed}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...inputProps}
        />

        {busy ? <ActivityIndicator size="small" color={colors.textSecondary} /> : null}

        {password ? (
          <Pressable
            onPress={() => setRevealed((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            hitSlop={spacing.sm}>
            <Text variant="label" color="accent">
              {revealed ? 'Ocultar' : 'Mostrar'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {hasError ? (
        <Text variant="caption" color="text">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  fieldFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  fieldError: {
    borderColor: colors.warning,
    backgroundColor: colors.warningTint,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: fontFamily.sans,
    fontSize: typography.body.fontSize,
    // Sin anillo de foco del navegador: el borde del contenedor ya marca el foco.
    outlineWidth: 0,
  },
});
