import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { Button } from './button';
import { Text } from './text';

export type NotFoundStateProps = {
  title: string;
  detail: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

/**
 * "Esto no existe", igual en toda la app (F5.0): una ruta inexistente, una
 * entidad o una cuenta que no están.
 *
 * Siempre con **dos salidas que funcionan en frío**: quien llega por un enlace
 * roto no tiene historial, así que "Volver" a secas no llevaba a ninguna parte.
 * Se vuelve atrás si se puede y, si no, al inicio; y el mapa, que sirve sin
 * cuenta y sin conocer a nadie.
 */
export function NotFoundState({ title, detail, icon = 'compass-outline' }: NotFoundStateProps) {
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={36} color={colors.accent} />
      </View>
      <Text variant="title" style={styles.centered} accessibilityRole="header">
        {title}
      </Text>
      <Text variant="body" color="textSecondary" style={styles.centered}>
        {detail}
      </Text>
      <View style={styles.actions}>
        <Button
          label={router.canGoBack() ? 'Volver' : 'Ir al inicio'}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        />
        <Button label="Explorar el mapa" variant="secondary" onPress={() => router.replace('/mapa')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  centered: {
    textAlign: 'center',
    maxWidth: 420,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
