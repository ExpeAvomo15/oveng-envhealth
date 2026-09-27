import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { colors, radius, spacing } from '@/theme';

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

/**
 * Rutas que se ven sin cuenta. El mapa es pública desde F2.3; las demás
 * pestañas mandan a la bienvenida, que es donde se decide crear cuenta o
 * entrar. Ver @docs/07_CRECIMIENTO.md.
 */
const PUBLIC_HREFS = new Set<TabDefinition['href']>(['/mapa']);

const TABS: readonly TabDefinition[] = [
  { href: '/', label: 'Inicio', icon: 'home' },
  { href: '/buscar', label: 'Buscar', icon: 'search' },
  { href: '/mapa', label: 'Mapa', icon: 'location' },
  { href: '/perfil', label: 'Perfil', icon: 'person' },
];

/**
 * Tamaño del disco verde de Crear.
 *
 * En los mockups, Crear **no sobresale de la barra**: ocupa la misma celda que
 * las demás pestañas y se distingue por ser un disco verde con el "+" en
 * blanco, del tamaño de un icono. La versión anterior era un botón flotante de
 * 56 px que asomaba por encima; se cambió al contrastar con
 * docs/design/Infografia_Oveng_2.
 */
const CREATE_SIZE = 34;
const BAR_HEIGHT = 60;

export function TabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();

  const [inicio, buscar, mapa, perfil] = TABS;

  /**
   * Sin sesión, lo que exige cuenta lleva a la bienvenida en vez de a una
   * pantalla que no existe en el árbol. Se navega, no se esconde la pestaña: un
   * menú que cambia de forma según quién mire desorienta más de lo que protege.
   */
  const go = (href: TabDefinition['href']) => {
    if (session === null && !PUBLIC_HREFS.has(href)) {
      router.navigate('/welcome');
      return;
    }
    router.navigate(href);
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        <TabItem tab={inicio} pathname={pathname} onPress={go} />
        <TabItem tab={buscar} pathname={pathname} onPress={go} />

        <Pressable
          onPress={() => router.push(session === null ? '/welcome' : '/crear')}
          accessibilityRole="button"
          accessibilityLabel="Crear publicación"
          style={({ pressed }) => [styles.createSlot, pressed && styles.pressed]}>
          <View style={styles.createDisc}>
            <Ionicons name="add" size={22} color={colors.textInverse} />
          </View>
          <Text variant="micro" color="textSecondary">
            Crear
          </Text>
        </Pressable>

        <TabItem tab={mapa} pathname={pathname} onPress={go} />
        <TabItem tab={perfil} pathname={pathname} onPress={go} />
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
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  createDisc: {
    width: CREATE_SIZE,
    height: CREATE_SIZE,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
