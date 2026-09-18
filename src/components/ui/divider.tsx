import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

/** Separador hairline. Entre filas de una lista o secciones de una card. */
export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
