import Ionicons from '@expo/vector-icons/Ionicons';
import { Map as MapLibreMap, type StyleSpecification } from 'maplibre-gl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { EntityAvatar } from '@/components/search';
import { colors, radius, shadows, spacing } from '@/theme';

import { INITIAL_VIEW, type EnvironmentalMapProps } from './types';

import 'maplibre-gl/dist/maplibre-gl.css';

/**
 * Mapa base: teselas raster de OpenStreetMap.
 *
 * ## Por qué estas y no las demotiles de MapLibre
 *
 * Las demotiles llegan a **zoom 6** y solo traen `countries`, `centroids` y
 * `geolines`: a ese nivel Bata y Monte Alén caen en el mismo píxel y no hay
 * costa, ni carreteras, ni nada que sitúe un marcador. Para un mapa cuyo
 * trabajo es responder "¿cómo está esto donde vivo?", no sirven.
 *
 * ## Su límite, que hay que respetar
 *
 * Las teselas de openstreetmap.org son un servicio donado y su política de uso
 * (https://operations.osmfoundation.org/policies/tiles/) pide atribución
 * visible, prohíbe la descarga masiva y avisa de que un uso intenso debe
 * moverse a otro proveedor. Para una demo con catorce marcadores va sobrada;
 * **un lanzamiento de verdad necesita proveedor propio**, y está anotado.
 *
 * La estética de satélite de los mockups no se puede replicar sin un proveedor
 * de pago, así que no se intenta.
 */
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

/**
 * Mapa ambiental (web).
 *
 * **Los marcadores no son marcadores de MapLibre**: son componentes de la app
 * superpuestos y colocados con `map.project()`. Así el pin usa el mismo
 * `EntityAvatar` que las fichas de Buscar —mismo color, mismo icono, una sola
 * definición— en vez de un HTML aparte que habría que mantener en paralelo. Con
 * catorce marcadores el coste de reproyectarlos al mover es irrelevante.
 */
export function EnvironmentalMap({
  entities,
  selectedId,
  onSelect,
  onCenterChange,
}: EnvironmentalMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);

  /**
   * La instancia va también en estado, y no solo en una ref, porque el render
   * la necesita para proyectar los marcadores. Una ref leída durante el render
   * no provoca repintado: las posiciones se quedarían congeladas en las del
   * primer fotograma.
   */
  const [map, setMap] = useState<MapLibreMap | null>(null);

  /**
   * Contador que se incrementa en cada movimiento del mapa. No guarda el
   * encuadre —eso lo tiene MapLibre— sino que obliga a recalcular las
   * posiciones proyectadas, que es lo único que depende de él.
   */
  const [tick, setTick] = useState(0);

  // Las llamadas al padre viven en una ref: si entraran en las dependencias del
  // efecto, un padre que rehaga la función destruiría y recrearía el mapa.
  const onCenterChangeRef = useRef(onCenterChange);
  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = new MapLibreMap({
      container,
      style: OSM_STYLE,
      center: [INITIAL_VIEW.lng, INITIAL_VIEW.lat],
      zoom: INITIAL_VIEW.zoom,
      attributionControl: {
        compact: true,
        // El aire de la tarjeta flotante (F4.1): las condiciones de Open-Meteo
        // piden atribuir a CAMS y a Open-Meteo de forma visible.
        customAttribution:
          'Aire: <a href="https://atmosphere.copernicus.eu/">CAMS de Copernicus</a> vía <a href="https://open-meteo.com/">Open-Meteo</a>',
      },
      // Sin rotación: un mapa de datos girado desorienta y no aporta nada.
      dragRotate: false,
      pitchWithRotate: false,
    });

    mapRef.current = map;

    const onMove = () => {
      setTick((value) => value + 1);
      const center = map.getCenter();
      onCenterChangeRef.current?.({ lat: center.lat, lng: center.lng });
    };

    map.on('move', onMove);
    // `setMap` va dentro del callback de carga, no en el cuerpo del efecto: es
    // asíncrono y además es cuando el mapa puede proyectar de verdad.
    map.once('load', () => {
      setMap(map);
      onMove();
    });

    // Se destruye al desmontar: sin esto, cambiar de pestaña deja vivos el
    // canvas de WebGL y sus escuchas, y volver al mapa crea otro encima.
    return () => {
      map.off('move', onMove);
      map.remove();
      mapRef.current = null;
      setMap(null);
    };
  }, []);

  /** Posición en píxeles de cada entidad con coordenadas. */
  const pins = useMemo(() => {
    if (!map) return [];

    // `tick` es la dependencia real: cambia con cada movimiento del mapa.
    void tick;

    return entities
      .filter((entity) => entity.lat !== null && entity.lng !== null)
      .map((entity) => {
        const point = map.project([entity.lng as number, entity.lat as number]);
        return { entity, x: point.x, y: point.y };
      });
  }, [entities, map, tick]);

  function zoomBy(delta: number) {
    const current = mapRef.current;
    current?.zoomTo(current.getZoom() + delta, { duration: 300 });
  }

  function recenter() {
    mapRef.current?.flyTo({
      center: [INITIAL_VIEW.lng, INITIAL_VIEW.lat],
      zoom: INITIAL_VIEW.zoom,
      duration: 800,
    });
  }

  return (
    <View style={styles.container}>
      {/* El lienzo de MapLibre. `ref` es un div de verdad: esto solo se
          compila en web. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/*
        Capa de marcadores. El contenedor no recibe toques —si no, el mapa no se
        podría arrastrar— y cada pin sí.
      */}
      <View style={styles.markerLayer} pointerEvents="box-none">
        {pins.map(({ entity, x, y }) => {
          const selected = entity.id === selectedId;

          return (
            <Pressable
              key={entity.id}
              onPress={() => onSelect(selected ? null : entity.id)}
              accessibilityRole="button"
              accessibilityLabel={`${entity.name}, en el mapa`}
              accessibilityState={{ selected }}
              style={[styles.pin, { left: x, top: y }, selected && styles.pinSelected]}>
              <View style={styles.pinInner}>
                <EntityAvatar category={entity.category} size={34} />
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.controls} pointerEvents="box-none">
        <MapButton label="Acercar" icon="add" onPress={() => zoomBy(1)} />
        <MapButton label="Alejar" icon="remove" onPress={() => zoomBy(-1)} />
        <MapButton label="Centrar en Guinea Ecuatorial" icon="locate" onPress={recenter} />
      </View>
    </View>
  );
}

function MapButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: 'add' | 'remove' | 'locate';
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  markerLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pin: {
    position: 'absolute',
    // El pin se ancla por su centro: `project` devuelve el punto exacto.
    marginLeft: -21,
    marginTop: -21,
    padding: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  pinSelected: {
    borderWidth: 2,
    borderColor: colors.accent,
    padding: 2,
  },
  pinInner: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    right: spacing.md,
    /*
     * Por encima de la tarjeta inferior, no debajo. Estaban a `spacing.md` del
     * borde y la tarjeta de calidad del aire los tapaba: el "−" y el de centrar
     * no se veían. Este hueco deja sitio a la tarjeta más alta de las dos, que
     * es la del marcador seleccionado.
     */
    bottom: 168,
    gap: spacing.sm,
  },
  controlButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.6,
  },
});
