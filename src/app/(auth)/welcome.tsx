import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Logo } from '@/components/brand/logo';
import { Button, Screen, Text } from '@/components/ui';
import { spacing } from '@/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <Screen background="surface" scroll={false} center>
      <View style={styles.hero}>
        <Logo />
        <Text variant="title" style={styles.claim}>
          Tu entorno. Tu salud. Nuestro planeta.
        </Text>
        <Text variant="body" color="textSecondary" style={styles.claim}>
          Conecta con personas, empresas e iniciativas que cuidan el entorno donde vives.
        </Text>
      </View>

      <View style={styles.actions}>
        <Button label="Crear cuenta" fullWidth size="lg" onPress={() => router.push('/register')} />
        <Button
          label="Iniciar sesión"
          variant="secondary"
          fullWidth
          size="lg"
          onPress={() => router.push('/login')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  claim: {
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
});
