import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import { EntityAvatar } from '@/components/search';
import { Button, Callout, Screen, Text } from '@/components/ui';
import { entityTypeLabels } from '@/lib/entities';
import { applyHref, applyKind, getJob, isExampleJob, jobTypeLabels, type JobWithEntity } from '@/lib/jobs';
import { relativeTime } from '@/lib/time';
import { colors, radius, spacing } from '@/theme';

/**
 * Detalle de una oferta de empleo (F4.4). Lectura libre: se ve sin cuenta y
 * se puede compartir por enlace.
 *
 * "Cómo aplicar" lleva fuera de OVENG —un correo o la web de la entidad— y lo
 * avisa antes: quien pulsa tiene que saber que se va a otra parte. Las ofertas
 * de ejemplo de la demo no llevan a ningún sitio y lo dicen.
 */
export default function JobScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loaded, setLoaded] = useState<{ id: string; job: JobWithEntity | null } | null>(null);
  const [leaving, setLeaving] = useState(false);

  const current = loaded?.id === id ? loaded : null;
  const job = current?.job ?? null;

  useEffect(() => {
    if (!id) return;
    let active = true;
    getJob(id)
      .then((found) => {
        if (active) setLoaded({ id, job: found });
      })
      .catch(() => {
        if (active) setLoaded({ id, job: null });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/buscar'));

  if (current === null) {
    return (
      <Screen scroll={false}>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen>
        <View style={styles.notFound}>
          <Text variant="title">Esta oferta ya no está</Text>
          <Text variant="body" color="textSecondary">
            Puede que se haya cerrado o que el enlace esté mal.
          </Text>
          <Button label="Ver otras ofertas" variant="secondary" onPress={() => router.replace('/buscar')} />
        </View>
      </Screen>
    );
  }

  const example = isExampleJob(job);
  const href = applyHref(job.how_to_apply);
  const kind = applyKind(job.how_to_apply);
  const where = job.location_name ?? job.entity.location_name;

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={back}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text variant="subtitle">Oferta de empleo</Text>
      </View>

      <View style={styles.body}>
        <Text variant="title" accessibilityRole="header">
          {job.title}
        </Text>

        <Pressable
          onPress={() => router.push(`/entidad/${job.entity.slug}`)}
          accessibilityRole="link"
          accessibilityLabel={`Ver la página de ${job.entity.name}`}
          style={({ pressed }) => [styles.entity, pressed && styles.pressed]}>
          <EntityAvatar category={job.entity.category} size={40} />
          <View style={styles.flex}>
            <Text variant="bodyStrong">{job.entity.name}</Text>
            <Text variant="caption" color="textSecondary">
              {entityTypeLabels[job.entity.type]}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.facts}>
          <Fact icon="briefcase-outline" text={jobTypeLabels[job.type]} />
          {where ? <Fact icon="location-outline" text={where} /> : null}
          <Fact icon="time-outline" text={`Publicada hace ${relativeTime(job.created_at)}`} />
        </View>

        {example ? (
          <Callout tone="info" title="Oferta de ejemplo">
            La ha cargado OVENG para enseñar cómo se ve el empleo en la demo. No es una oferta real.
          </Callout>
        ) : null}
        {!job.active ? (
          <Callout tone="info" title="Desactivada">
            Esta oferta ya no acepta candidaturas. Solo la ve quien la publicó.
          </Callout>
        ) : null}

        <View style={styles.section}>
          <Text variant="subtitle">Sobre el trabajo</Text>
          <Text variant="body">{job.description}</Text>
        </View>

        {!example && job.active && href ? (
          <Button
            label="Cómo aplicar"
            size="lg"
            fullWidth
            onPress={() => setLeaving(true)}
          />
        ) : null}
      </View>

      {leaving && href ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLeaving(false)}>
          <Pressable style={styles.backdrop} onPress={() => setLeaving(false)}>
            <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
              <Text variant="subtitle">Vas a salir de OVENG</Text>
              <Text variant="body" color="textSecondary">
                {kind === 'email'
                  ? `Se abrirá tu correo para escribir a ${job.how_to_apply.trim()}. OVENG no ve lo que envías.`
                  : `Se abrirá la web de ${job.entity.name} (${job.how_to_apply.trim()}). OVENG no responde de lo que hay allí.`}
              </Text>
              <Button
                label={kind === 'email' ? 'Abrir mi correo' : 'Ir a la web'}
                fullWidth
                onPress={() => {
                  setLeaving(false);
                  void Linking.openURL(href);
                }}
              />
              <Button label="Quedarme en OVENG" variant="ghost" fullWidth onPress={() => setLeaving(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </Screen>
  );
}

function Fact({ icon, text }: { icon: 'briefcase-outline' | 'location-outline' | 'time-outline'; text: string }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text variant="body" color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  back: {
    padding: spacing.xs,
  },
  body: {
    gap: spacing.lg,
  },
  entity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  flex: {
    flex: 1,
  },
  facts: {
    gap: spacing.sm,
  },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
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
  pressed: {
    opacity: 0.6,
  },
});
