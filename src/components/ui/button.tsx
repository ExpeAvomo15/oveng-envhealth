import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
/**
 * `sm` es el botón de una fila de lista —Seguir en una ficha de resultado—,
 * donde el de `md` se come el ancho del nombre. Los mockups lo pintan así en la
 * pantalla de Buscar.
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = {
  label: string;
  onPress?: () => void;
  /** `primary` verde sólido · `secondary` contorno · `ghost` sin fondo. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  /** Icono delante del texto, para que la acción se reconozca sin leer. */
  icon?: ComponentProps<typeof Ionicons>['name'];
  style?: ViewStyle;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const isInactive = disabled || loading;
  const labelColor = isInactive ? 'textMuted' : variant === 'primary' ? 'textInverse' : 'accent';
  // El texto acompaña al tamaño: un bodyStrong dentro de un botón compacto lo
  // obliga a crecer y deja de ser compacto.
  const labelVariant = size === 'sm' ? 'label' : 'bodyStrong';

  return (
    <Pressable
      onPress={onPress}
      disabled={isInactive}
      accessibilityRole="button"
      // El nombre es el texto: el glifo del icono no debe leerse.
      accessibilityLabel={icon ? label : undefined}
      accessibilityState={{ disabled: isInactive, busy: loading }}
      style={({ pressed }) => [
        styles.base,
        styles[size],
        styles[variant],
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        pressed && !isInactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' ? colors.textInverse : colors.accent}
        />
      ) : (
        <View style={styles.labelWrap}>
          {icon ? (
            <Ionicons
              name={icon}
              size={size === 'sm' ? 16 : 18}
              color={isInactive ? colors.textMuted : variant === 'primary' ? colors.textInverse : colors.accent}
            />
          ) : null}
          <Text variant={labelVariant} color={labelColor} numberOfLines={1}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    // Píldora: es la forma del botón primario en los mockups.
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  labelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  // Tamaños
  sm: {
    minHeight: 34,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  md: {
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },

  // Variantes
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  // Estados
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.8,
  },
  inactive: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
  },
});

