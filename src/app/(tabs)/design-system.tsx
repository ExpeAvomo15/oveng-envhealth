import { StyleSheet, View } from 'react-native';

import { Avatar, Badge, Button, Card, Divider, Screen, Text } from '@/components/ui';
import {
  colors,
  environmentalCategories,
  environmentalCategoryOrder,
  radius,
  spacing,
  typography,
  type ColorToken,
} from '@/theme';

/**
 * Pantalla de verificación del design system.
 *
 * Existe para poder mirar los tokens y los componentes juntos y contrastarlos
 * con los mockups de docs/design/. En F1.2 la sustituye el feed (Inicio).
 */
export default function DesignSystemScreen() {
  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display">OVENG EnvHealth</Text>
        <Text variant="caption" color="textSecondary">
          Design system · F0.2. Referencia visual hasta que lleguen las pantallas reales.
        </Text>
      </View>

      <Section title="Color">
        <View style={styles.swatches}>
          <Swatch token="accent" label="Acento" />
          <Swatch token="accentSoft" label="Acento suave" />
          <Swatch token="info" label="Datos" />
          <Swatch token="warning" label="Aviso" />
          <Swatch token="textSecondary" label="Gris" />
          <Swatch token="background" label="Superficie" />
        </View>
        <Text variant="caption" color="textSecondary">
          El verde es acento, no fondo. Azul y amarillo son rellenos: nunca color de texto.
        </Text>
      </Section>

      <Section title="Tipografía">
        <Card>
          {(Object.keys(typography) as (keyof typeof typography)[]).map((variant, index) => (
            <View key={variant}>
              {index > 0 ? <View style={styles.rowGap} /> : null}
              <Text variant={variant}>{variant}</Text>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Botones">
        <View style={styles.row}>
          <Button label="Publicar" />
          <Button label="Seguir" variant="secondary" />
          <Button label="Cancelar" variant="ghost" />
        </View>
        <View style={styles.row}>
          <Button label="Guardando" loading />
          <Button label="No disponible" disabled />
        </View>
      </Section>

      <Section title="Etiquetas">
        <View style={styles.row}>
          <Badge label="Iniciativa" tone="accent" />
          <Badge label="Calidad del aire" tone="info" />
          <Badge label="Pendiente" tone="warning" />
          <Badge label="Empresa" tone="neutral" />
        </View>
      </Section>

      <Section title="Categorías ambientales">
        <View style={styles.row}>
          {environmentalCategoryOrder.map((key) => {
            const category = environmentalCategories[key];
            return (
              <View key={key} style={[styles.categoryChip, { backgroundColor: category.color }]}>
                <Text variant="label" color={category.onColor}>
                  {category.label}
                </Text>
              </View>
            );
          })}
        </View>
        <Text variant="caption" color="textSecondary">
          Relleno sólido; el color del texto sale de medir la luminancia de cada uno. La categoría
          nunca se indica solo con color: siempre lleva su etiqueta.
        </Text>
      </Section>

      <Section title="Card y avatar">
        <Card>
          <View style={styles.cardHeader}>
            <Avatar name="Bosque Vivo" />
            <View style={styles.cardHeaderText}>
              <Text variant="subtitle">Bosque Vivo</Text>
              <Text variant="caption" color="textSecondary">
                Iniciativa · hace 2 h
              </Text>
            </View>
            <Badge label="Biodiversidad" tone="accent" />
          </View>
          <View style={styles.rowGap} />
          <Text>
            Plantación de 120 árboles autóctonos en la ribera. Quedan plazas para la jornada
            del sábado.
          </Text>
          <View style={styles.rowGap} />
          <Divider />
          <View style={styles.rowGap} />
          <View style={styles.row}>
            <Avatar name="Ana Ruiz" size="sm" />
            <Text variant="caption" color="textSecondary">
              Valorada por 38 personas
            </Text>
          </View>
        </Card>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

function Swatch({ token, label }: { token: ColorToken; label: string }) {
  return (
    <View style={styles.swatch}>
      <View style={[styles.swatchChip, { backgroundColor: colors[token] }]} />
      <Text variant="label" color="textSecondary">
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  section: {
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowGap: {
    height: spacing.md,
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  swatch: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  swatchChip: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChip: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  cardHeaderText: {
    flex: 1,
  },
});
