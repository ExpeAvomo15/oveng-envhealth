import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

export type ImpactCardProps = {
  icon: 'leaf' | 'star';
  title: string;
  /** Valor destacado. Hoy son marcadores; en F2 llegan de la base de datos. */
  value: string;
  note: string;
  /**
   * Acento de la tarjeta. En los mockups la huella va en verde y los puntos en
   * amarillo: cada métrica tiene su color, no todas el del producto.
   */
  tone?: 'accent' | 'warning';
};

/**
 * Tarjeta de métrica del perfil.
 *
 * Recibe los valores por props a propósito: la huella ecológica y los puntos se
 * calculan en F2, y cuando lleguen solo cambia quién los pasa, no esto.
 */
export function ImpactCard({ icon, title, value, note, tone = 'accent' }: ImpactCardProps) {
  const accent = tone === 'warning' ? colors.warningText : colors.accent;
  const background = tone === 'warning' ? colors.warningTint : colors.accentTint;

  return (
    <View style={[styles.card, { backgroundColor: background }]}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={22} color={accent} />
      </View>

      <View style={styles.text}>
        {/*
          Dos líneas fijas: sin esto, un título que cabe en una línea y otro que
          ocupa dos dejan los valores de las tarjetas a distinta altura.
        */}
        <Text variant="caption" color="textSecondary" numberOfLines={2} style={styles.title}>
          {title}
        </Text>
        <Text variant="title">{value}</Text>
        <Text variant="caption" color="textSecondary">
          {note}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    gap: spacing.xs,
  },
  title: {
    minHeight: 40,
  },
});
