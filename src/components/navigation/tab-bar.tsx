import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { colors, radius, shadows, spacing } from '@/theme';

/**
 * Barra de navegación principal.
 *
 * Las cuatro secciones normales son pestañas; **Crear no lo es**: abre la
 * composición como modal sobre la pestaña actual, así que se dibuja como un
 * botón circular elevado en el centro de la barra.
 *
 * La pestaña activa se deduce de la ruta (`usePathname`) y la navegación se
 * hace con el router de expo-router, en vez de con el estado y los eventos del
 * navegador de react-navigation. Es mucho menos código y funciona igual en web
 * y en nativo; lo único que se pierde es el gesto de "volver a pulsar la
 * pestaña activa para subir al principio", que llegará con el feed (F1.5).
 */

type TabDefinition = {
  /** Ruta de la pestaña. */
  href: '/' | '/buscar' | '/mapa' | '/perfil';
  label: string;
  /** Nombre base del icono en Ionicons; el sufijo `-outline` es el inactivo. */
  icon: 'home' | 'search' | 'location' | 'person';
};

const TABS: readonly TabDefinition[] = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/buscar', label: 'Buscar', icon: 'search' },
  { href: '/mapa', label: 'Mapa', icon: 'location' },
  { href: '/perfil', label: 'Perfil', icon: 'person' },
];

/** Cuánto sobresale el botón de crear por encima de la barra. */
const CREATE_OVERHANG = 22;
const CREATE_SIZE = 56;
const BAR_HEIGHT = 60;

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const [inicio, buscar, mapa, perfil] = TABS;

  return (
    // El contenedor es transparente y más alto que la barra: el hueco de arriba
    // es por donde asoma el botón de crear. Así el botón nunca queda recortado
    // por el contenedor, pase lo que pase por encima.
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={[styles.surface, { bottom: 0, top: CREATE_OVERHANG }]} />

      <View style={styles.row}>
        <TabItem tab={inicio} pathname={pathname} onPress={router.navigate} />
        <TabItem tab={buscar} pathname={pathname} onPress={router.navigate} />

        <View style={styles.createSlot}>
          <Pressable
            onPress={() => router.push('/crear')}
            accessibilityRole="button"
            accessibilityLabel="Crear publicación"
            style={({ pressed }) => [styles.createButton, pressed && styles.createPressed]}>
            <Ionicons name="add" size={32} color={colors.textInverse} />
          </Pressable>
          <Text variant="micro" color="textSecondary">
            Crear
          </Text>
        </View>

        <TabItem tab={mapa} pathname={pathname} onPress={router.navigate} />
        <TabItem tab={perfil} pathname={pathname} onPress={router.navigate} />
      </View>
    </View>
  );
}

function TabItem({
  tab,
  pathname,
  onPress,
}: {
  tab: TabDefinition | undefined;
  pathname: string;
  onPress: (href: TabDefinition['href']) => void;
}) {
  if (!tab) {
    return null;
  }

  const active = pathname === tab.href;

  return (
    <Pressable
      onPress={() => onPress(tab.href)}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={tab.label}
      style={styles.tabItem}>
      <Ionicons
        name={active ? tab.icon : (`${tab.icon}-outline` as const)}
        size={24}
        color={active ? colors.accent : colors.textSecondary}
      />
      <Text variant="micro" color={active ? 'accent' : 'textSecondary'}>
        {tab.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: CREATE_OVERHANG,
    backgroundColor: 'transparent',
  },
  surface: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  row: {
    flexDirection: 'row',
    // Por la base, no por el centro: así las cinco etiquetas comparten línea
    // aunque el botón de crear sea mucho más alto que una pestaña.
    alignItems: 'flex-end',
    minHeight: BAR_HEIGHT,
    // En pantalla ancha la barra no se estira: sigue el ancho del contenido.
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  createSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    // El mismo hueco inferior que una pestaña: alinea la etiqueta con las demás.
    paddingBottom: spacing.md,
    // El alto que sobra sale por arriba, hacia la zona transparente.
    marginTop: -CREATE_OVERHANG,
  },
  createButton: {
    width: CREATE_SIZE,
    height: CREATE_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Aro blanco: separa el botón de la barra cuando se solapan.
    borderWidth: 4,
    borderColor: colors.surface,
    ...shadows.floating,
  },
  createPressed: {
    opacity: 0.85,
  },
});
