import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Callout, Screen, Text, TextField } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import type { JobType } from '@/lib/database.types';
import { getEntityBySlug, type EntityResult } from '@/lib/entities';
import { isEntityAdmin } from '@/lib/entity-admins';
import {
  createJob,
  getJob,
  JOB_LIMITS,
  jobTypeLabels,
  jobTypes,
  JobsUnavailable,
  updateJob,
  validateJob,
  type JobDraft,
} from '@/lib/jobs';
import { colors, radius, spacing } from '@/theme';

const EMPTY: JobDraft = { title: '', description: '', location_name: '', type: 'completa', how_to_apply: '' };

type Loaded =
  | { kind: 'ok'; entity: EntityResult; draft: JobDraft; editingId: string | null }
  | { kind: 'not-admin'; entity: EntityResult | null }
  | { kind: 'missing' };

/**
 * Publicar o editar una oferta de empleo (F4.4).
 *
 * `?entidad=<slug>` para una nueva, `?id=<oferta>` para editar. Solo con
 * sesión —la ruta está en el bloque protegido— y solo para quien administra la
 * página: la pantalla lo comprueba para no enseñar un formulario inútil, pero
 * la garantía de verdad es RLS, que rechaza cualquier escritura de quien no lo
 * es.
 */
export default function JobFormScreen() {
  const router = useRouter();
  const { entidad, id } = useLocalSearchParams<{ entidad?: string; id?: string }>();
  const { profile } = useAuth();
  const userId = profile?.id ?? null;

  const key = `${entidad ?? ''}|${id ?? ''}|${userId ?? ''}`;
  const [loaded, setLoaded] = useState<{ key: string; value: Loaded } | null>(null);
  const [draft, setDraft] = useState<JobDraft | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof JobDraft, string>>>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let active = true;

    async function load(): Promise<Loaded> {
      const job = id ? await getJob(id) : null;
      const slug = job?.entity.slug ?? entidad;
      if (!slug) return { kind: 'missing' };
      const entity = await getEntityBySlug(slug);
      if (!entity) return { kind: 'missing' };
      if (job && job.created_by !== userId) return { kind: 'not-admin', entity };
      if (!(await isEntityAdmin(entity.id, userId!))) return { kind: 'not-admin', entity };
      return {
        kind: 'ok',
        entity,
        editingId: job?.id ?? null,
        draft: job
          ? {
              title: job.title,
              description: job.description,
              location_name: job.location_name ?? '',
              type: job.type,
              how_to_apply: job.how_to_apply,
            }
          : { ...EMPTY, location_name: entity.location_name ?? '' },
      };
    }

    load()
      .then((value) => {
        if (!active) return;
        setLoaded({ key, value });
        setDraft(value.kind === 'ok' ? value.draft : null);
      })
      .catch(() => {
        if (active) setLoaded({ key, value: { kind: 'missing' } });
      });
    return () => {
      active = false;
    };
    // `key` resume entidad, id y persona.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loaded?.key === key ? loaded.value : null;

  if (current === null || (current.kind === 'ok' && draft === null)) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (current.kind !== 'ok') {
    return (
      <Screen>
        <View style={styles.container}>
          <Text variant="display">Publicar oferta</Text>
          <Callout tone="error" title={current.kind === 'missing' ? 'No encontramos la página' : 'No administras esta página'}>
            {current.kind === 'missing'
              ? 'La página o la oferta ya no existe.'
              : 'Solo quien administra la página puede publicar o cambiar sus ofertas. Entra en la página y pulsa «Gestionar esta página».'}
          </Callout>
          <Button label="Volver" variant="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/buscar'))} />
        </View>
      </Screen>
    );
  }

  const { entity, editingId } = current;
  const value = draft!;
  const set = (patch: Partial<JobDraft>) => {
    setDraft({ ...value, ...patch });
    setErrors({});
    setFailure(null);
  };

  async function save() {
    const found = validateJob(value);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      if (editingId) await updateJob(editingId, value);
      else await createJob(entity.id, userId!, value);
      showToast(editingId ? 'Oferta guardada.' : 'Oferta publicada. Ya se ve en Buscar → Empleo.');
      router.replace(`/entidad/${entity.slug}`);
    } catch (caught) {
      setFailure(
        caught instanceof JobsUnavailable
          ? 'Las ofertas todavía no están disponibles en esta instalación.'
          : 'No se ha podido guardar la oferta. Revisa tu conexión y prueba otra vez.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen background="surface" avoidKeyboard>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="display">{editingId ? 'Editar oferta' : 'Publicar oferta'}</Text>
          <Text variant="body" color="textSecondary">
            En nombre de {entity.name}. Cualquiera podrá verla, también sin cuenta.
          </Text>
        </View>

        <TextField
          label="Título"
          accessibilityLabel="Título de la oferta"
          value={value.title}
          onChangeText={(title) => set({ title })}
          placeholder="Técnico/a de reforestación"
          maxLength={JOB_LIMITS.title}
          error={errors.title}
        />

        <TextField
          label="Qué se hace en este trabajo"
          accessibilityLabel="Descripción de la oferta"
          value={value.description}
          onChangeText={(description) => set({ description })}
          placeholder="Cuenta las tareas, qué buscáis y qué ofrecéis."
          multiline
          numberOfLines={6}
          maxLength={JOB_LIMITS.description}
          error={errors.description}
          hint={`${value.description.length}/${JOB_LIMITS.description}`}
        />

        <TextField
          label="Dónde"
          accessibilityLabel="Ubicación de la oferta"
          value={value.location_name}
          onChangeText={(location_name) => set({ location_name })}
          placeholder="Bata, Litoral · o «En remoto»"
          maxLength={JOB_LIMITS.location}
        />

        <View style={styles.field}>
          <Text variant="label" color="textSecondary">
            Tipo
          </Text>
          <View style={styles.types} accessibilityRole="radiogroup" accessibilityLabel="Tipo de oferta">
            {jobTypes.map((type: JobType) => {
              const selected = value.type === type;
              return (
                <Pressable
                  key={type}
                  onPress={() => set({ type })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={jobTypeLabels[type]}
                  style={[styles.type, selected && styles.typeSelected]}>
                  <Text variant="label" color={selected ? 'textInverse' : 'textSecondary'}>
                    {jobTypeLabels[type]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <TextField
          label="Cómo aplicar"
          accessibilityLabel="Cómo aplicar"
          value={value.how_to_apply}
          onChangeText={(how_to_apply) => set({ how_to_apply })}
          placeholder="empleo@tuempresa.org o https://tuempresa.org/empleo"
          autoCapitalize="none"
          maxLength={JOB_LIMITS.howToApply}
          hint="Un email o un enlace. Al pulsar, la persona sale de OVENG y te escribe allí."
          error={errors.how_to_apply}
        />

        {failure ? <Callout tone="error">{failure}</Callout> : null}

        <View style={styles.actions}>
          <Button label={editingId ? 'Guardar cambios' : 'Publicar oferta'} size="lg" fullWidth loading={saving} onPress={save} />
          <Button label="Cancelar" variant="ghost" fullWidth onPress={() => router.replace(`/entidad/${entity.slug}`)} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    gap: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  field: {
    gap: spacing.sm,
  },
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  type: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  typeSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  actions: {
    gap: spacing.sm,
  },
});
