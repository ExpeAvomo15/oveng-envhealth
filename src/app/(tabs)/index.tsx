import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { HomeHeader } from '@/components/navigation/home-header';
import { Screen, Text } from '@/components/ui';
import { colors, radius, screenPadding, spacing } from '@/theme';

/** Inicio — el feed. El contenido real llega en F1.5. */
export default function HomeScreen() {
  return (
    <Screen padded={false} scroll={false}>
      <HomeHeader />

      <View style={styles.empty}>
        <View style={styles.illustration}>
          <Ionicons name="leaf-outline" size={40} color={colors.accent} />
        </View>

        <Text variant="title" style={styles.centered}>
          Tu feed aparecerá aquí
        </Text>
        <Text variant="body" color="textSecondary" style={styles.centered}>
          Cuando sigas a personas, empresas e iniciativas, sus publicaciones se verán en esta
          pantalla.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
  },
  illustration: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  centered: {
    textAlign: 'center',
  },
});
