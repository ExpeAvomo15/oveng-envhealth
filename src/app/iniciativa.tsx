import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { usePlaceSearch } from '@/hooks/use-place-search';
import type { EnvironmentalCategoryName } from '@/lib/database.types';
import { getEntityBySlug, type EntityResult } from '@/lib/entities';
import { isEntityAdmin } from '@/lib/entity-admins';
import type { PickedImage } from '@/lib/images';
import {
  communityInitiativesAvailable,
  createInitiative,
  INITIATIVE_LIMITS,
  INITIATIVE_NAME_MIN,
  initiativeErrorMessage,
  updateInitiative,
  type InitiativeDraft,
} from '@/lib/initiatives';
import { pickPostImage } from '@/lib/posts';
import { colors, environmentalCategories, environmentalCategoryOrder, radius, spacing } from '@/theme';

type Zone = InitiativeDraft['place'];

/**
 * Crear (o editar) una iniciativa (F5.1). `?entidad=<slug>` edita.
 *
 * Un formulario llano, de una sola pantalla: nombre, qué hacéis, de qué va,
 * dónde y una foto si se quiere. La zona sale del buscador de lugares del mapa
 * (F4.2), así que la iniciativa aparece en el mapa sin pedir coordenadas a
 * nadie. Privada: pide cuenta, y RLS decide de verdad quién crea y quién edita.
 */
