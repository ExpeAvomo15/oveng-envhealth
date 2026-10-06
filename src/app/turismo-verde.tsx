import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { GreenPlaceCard } from '@/components/turismo/green-place-card';
import { Button, Screen, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { useFontFamily } from '@/hooks/use-fonts';
import { usePlaceSearch } from '@/hooks/use-place-search';
import { searchEntities, type EntityResult } from '@/lib/entities';
import { distanceKm, type Point } from '@/lib/geo';
import { locate, locateFailureMessage, LOCATION_PRIVACY_NOTE, permissionState } from '@/lib/geolocation';
import { zonesWithPlaces } from '@/lib/zones';
import { colors, noWebFocusRing, radius, spacing, typography } from '@/theme';

/** Radio de "cerca": lo que se recorre en una excursión de un día. */
const RADIUS_KM = 150;

/** Cuántos de los más cercanos se ofrecen cuando no hay nada dentro del radio. */
const NEAREST_OUTSIDE = 3;

type Origin = Point & { label: string };

/**
 * Turismo Verde, orientado a ubicación (F4.5): "¿dónde quieres disfrutar de la
 * naturaleza?". Se elige un punto —una ciudad buscada, "Cerca de mí" o una de
 * las zonas con contenido— y salen los rincones verdes del directorio
 * ordenados por distancia, con "Cómo llegar" a Google Maps.
 *
 * **Ruta propia y no un modo de Buscar.** Aquí el buscador es de ciudades, no
 * de entidades; meterlo en Buscar dejaba dos campos de búsqueda distintos en la
 * misma pantalla. El chip "Turismo Verde" de Buscar lleva aquí.
 *
 * **Curación es marca:** solo salen lugares del directorio de OVENG. Donde no
 * hay, se dice y se invita a proponer uno; no se rellena con fuentes externas.
 *
 * Lectura libre: se ve sin cuenta. Solo proponer un sitio pide cuenta, y al
 * publicar.
 */
export default function GreenTourismScreen() {
  const router = useRouter();
  const fontFamily = useFontFamily();
  const { session } = useAuth();

  const [places, setPlaces] = useState<EntityResult[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const [term, setTerm] = useState('');
  const [locating, setLocating] = useState(false);
  const search = usePlaceSearch(term);

  useEffect(() => {
    let active = true;
    searchEntities('', { type: 'lugar', limit: 200 })
      .then((found) => {
        if (active) setPlaces(found.filter((place) => place.lat !== null && place.lng !== null));
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const zoneChips = useMemo(() => (places ? zonesWithPlaces(places) : []), [places]);

  /** Los lugares con su distancia al punto elegido, del más cercano al más lejano. */
  const ranked = useMemo(() => {
    if (!places || !origin) return null;
    return places
      .map((place) => ({ place, km: distanceKm(origin, { lat: place.lat!, lng: place.lng! }) }))
      .sort((a, b) => a.km - b.km);
  }, [places, origin]);

  const inRadius = ranked?.filter((row) => row.km <= RADIUS_KM) ?? [];

  async function nearMe() {
    if (locating) return;
    setLocating(true);
    // Mismo patrón que "Mi ubicación" del mapa (F4.2): se dice antes del
    // diálogo del navegador, y denegar no rompe nada.
    if ((await permissionState()) === 'prompt') showToast(LOCATION_PRIVACY_NOTE);
    const result = await locate();
    setLocating(false);
    if (!result.ok) {
      showToast(locateFailureMessage(result.reason));
      return;
    }
    setTerm('');
    setOrigin({ ...result.coords, label: 'tu ubicación' });
  }

  function propose() {
    const where = origin?.label === 'tu ubicación' ? 'mi zona' : (origin?.label ?? 'mi zona');
    if (session === null) {
      showToast('Para proponer un sitio, entra o crea tu cuenta.');
      router.push('/welcome');
      return;
    }
    const text = `Propongo un rincón verde en ${where}: \n\n#TurismoVerde`;
    router.push(`/crear?texto=${encodeURIComponent(text)}`);
  }

  const open = (place: EntityResult) => router.push(`/entidad/${place.slug}`);

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/buscar'))}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="label" color="accent">
          Turismo Verde
        </Text>
      </View>

      <View style={styles.header}>
        <Text variant="title" accessibilityRole="header">
          🌿 ¿Dónde quieres disfrutar de la naturaleza?
        </Text>

        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            placeholder="Busca una ciudad o región..."
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            accessibilityLabel="Buscar una ciudad o región"
            style={[styles.input, noWebFocusRing, { fontFamily: fontFamily('400') }]}
          />
          {term.length > 0 ? (
            <Pressable onPress={() => setTerm('')} accessibilityRole="button" accessibilityLabel="Borrar la búsqueda" hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}
        </View>

        {term.trim().length > 0 ? (
          <View style={styles.results}>
            {search.status === 'loading' || search.status === 'idle' ? (
              <View style={styles.row}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text variant="caption" color="textSecondary">
                  Buscando…
                </Text>
              </View>
            ) : search.status === 'error' ? (
              <Text variant="caption" color="textSecondary">
                No hemos podido buscar ahora. Revisa tu conexión y prueba otra vez.
              </Text>
            ) : search.places.length === 0 ? (
              <Text variant="caption" color="textSecondary">
                No encontramos ese lugar. Prueba con el nombre de una ciudad.
              </Text>
            ) : (
              search.places.map((place) => (
                <Pressable
                  key={place.id}
                  onPress={() => {
                    setOrigin({ lat: place.lat, lng: place.lng, label: place.name });
                    setTerm('');
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Buscar cerca de ${place.name}${place.detail ? `, ${place.detail}` : ''}`}
                  style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <View style={styles.flex}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {place.name}
                    </Text>
                    {place.detail ? (
                      <Text variant="micro" color="textMuted" numberOfLines={1}>
                        {place.detail}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Elegir zona">
          <Chip
            label={locating ? 'Buscándote…' : '📍 Cerca de mí'}
            selected={origin?.label === 'tu ubicación'}
            onPress={nearMe}
          />
          {zoneChips.map((zone) => (
            <Chip
              key={zone.id}
              label={zone.name}
              selected={origin?.label === zone.name}
              onPress={() => {
                setTerm('');
                setOrigin({ ...zone.center, label: zone.name });
              }}
            />
          ))}
        </View>
      </View>

      {failed ? (
        <Text variant="body" color="textSecondary">
          No hemos podido cargar los rincones verdes. Prueba otra vez en un rato.
        </Text>
      ) : places === null ? (
        <ActivityIndicator color={colors.accent} style={styles.loading} />
      ) : !origin || !ranked ? (
        // Sin punto elegido: todos, por nombre, sin distancia.
        <View style={styles.list}>
          <Text variant="subtitle">Todos los rincones verdes</Text>
          {[...places]
            .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            .map((place) => (
              <GreenPlaceCard key={place.id} place={place} onOpen={() => open(place)} />
            ))}
        </View>
      ) : inRadius.length > 0 ? (
        <View style={styles.list}>
          <Text variant="subtitle">
            {inRadius.length === 1 ? '1 rincón verde' : `${inRadius.length} rincones verdes`} cerca de {origin.label}
          </Text>
          {inRadius.map(({ place, km }) => (
            <GreenPlaceCard key={place.id} place={place} distanceKm={km} onOpen={() => open(place)} />
          ))}
          <ProposeCard onPress={propose} />
        </View>
      ) : (
        // Estado vacío con participación: se dice, se ofrece lo más cercano que
        // hay y se invita a proponer. No se rellena con fuentes externas.
        <View style={styles.list}>
          <View style={styles.empty}>
            <Text variant="title" style={styles.centered}>
              Aún no tenemos rincones verdes en {origin.label} 🌱
            </Text>
            <Text variant="body" color="textSecondary" style={styles.centered}>
              Los lugares de OVENG los elige y revisa la comunidad, uno a uno. Todavía no hay ninguno a
              menos de {RADIUS_KM} km.
            </Text>
          </View>

          {ranked.length > 0 ? (
            <>
              <Text variant="subtitle">Lo más cerca que conocemos</Text>
              {ranked.slice(0, NEAREST_OUTSIDE).map(({ place, km }) => (
                <GreenPlaceCard key={place.id} place={place} distanceKm={km} onOpen={() => open(place)} />
              ))}
            </>
          ) : null}

          <ProposeCard onPress={propose} highlighted />
        </View>
      )}
    </Screen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label.replace('📍 ', '')}
      style={[styles.chip, selected && styles.chipSelected]}>
      <Text variant="label" color={selected ? 'textInverse' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/** "¿Conoces un sitio? Cuéntanoslo": la puerta a proponer un lugar. */
function ProposeCard({ onPress, highlighted = false }: { onPress: () => void; highlighted?: boolean }) {
  return (
    <View style={[styles.propose, highlighted && styles.proposeHighlighted]}>
      <Text variant="bodyStrong">¿Conoces un sitio? Cuéntanoslo</Text>
      <Text variant="caption" color="textSecondary">
        Publícalo con #TurismoVerde y lo revisaremos para sumarlo al directorio.
      </Text>
      <Button label="Proponer un rincón verde" size="sm" onPress={onPress} style={styles.proposeButton} />
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  back: {
    padding: spacing.xs,
  },
  header: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: typography.body.fontSize,
    paddingVertical: 0,
  },
  results: {
    gap: 2,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  result: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  loading: {
    padding: spacing.xl,
  },
  list: {
    gap: spacing.md,
  },
  empty: {
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  centered: {
    textAlign: 'center',
  },
  propose: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  proposeHighlighted: {
    backgroundColor: colors.accentTint,
    borderColor: colors.accentTint,
  },
  proposeButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
});
