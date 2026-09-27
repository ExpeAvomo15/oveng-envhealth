import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, environmentalCategories, radius, screenPadding, spacing } from '@/theme';
import type { EnvironmentalCategoryName } from '@/lib/database.types';

export type EntityCoverProps = {
  category: EnvironmentalCategoryName;
  average: number | null;
  count: number;
  onBack: () => void;
  onShare: () => void;
  /** Valorar: es lo que promete la píldora cuando todavía no hay opiniones. */
  onRate: () => void;
};

/**
 * Portada de la ficha.
 *
 * **Es un marcador, no una foto.** `cover_image_url` va nulo en todo el seed
 * —no se enlazan fotos de terceros y no hay activos propios, decidido en
 * F2.1— así que en vez de dejar un hueco gris se usa el color de la categoría
 * en degradado con su icono grande. Cuando lleguen las imágenes, entra aquí un
 * `<Image>` con esto como respaldo.
 *
 * El degradado acaba en negro translúcido, no en otro color: así los botones y
 * la píldora de valoración se leen encima sea cual sea el color de la categoría,
 * sin tener que medir el contraste de las seis por separado.
 */
export function EntityCover({
  category,
  average,
  count,
  onBack,
  onShare,
  onRate,
}: EntityCoverProps) {
  const style = environmentalCategories[category];

  return (
    <View style={styles.cover}>
      <LinearGradient
        colors={[style.color, 'rgba(0,0,0,0.45)']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.fill}
      />

      <Ionicons name={style.icon} size={104} color="rgba(255,255,255,0.28)" style={styles.mark} />

      <View style={styles.topRow}>
        <CoverButton icon="arrow-back" label="Volver" onPress={onBack} />
        <CoverButton icon="share-outline" label="Compartir" onPress={onShare} />
      </View>

      <Pressable
        onPress={onRate}
        accessibilityRole="button"
        accessibilityLabel={
          count === 0
            ? 'Todavía sin valoraciones. Valorar'
            : `Valoración ${average} de 5 con ${count} opiniones. Valorar`
        }
        style={({ pressed }) => [styles.ratingPill, pressed && styles.pressed]}>
        {count === 0 ? (
          <Text variant="label" color="text">
            Sé el primero en valorar
          </Text>
        ) : (
          <>
            <Ionicons name="star" size={13} color={colors.warning} />
            <Text variant="label" color="text">
              {String(average).replace('.', ',')} · {count}{' '}
              {count === 1 ? 'opinión' : 'opiniones'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function CoverButton({
  icon,
  label,
  onPress,
}: {
  icon: 'arrow-back' | 'share-outline';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.coverButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cover: {
    height: 190,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  fill: {
    ...StyleSheet.absoluteFill,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mark: {
    position: 'absolute',
    right: spacing.lg,
    bottom: -spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  coverButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginLeft: screenPadding,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
});
