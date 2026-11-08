import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabBar } from '@/components/navigation/tab-bar';
import { NotFoundState } from '@/components/ui/not-found-state';
import { colors } from '@/theme';

/**
 * Ruta inexistente (F5.0). Sin este archivo, expo-router pintaba su pantalla
 * negra en inglés ("Unmatched Route · Sitemap"), que es lo que ve quien abre un
 * enlace mal copiado: la peor primera impresión posible.
 */
export default function NotFoundScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <NotFoundState
        title="Esta página no existe"
        detail="Puede que el enlace esté incompleto o que lo que buscabas ya no esté aquí."
      />
      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
