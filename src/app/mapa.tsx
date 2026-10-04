import Ionicons from '@expo/vector-icons/Ionicons';
import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AirQualityCard,
  CategoryLegend,
  CountCard,
  EntitySheet,
  EnvironmentalMap,
  inBounds,
  INITIAL_VIEW,
  MapSearchResults,
  NatureCard,
  SoilCard,
  WaterCard,
  type FlyTarget,
  type MapBounds,
  type MapCenter,
} from '@/components/map';
import { TabBar } from '@/components/navigation/tab-bar';
import { Button, Callout, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useFontFamily } from '@/hooks/use-fonts';
import { useLiveNature, useLiveSoil } from '@/hooks/use-live';
import { useLiveAir } from '@/hooks/use-live-air';
import { usePlaceSearch } from '@/hooks/use-place-search';
import type { Place } from '@/lib/geocoding';
import {
  locate,
  locateFailureMessage,
  LOCATION_PRIVACY_NOTE,
  permissionState,
  type Coords,
} from '@/lib/geolocation';
import type { EntityMetric, EnvironmentalCategoryName } from '@/lib/database.types';
import { getMetricByEntity, searchEntities, type EntityResult } from '@/lib/entities';
import { colors, noWebFocusRing, radius, spacing, typography } from '@/theme';

/** Lo que el mapa tiene que estar quieto antes de pedir el aire de su centro. */
const SETTLE_MS = 600;

/** Zoom al volar a una entidad o a la propia ubicación. */
const ENTITY_ZOOM = 10;
const USER_ZOOM = 11;

/** Precisión a partir de la cual se avisa de que la ubicación es aproximada. */
const ROUGH_ACCURACY_M = 5000;

/** Si el centro está en un punto elegido: tras volar, coincide casi exacto. */
function isAt(center: MapCenter, point: Coords | null): boolean {
  return point !== null && Math.abs(center.lat - point.lat) < 0.02 && Math.abs(center.lng - point.lng) < 0.02;
}

