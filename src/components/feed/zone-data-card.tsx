import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatReading, metricLabel } from '@/lib/metrics';
import { zones, type ZoneData, type ZoneId } from '@/lib/zones';
import { colors, radius, shadows, spacing } from '@/theme';

export type ZoneDataCardProps = {
  data: ZoneData;
  onChangeZone: (zone: ZoneId) => void;
  onOpenReference: (slug: string) => void;
};

/**
 * "Datos ambientales de tu zona" del mockup 1, dentro del feed.
 *
 * Es la idea que sostiene el producto: el dato ambiental **no vive en un panel
 * aparte**, aparece entre las publicaciones.
 *
 * Dos cosas que el mockup deja implícitas y aquí se dicen:
 *
 * - **La zona se nombra.** El mockup pone "de tu zona", que sin geolocalización
 *   sería una promesa que el producto no cumple. Aquí pone el nombre de la zona
 *   elegida, y se puede cambiar desde el propio título.
 * - **De dónde sale el dato.** Un índice de aire sin lugar no significa nada,
 *   así que la tarjeta dice qué lugar lo mide y llevar ahí es un toque.
 *
 * Cuando la zona no tiene mediciones —hoy Málaga, que tiene dos entidades y
 * ninguna medición— la tarjeta **lo dice y se queda**, en vez de desaparecer:
 * si se fuera, se iría con ella el selector y no habría forma de volver a
 * cambiar de zona desde el feed.
 */
export function ZoneDataCard({ data, onChangeZone, onOpenReference }: ZoneDataCardProps) {
  const [picking, setPicking] = useState(false);
  const { zone, reference, air, secondary } = data;

  const openReference = () => {
    if (reference) onOpenReference(reference.slug);
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.icon}>
          <Ionicons name="leaf" size={18} color={colors.accent} />
        </View>

        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel={`Zona: ${zone.name}. Cambiar de zona`}
          style={({ pressed }) => [styles.zoneButton, pressed && styles.pressed]}>
          <Text variant="label" color="textSecondary">
            Datos ambientales de
          </Text>
          <View style={styles.zoneRow}>
            <Text variant="bodyStrong" numberOfLines={1}>
              {zone.name}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => setPicking(true)}
          accessibilityRole="button"
          accessibilityLabel="Opciones de la zona"
          style={({ pressed }) => [styles.menu, pressed && styles.pressed]}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {air && reference ? (
        <Pressable
          onPress={openReference}
          accessibilityRole="link"
          accessibilityLabel={`Calidad del aire en ${reference.name}: ${
            air.label ?? ''
          } ${formatReading(air)}. Ver su perfil ambiental`}
          style={({ pressed }) => [styles.reading, pressed && styles.pressed]}>
          <View style={styles.readingMain}>
            <Text variant="caption" color="textSecondary">
              Calidad del aire
            </Text>
            <Text variant="title">
              {air.label ? `${air.label} · ` : ''}
              {formatReading(air)}
            </Text>
            <Text variant="micro" color="textMuted" numberOfLines={1}>
              medido en {reference.name}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      ) : (
        <View style={styles.reading}>
          <View style={styles.readingMain}>
            <Text variant="body" color="textSecondary">
              Todavía no hay mediciones en {zone.name}.
            </Text>
            <Text variant="micro" color="textMuted">
              Las mediciones las llevan los lugares, y esta zona aún no tiene ninguno medido.
            </Text>
          </View>
        </View>
      )}

      {secondary.length > 0 ? (
        <View style={styles.secondary}>
          {secondary.map((metric) => (
            <View
              key={metric.metric}
              style={styles.chip}
              accessibilityLabel={`${metricLabel(metric.metric)}: ${formatReading(metric)}`}>
              <Text variant="micro" color="textSecondary" numberOfLines={1}>
                {metricLabel(metric.metric)}
              </Text>
              <Text variant="label" numberOfLines={1}>
                {formatReading(metric)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Modal visible={picking} transparent animationType="fade" onRequestClose={() => setPicking(false)}>
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el selector de zona"
          onPress={() => setPicking(false)}>
          <View style={styles.sheet}>
            <Text variant="subtitle">Elige tu zona</Text>
            <Text variant="caption" color="textSecondary">
              La demo no usa tu ubicación: la zona se elige y se recuerda en este dispositivo.
            </Text>

            {zones.map((option) => {
              const selected = option.id === zone.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    setPicking(false);
                    if (!selected) onChangeZone(option.id);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Zona ${option.name}`}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? colors.accent : colors.textMuted}
                  />
                  <Text variant="body">{option.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneButton: {
    flex: 1,
    gap: 2,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  menu: {
    padding: spacing.xs,
  },
  reading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentTint,
  },
  readingMain: {
    flex: 1,
    gap: 2,
  },
  secondary: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    gap: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    gap: spacing.md,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: colors.surface,
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: {
    opacity: 0.6,
  },
});
