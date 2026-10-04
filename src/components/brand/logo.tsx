import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { spacing } from '@/theme';

export type LogoVariant = 'full' | 'mark' | 'inline';

export type LogoProps = {
  /**
   * `full` lockup grande con "EnvHealth" debajo (bienvenida) · `mark` solo la
   * tortuga-O · `inline` el lockup a altura de cabecera.
   */
  variant?: LogoVariant;
};

/**
 * Proporción del lockup oficial (1718 × 465). Se fija aquí en vez de leerla de
 * la imagen para que el hueco tenga su tamaño antes de que cargue y nada salte.
 */
const LOCKUP_RATIO = 1718 / 465;

const INLINE_HEIGHT = 32;
const FULL_HEIGHT = 64;
const MARK_SIZE = 88;

/**
 * Marca de OVENG EnvHealth.
 *
 * Los originales viven en `docs/design/brand/` y son la fuente de verdad; aquí
 * se usan derivados a 3x del tamaño al que se pintan, generados con
 * `npm run brand:derivatives`. El lockup ya dice "OVENG", así que el nombre
 * accesible lo lleva la imagen y no hay texto duplicado.
 */
export function Logo({ variant = 'full' }: LogoProps) {
  if (variant === 'mark') {
    return (
      <Image
        source={require('../../assets/brand/tortuga-verde.png')}
        style={styles.mark}
        contentFit="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel="OVENG"
      />
    );
  }

  if (variant === 'inline') {
    return (
      <Image
        source={require('../../assets/brand/lockup-verde.png')}
        style={styles.inline}
        contentFit="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel="OVENG EnvHealth"
      />
    );
  }

  return (
    <View style={styles.wrapper}>
      <Image
        source={require('../../assets/brand/lockup-verde-lg.png')}
        style={styles.full}
        contentFit="contain"
        accessible
        accessibilityRole="image"
        accessibilityLabel="OVENG"
      />
      <Text variant="subtitle" color="accent">
        EnvHealth
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  inline: {
    height: INLINE_HEIGHT,
    width: INLINE_HEIGHT * LOCKUP_RATIO,
  },
  full: {
    height: FULL_HEIGHT,
    width: FULL_HEIGHT * LOCKUP_RATIO,
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
  },
});