type Loaded = {
  entities: EntityResult[];
  airByEntity: Map<string, EntityMetric>;
  /** Agua curada de los lugares: la única fuente de agua que hay (F4.3). */
  waterByEntity: Map<string, EntityMetric>;
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
  /**
   * La capa elegida en la leyenda (F4.3). `null` es "todas", y la tarjeta de
   * abajo enseña el aire, como antes.
   */
  const [chosen, setChosen] = useState<EnvironmentalCategoryName | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [center, setCenter] = useState<MapCenter>({ lat: INITIAL_VIEW.lat, lng: INITIAL_VIEW.lng });
  const [bounds, setBounds] = useState<MapBounds | null>(null);

  /**
   * El centro **al soltar el mapa**. `center` cambia en cada fotograma mientras
   * se arrastra; pedir el aire con cada uno serían decenas de llamadas por
   * gesto. Se espera a que el mapa lleve un rato quieto, y la caché por celda
   * de 0,1° hace el resto: volver a un sitio ya visto no llama a nadie.
   */
  const [settled, setSettled] = useState<MapCenter>(center);
  const [settledBounds, setSettledBounds] = useState<MapBounds | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(center);
      setSettledBounds(bounds);
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [center, bounds]);

  const liveAir = useLiveAir(settled);
  // Solo se consulta la fuente de la capa elegida: sin capa, nada de suelo ni
  // de GBIF.
  const liveSoil = useLiveSoil(chosen === 'suelo' ? settled : null);
  const liveNature = useLiveNature(chosen === 'biodiversidad' ? settled : null);

  /**
   * Búsqueda mundial (F4.2). El mismo texto busca entidades —que además siguen
   * filtrando los marcadores, como desde F2.3— y lugares del mundo.
   */
  const places = usePlaceSearch(term);
  const [place, setPlace] = useState<(Place & Coords) | null>(null);
  const [fly, setFly] = useState<FlyTarget | null>(null);
  const flyTo = (target: Coords & { zoom: number }) =>
    setFly((previous) => ({ ...target, id: (previous?.id ?? 0) + 1 }));

  /** Dónde está quien mira. Solo en memoria: ver src/lib/geolocation.ts. */
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);

  /**
   * Primera carga: centra en la zona de quien mira **solo si ya dio permiso
   * antes**. `permissionState` no abre el diálogo; sin permiso previo el mapa
   * arranca en Guinea Ecuatorial como siempre. El diálogo solo sale al pulsar
   * "Mi ubicación".
   */
  useEffect(() => {
    let active = true;
    permissionState().then((state) => {
      if (!active || state !== 'granted') return;
      locate().then((result) => {
        if (!active || !result.ok) return;
        setUserLocation(result.coords);
        setFly({ ...result.coords, zoom: USER_ZOOM - 2, id: 1 });
      });
    });
    return () => {
      active = false;
    };
  }, []);

  async function locateMe() {
    if (locating) return;
    setLocating(true);
    // Se dice antes de que salga el diálogo del navegador, no después.
    if ((await permissionState()) === 'prompt') showToast(LOCATION_PRIVACY_NOTE);

    const result = await locate();
    setLocating(false);

    if (!result.ok) {
      // Amable y una vez: el mapa se queda donde está y no se insiste.
      showToast(locateFailureMessage(result.reason));
      return;
    }

    setUserLocation(result.coords);
    setPlace(null);
    setSelectedId(null);
    flyTo({ ...result.coords, zoom: USER_ZOOM });
    if (result.accuracy > ROUGH_ACCURACY_M) {
      showToast(`Ubicación aproximada: unos ${Math.round(result.accuracy / 1000)} km a la redonda.`);
    }
  }

  function pickPlace(picked: Place) {
    setPlace(picked);
    setSelectedId(null);
    setTerm('');
    flyTo({ lat: picked.lat, lng: picked.lng, zoom: picked.zoom });
  }

  function pickEntity(entity: EntityResult) {
    setTerm('');
    setPlace(null);
    setSelectedId(entity.id);
    if (entity.lat !== null && entity.lng !== null) {
      flyTo({ lat: entity.lat, lng: entity.lng, zoom: ENTITY_ZOOM });
    }
  }

  /** El nombre del punto de la tarjeta, si es uno elegido y el mapa sigue ahí. */
  const placeName = isAt(settled, place)
    ? `${place!.name}${place!.detail ? ` · ${place!.detail}` : ''}`
    : isAt(settled, userLocation)
      ? 'Tu ubicación'
      : null;

  useEffect(() => {
    let live = true;

    searchEntities('', { limit: 100 })
      .then(async (entities) => {
        if (!live) return;
        const ids = entities.map((entity) => entity.id);
        const [airByEntity, waterByEntity] = await Promise.all([
          getMetricByEntity('aire', ids),
          getMetricByEntity('agua', ids),
        ]);
        if (live) setLoaded({ entities, airByEntity, waterByEntity });
      })
      .catch(() => {
        if (live) setError('No se ha podido cargar el mapa. Inténtalo de nuevo.');
      });

    return () => {
      live = false;
    };
  }, []);

  const visible = useMemo(() => {
    if (!loaded) return [];
    const needle = term.trim().toLowerCase();

    return loaded.entities.filter((entity) => {
      if (chosen !== null && entity.category !== chosen) return false;
      if (needle.length === 0) return true;
      return (
        entity.name.toLowerCase().includes(needle) ||
        (entity.location_name ?? '').toLowerCase().includes(needle)
      );
    });
  }, [loaded, chosen, term]);

  /**
   * La selección se deriva de lo visible, no se limpia con un efecto: si un
   * filtro esconde el marcador seleccionado, `selected` ya es `null` y la
   * tarjeta desaparece. Y al volver a encender la capa reaparece seleccionado,
   * que es lo que esperaría cualquiera que acaba de apagarla sin querer.
   */
  const selected = visible.find((entity) => entity.id === selectedId) ?? null;

  /**
   * La medición curada de aire más cercana al centro del encuadre. Desde F4.1
   * es el respaldo de la tarjeta, para cuando la API del aire en vivo no
   * responde.
   */
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

  /** Tocar una capa la elige; tocar la elegida vuelve a todas. */
  function chooseCategory(category: EnvironmentalCategoryName) {
    setChosen((previous) => (previous === category ? null : category));
  }

  /** Lo que se ve de la capa elegida, para el agua y para contar entidades. */
  const inView = useMemo(
    () =>
      settledBounds
        ? visible.filter(
            (entity) =>
              entity.lat !== null && entity.lng !== null && inBounds(settledBounds, entity.lat, entity.lng),
          )
        : visible,
    [visible, settledBounds],
  );

  /** El lugar con agua curada más cercano al centro, entre los que se ven. */
  const waterReference = useMemo(() => {
    if (!loaded) return null;
    let best: { entity: EntityResult; metric: EntityMetric; distance: number } | null = null;
    for (const entity of inView) {
      const metric = loaded.waterByEntity.get(entity.id);
      if (!metric || entity.lat === null || entity.lng === null) continue;
      const distance = (entity.lat - settled.lat) ** 2 + (entity.lng - settled.lng) ** 2;
      if (!best || distance < best.distance) best = { entity, metric, distance };
    }
    return best;
  }, [loaded, inView, settled]);

  const where = placeName ?? 'el centro del mapa';
  /** Para pintar como línea suelta: "Centro del mapa · 2,10 N · 9,90 E". */
  const whereLine =
    placeName ??
    `Centro del mapa · ${Math.abs(settled.lat).toFixed(2).replace('.', ',')} ${settled.lat >= 0 ? 'N' : 'S'} · ${Math.abs(settled.lng).toFixed(2).replace('.', ',')} ${settled.lng >= 0 ? 'E' : 'O'}`;
  const openEntity = (entity: EntityResult) => router.push(`/entidad/${entity.slug}`);

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
            onCenterChange={(nextCenter, nextBounds) => {
              setCenter(nextCenter);
              setBounds(nextBounds);
            }}
            flyTo={fly}
            userLocation={userLocation}
            onLocate={locateMe}
            locating={locating}
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

          {term.trim().length > 0 ? (
            <MapSearchResults
              entities={visible}
              places={places}
              onPickEntity={pickEntity}
              onPickPlace={pickPlace}
            />
          ) : null}

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

            <CategoryLegend chosen={chosen} onChoose={chooseCategory} />
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
          ) : loaded !== null && visible.length === 0 && term.trim().length > 0 ? (
            <View style={styles.empty}>
              <Text variant="caption" color="textSecondary">
                Ninguna entidad de OVENG se llama así. Prueba con un lugar de la lista de arriba.
              </Text>
            </View>
          ) : chosen === 'suelo' ? (
            <SoilCard live={liveSoil} where={where} whereLine={whereLine} />
          ) : chosen === 'biodiversidad' ? (
            <NatureCard live={liveNature} where={where} />
          ) : chosen === 'agua' ? (
            <WaterCard reference={waterReference} onOpen={openEntity} />
          ) : chosen === 'energia' || chosen === 'residuos' ? (
            <CountCard category={chosen} entities={inView} />
          ) : (
            // Aire, o ninguna capa elegida: el aire en vivo, como desde F4.1.
            <AirQualityCard
              live={liveAir}
              center={settled}
              placeName={placeName}
              fallback={nearestAir}
              onOpenFallback={openEntity}
            />
          )}
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
