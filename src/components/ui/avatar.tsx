import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

import { Text } from './text';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

const sizes: Record<AvatarSize, number> = { sm: 32, md: 44, lg: 72, xl: 96 };

export type AvatarProps = {
  /** Nombre de la cuenta: se usa para las iniciales y para accesibilidad. */
  name: string;
  /** URL de la imagen. Sin ella se muestran las iniciales sobre verde claro. */
  uri?: string | null;
  size?: AvatarSize;
};

/** Iniciales de hasta dos palabras: "Bosque Vivo" → "BV". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = words[0]?.[0] ?? '';
  const second = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : '';
  return (first + second).toUpperCase();
}

export function Avatar({ name, uri, size = 'md' }: AvatarProps) {
  const dimension = sizes[size];
  const shape = { width: dimension, height: dimension, borderRadius: radius.full };

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, shape]}
        contentFit="cover"
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View style={[styles.fallback, shape]} accessible accessibilityLabel={name}>
      <Text variant={size === 'sm' ? 'label' : size === 'md' ? 'subtitle' : 'display'} color="text">
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceMuted,
  },
  fallback: {
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
