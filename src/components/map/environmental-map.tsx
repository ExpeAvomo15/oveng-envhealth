import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

import type { EnvironmentalMapProps } from './types';

/**
 * Mapa en nativo — **marcador de posición a propósito**.
 *
 * F2.3 se construyó con MapLibre GL JS, que es una librería de navegador. La
 * demo se sirve en web (GitHub Pages), así que el mapa real vive en
 * `environmental-map.web.tsx` y aquí queda una pantalla honesta en vez de una
 * caída: en nativo haría falta `@maplibre/maplibre-react-native` o
 * `react-native-maps`, que es una tarea propia y está anotada en el plan.
 *
 * Metro elige el archivo por la extensión: `.web.tsx` en web, este en iOS y
 * Android. Ninguna pantalla tiene que saber en cuál está.
 */
export function EnvironmentalMap(_props: EnvironmentalMapProps) {
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="map-outline" size={32} color={colors.accent} />
      </View>

      <Text variant="subtitle" style={styles.centered}>
        Mapa disponible en la versión web de la demo
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.centered}>
        El mapa ambiental se construyó con MapLibre GL JS. La versión nativa
        llegará después de la demo; mientras tanto, las entidades se exploran
        desde Buscar.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    backgroundColor: colors.surfaceMuted,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
});
