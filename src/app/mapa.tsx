import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AirQualityCard,
  CategoryLegend,
  EntitySheet,
  EnvironmentalMap,
  INITIAL_VIEW,
  type MapCenter,
} from '@/components/map';
import { TabBar } from '@/components/navigation/tab-bar';
import { Button, Callout, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useFontFamily } from '@/hooks/use-fonts';
import type { EntityMetric, EnvironmentalCategoryName } from '@/lib/database.types';
import { getMetricByEntity, searchEntities, type EntityResult } from '@/lib/entities';
import { colors, environmentalCategoryOrder, noWebFocusRing, radius, spacing, typography } from '@/theme';

type Loaded = {
  entities: EntityResult[];
  airByEntity: Map<string, EntityMetric>;
};

/**
 * Mapa ambiental — la sección que distingue a OVENG.
 *
 * Las catorce entidades se cargan **una vez** y todo el filtrado (categoría y
 * texto) es en memoria: son catorce, y una consulta por tecla para filtrar una
 * lista que ya está en el cliente sería gasto sin nada a cambio. Cuando el
 * directorio crezca, el filtro por recuadro de coordenadas lo hará la base —
 * por eso `entities` ya tiene su índice por `(lat, lng)`.
 */
export default function MapScreen() {
  const router = useRouter();
  const fontFamily = useFontFamily();
  const { session } = useAuth();

  /**
   * El mapa solo existe mientras se está mirando.
   *
   * Es una ruta de primer nivel, así que al ir a otra pestaña la pantalla no se
   * desmonta: se queda debajo en la pila. Sin esto pasaban las dos cosas malas
   * a la vez — el contexto de WebGL seguía vivo con el mapa fuera de vista, y al
   * volver el lienzo reaparecía **oculto y sin tamaño**, porque MapLibre no se
   * entera de que su contenedor ha vuelto a tener alto.
   *
   * Montarlo y desmontarlo con el foco resuelve las dos: al salir se destruye
   * de verdad (su `useEffect` limpia), y al volver se crea con el tamaño real.
   * Lo que cuesta es rehacerlo al volver, y las teselas ya están en la caché
   * del navegador.
   */
  const focused = useIsFocused();

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState('');
  const [hidden, setHidden] = useState<Set<EnvironmentalCategoryName>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState<MapCenter>({ lat: INITIAL_VIEW.lat, lng: INITIAL_VIEW.lng });

  useEffect(() => {
    let live = true;

    searchEntities('', { limit: 100 })
      .then(async (entities) => {
        if (!live) return;
        const airByEntity = await getMetricByEntity(
          'aire',
          entities.map((entity) => entity.id),
        );
        if (live) setLoaded({ entities, airByEntity });
      })
      .catch(() => {
        if (live) setError('No se ha podido cargar el mapa. Inténtalo de nuevo.');
      });

    return () => {
      live = false;
    };
  }, []);

  const active = useMemo(
    () => new Set(environmentalCategoryOrder.filter((key) => !hidden.has(key))),
    [hidden],
  );

  const visible = useMemo(() => {
    if (!loaded) return [];
    const needle = term.trim().toLowerCase();

    return loaded.entities.filter((entity) => {
      if (hidden.has(entity.category)) return false;
      if (needle.length === 0) return true;
      return (
        entity.name.toLowerCase().includes(needle) ||
        (entity.location_name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [loaded, hidden, term]);

  /**
   * La selección se deriva de lo visible, no se limpia con un efecto: si un
   * filtro esconde el marcador seleccionado, `selected` ya es `null` y la
   * tarjeta desaparece. Y al volver a encender la capa reaparece seleccionado,
   * que es lo que esperaría cualquiera que acaba de apagarla sin querer.
   */
  const selected = visible.find((entity) => entity.id === selectedId) ?? null;

  /** La medición de aire más cercana al centro del encuadre. */
  const nearestAir = useMemo(() => {
    if (!loaded || selected) return null;

    let best: { entity: EntityResult; metric: EntityMetric; distance: number } | null = null;

    for (const entity of visible) {
      const metric = loaded.airByEntity.get(entity.id);
      if (!metric || entity.lat === null || entity.lng === null) continue;

      // Distancia euclídea en grados: para ordenar catorce puntos por cercanía
      // no hace falta la fórmula del haversine, y aquí solo se ordena.
      const distance = (entity.lat - center.lat) ** 2 + (entity.lng - center.lng) ** 2;
      if (!best || distance < best.distance) best = { entity, metric, distance };
    }

    return best;
  }, [loaded, visible, center, selected]);

  function toggleCategory(category: EnvironmentalCategoryName) {
    setHidden((previous) => {
      const next = new Set(previous);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.map}>
        {loaded === null && error === null ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : focused ? (
          <EnvironmentalMap
            entities={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCenterChange={setCenter}
          />
        ) : (
          <View style={styles.centered} />
        )}

        {/* Buscar y leyenda flotan sobre el mapa, como en los mockups. */}
        <View style={styles.overlayTop} pointerEvents="box-none">
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color={colors.textMuted} />
            <TextInput
              value={term}
              onChangeText={setTerm}
              placeholder="Buscar en el mapa…"
              placeholderTextColor={colors.textMuted}
              autoCorrect={false}
              accessibilityLabel="Buscar en el mapa"
              style={[styles.searchInput, noWebFocusRing, { fontFamily: fontFamily('400') }]}
            />
            {term.length > 0 ? (
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.textMuted}
                onPress={() => setTerm('')}
                accessibilityRole="button"
                accessibilityLabel="Borrar la búsqueda del mapa"
              />
            ) : null}
          </View>

          <View style={styles.legendRow} pointerEvents="box-none">
            {/*
              Sin cuenta se puede mirar el mapa entero; lo que pide cuenta
              —seguir, valorar, publicar— tiene su puerta aquí, no un muro
              delante. Ver @docs/07_CRECIMIENTO.md.
            */}
            {session === null ? (
              <Button
                label="Iniciar sesión"
                size="sm"
                onPress={() => router.push('/welcome')}
              />
            ) : (
              <View />
            )}

            <CategoryLegend active={active} onToggle={toggleCategory} />
          </View>
        </View>

        <View style={styles.overlayBottom} pointerEvents="box-none">
          {error ? (
            <Callout tone="error">{error}</Callout>
          ) : selected ? (
            <EntitySheet
              entity={selected}
              onClose={() => setSelectedId(null)}
              onOpen={() => router.push(`/entidad/${selected.slug}`)}
            />
          ) : nearestAir ? (
            <AirQualityCard
              entity={nearestAir.entity}
              metric={nearestAir.metric}
              onPress={() => router.push(`/entidad/${nearestAir.entity.slug}`)}
            />
          ) : loaded !== null && visible.length === 0 ? (
            <View style={styles.empty}>
              <Text variant="caption" color="textSecondary">
                No hay nada que enseñar con estos filtros. Vuelve a encender una capa o borra la
                búsqueda.
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/*
        El mapa es una ruta de primer nivel y no una pestaña —para poder ser
        pública sin abrir todo el grupo—, así que pinta la barra él mismo. Es el
        mismo componente, que navega por ruta: se ve y se comporta igual.
      */}
      <TabBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  map: {
    flex: 1,
    position: 'relative',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayTop: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    gap: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingVertical: 0,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  overlayBottom: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
  },
  empty: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
});