export default function InitiativeScreen() {
  const { entidad } = useLocalSearchParams<{ entidad?: string }>();
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const router = useRouter();

  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'unavailable' }
    | { status: 'forbidden' }
    | { status: 'ready'; editing: EntityResult | null }
  >({ status: 'loading' });

  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await communityInitiativesAvailable())) return { status: 'unavailable' } as const;
      if (!entidad) return { status: 'ready', editing: null } as const;
      const entity = await getEntityBySlug(entidad);
      if (!entity || !entity.created_by || !userId || !(await isEntityAdmin(entity.id, userId))) {
        return { status: 'forbidden' } as const;
      }
      return { status: 'ready', editing: entity } as const;
    })()
      .then((next) => active && setState(next))
      .catch(() => active && setState({ status: 'forbidden' }));
    return () => {
      active = false;
    };
  }, [entidad, userId]);

  if (state.status === 'loading') {
    return (
      <Screen background="surface">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (state.status !== 'ready' || !userId) {
    return (
      <Screen background="surface">
        <View style={styles.centered}>
          <Callout tone="info">
            {state.status === 'unavailable'
              ? 'Crear iniciativas todavía no está disponible. Vuelve pronto.'
              : 'Solo quien administra esta iniciativa puede editarla.'}
          </Callout>
          <Button label="Volver" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/buscar'))} />
        </View>
      </Screen>
    );
  }

  return <InitiativeForm key={state.editing?.id ?? 'nueva'} userId={userId} editing={state.editing} />;
}

function InitiativeForm({ userId, editing }: { userId: string; editing: EntityResult | null }) {
  const router = useRouter();

  const [name, setName] = useState(editing?.name ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [category, setCategory] = useState<EnvironmentalCategoryName | null>(editing?.category ?? null);
  const [zone, setZone] = useState<Zone | null>(
    editing && editing.lat !== null && editing.lng !== null
      ? { name: editing.location_name ?? '', detail: editing.country ?? '', lat: editing.lat, lng: editing.lng }
      : null,
  );
  const [zoneChanged, setZoneChanged] = useState(false);
  const [term, setTerm] = useState('');
  const places = usePlaceSearch(term);
  const [cover, setCover] = useState<PickedImage | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameOk = name.trim().length >= INITIATIVE_NAME_MIN;
  const canSave = nameOk && category !== null && zone !== null && !saving;

  async function pickCover() {
    try {
      const picked = await pickPostImage();
      if (picked) setCover(picked);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido abrir la galería.');
    }
  }

  async function save() {
    if (!canSave || category === null || zone === null) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateInitiative(userId, editing, {
          name,
          description,
          category,
          place: zoneChanged ? zone : null,
          cover,
        });
        showToast('Página actualizada.');
        router.replace(`/entidad/${editing.slug}`);
      } else {
        const slug = await createInitiative(userId, { name, description, category, place: zone, cover });
        showToast('¡Tu iniciativa ya está en OVENG!');
        router.replace(`/entidad/${slug}`);
      }
    } catch (cause) {
      setError(initiativeErrorMessage(cause));
      setSaving(false);
    }
  }

  return (
    <Screen background="surface" avoidKeyboard>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/buscar'))}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">{editing ? 'Editar iniciativa' : 'Crea tu iniciativa'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {editing ? null : (
        <Text variant="body" color="textSecondary">
          Una limpieza, un huerto, un grupo que cuida un río: cuéntalo y que la gente pueda unirse.
          Serás quien la administra.
        </Text>
      )}

      <View style={styles.form}>
        <TextField
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Limpieza de la playa de Bata"
          maxLength={INITIATIVE_LIMITS.name}
          hint={`${name.length}/${INITIATIVE_LIMITS.name}`}
        />

        <TextField
          label="¿Qué hacéis?"
          value={description}
          onChangeText={setDescription}
          placeholder="Quedamos un sábado al mes para recoger plástico. Traemos guantes y bolsas."
          multiline
          numberOfLines={4}
          maxLength={INITIATIVE_LIMITS.description}
          hint={`${description.length}/${INITIATIVE_LIMITS.description}`}
        />

        <View style={styles.group}>
          <Text variant="label" color="textSecondary">
            ¿De qué va?
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel="Tema de la iniciativa">
            {environmentalCategoryOrder.map((key) => {
              const item = environmentalCategories[key];
              const on = category === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => setCategory(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={item.label}
                  style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text variant="captionStrong" color={on ? 'textInverse' : 'text'}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.group}>
          <Text variant="label" color="textSecondary">
            ¿Dónde?
          </Text>
          {zone ? (
            <View style={styles.zone}>
              <Ionicons name="location" size={18} color={colors.accent} />
              <View style={styles.flex}>
                <Text variant="bodyStrong">{zone.name}</Text>
                {zone.detail ? (
                  <Text variant="caption" color="textSecondary">
                    {zone.detail}
                  </Text>
                ) : null}
              </View>
              <Button label="Cambiar" size="sm" variant="ghost" onPress={() => setZone(null)} />
            </View>
          ) : (
            <>
              <TextField
                label="Ciudad o pueblo"
                value={term}
                onChangeText={setTerm}
                placeholder="Bata, Málaga, Duala…"
                hint="Así aparecerá en el mapa."
              />
              {places.status === 'loading' ? <ActivityIndicator color={colors.accent} /> : null}
              {places.status === 'error' ? (
                <Callout tone="error">No se ha podido buscar el lugar. Prueba otra vez.</Callout>
              ) : null}
              {places.status === 'done' && places.places.length === 0 ? (
                <Text variant="caption" color="textSecondary">
                  No encontramos ese lugar.
                </Text>
              ) : null}
              {places.status === 'done'
                ? places.places.slice(0, 5).map((place) => (
                    <Pressable
                      key={place.id}
                      onPress={() => {
                        setZone({ name: place.name, detail: place.detail, lat: place.lat, lng: place.lng });
                        setZoneChanged(true);
                        setTerm('');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`${place.name}, ${place.detail}`}
                      style={({ pressed }) => [styles.placeRow, pressed && styles.pressed]}>
                      <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
                      <View style={styles.flex}>
                        <Text variant="body">{place.name}</Text>
                        <Text variant="caption" color="textSecondary">
                          {place.detail}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                : null}
            </>
          )}
        </View>

        <View style={styles.group}>
          <Text variant="label" color="textSecondary">
            Foto (opcional)
          </Text>
          {cover || editing?.cover_image_url ? (
            <Image
              source={{ uri: cover?.uri ?? editing?.cover_image_url ?? undefined }}
              style={styles.cover}
              contentFit="cover"
              accessibilityLabel="Foto de la iniciativa"
            />
          ) : null}
          <Button
            label={cover || editing?.cover_image_url ? 'Cambiar foto' : 'Añadir foto'}
            variant="secondary"
            size="sm"
            icon="image-outline"
            onPress={pickCover}
          />
        </View>

        {error ? <Callout tone="error">{error}</Callout> : null}

        <Button
          label={editing ? 'Guardar cambios' : 'Crear iniciativa'}
          size="lg"
          fullWidth
          loading={saving}
          disabled={!canSave}
          onPress={save}
        />
        {!canSave && !saving ? (
          <Text variant="caption" color="textSecondary" style={styles.centeredText}>
            Falta: {[!nameOk && 'el nombre', category === null && 'de qué va', zone === null && 'dónde'].filter(Boolean).join(', ')}.
          </Text>
        ) : null}
        <Text variant="caption" color="textSecondary" style={styles.centeredText}>
          Saldrá con la etiqueta «Creada por la comunidad». Puedes crear hasta tres al día.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  headerSpacer: {
    width: 24,
  },
  pressed: {
    opacity: 0.6,
  },
  form: {
    gap: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  group: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
  },
  chipOn: {
    backgroundColor: colors.accent,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  zone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentTint,
  },
  placeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  centeredText: {
    textAlign: 'center',
  },
});
