import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import type { EnvironmentalCategoryName } from '@/lib/database.types';
import { colors, environmentalCategories, radius } from '@/theme';

export type EntityAvatarProps = {
  category: EnvironmentalCategoryName;
  size?: number;
};

/**
 * Marcador circular de una entidad: el color de su categoría con su icono.
 *
 * Es un marcador y no un logo porque **no hay logos**: `cover_image_url` va
 * nulo en todo el seed —no se enlazan fotos de terceros y no hay activos
 * propios— y así quedó anotado en F2.1. Cuando lleguen las imágenes, este
 * componente es el sitio donde entra el `<Image>` con esto como respaldo.
 *
 * El color del icono no se elige: sale de `onColor`, que es el token medido
 * para contrastar sobre el relleno de cada categoría.
 */
export function EntityAvatar({ category, size = 48 }: EntityAvatarProps) {
  const style = environmentalCategories[category];

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, backgroundColor: style.color },
      ]}
      accessibilityLabel={`Categoría ${style.label}`}>
      <Ionicons name={style.icon} size={size * 0.5} color={colors[style.onColor]} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
