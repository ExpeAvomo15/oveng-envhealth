import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';

import { PostCard } from '@/components/feed/post-card';
import { JobCard } from '@/components/search';
import { Button, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import type { EntityResult } from '@/lib/entities';
import { fetchPlacePosts, type FeedPost } from '@/lib/feed';
import { directionsUrl } from '@/lib/geo';
import { listEntityJobs, updateJob, type JobWithEntity } from '@/lib/jobs';
import { colors, radius, spacing } from '@/theme';

/**
 * Secciones del perfil de una entidad que llegan con F4.4. Cada una carga lo
 * suyo, así que la ficha no espera a todas para pintarse.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="subtitle">{title}</Text>
      {children}
    </View>
  );
}

function Empty({ icon, text }: { icon: 'briefcase-outline' | 'images-outline'; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text variant="caption" color="textSecondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
}

/**
 * "Empleo": las ofertas de la página. Lectura libre. Quien la administra ve
 * además las suyas desactivadas (RLS solo se las enseña a quien las creó) y
 * puede editarlas o cerrarlas.
 *
 * Si la página no tiene ofertas y quien mira no la administra, la sección no
 * sale: un "no hay ofertas" en cada ficha sería ruido.
 */
export function EntityJobs({
  entity,
  isAdmin,
  userId,
}: {
  entity: EntityResult;
  isAdmin: boolean;
  userId: string | null;
}) {
  const router = useRouter();
  const key = `${entity.id}|${userId ?? ''}`;
  const [loaded, setLoaded] = useState<{ key: string; jobs: JobWithEntity[] } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    listEntityJobs(entity.id)
      .then((jobs) => {
        if (active) setLoaded({ key, jobs });
      })
      .catch(() => {
        if (active) setLoaded({ key, jobs: [] });
      });
    return () => {
      active = false;
    };
    // `key` resume entidad y persona; `version` fuerza recargar tras un cambio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);

  const jobs = loaded?.key === key ? loaded.jobs : null;
  if (jobs === null) return null;
  if (jobs.length === 0 && !isAdmin) return null;

  async function toggle(job: JobWithEntity) {
    try {
      await updateJob(job.id, { active: !job.active });
      showToast(job.active ? 'Oferta cerrada: ya no se ve en Empleo.' : 'Oferta abierta otra vez.');
      setVersion((value) => value + 1);
    } catch {
      showToast('No se ha podido cambiar la oferta.');
    }
  }

  return (
    <Section title="Empleo">
      {jobs.length === 0 ? (
        <Empty icon="briefcase-outline" text="Aún no hay ofertas aquí. Publica la primera desde «Publicar oferta»." />
      ) : (
        <View style={styles.list}>
          {jobs.map((job) => (
            <View key={job.id} style={styles.item}>
              <JobCard job={job} hideEntity onPress={() => router.push(`/empleo/${job.id}`)} />
              {isAdmin && job.created_by === userId ? (
                <View style={styles.adminRow}>
                  <Button
                    label="Editar"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push(`/oferta?id=${job.id}`)}
                  />
                  <Button
                    label={job.active ? 'Cerrar oferta' : 'Abrir otra vez'}
                    size="sm"
                    variant="ghost"
                    onPress={() => toggle(job)}
                  />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </Section>
  );
}

/**
 * "Para tu visita" (F4.4): en un lugar de Turismo Verde, el botón que abre el
 * mapa de OVENG centrado en él, con su aire y su suelo de ahora.
 */
export function VisitCard({ entity }: { entity: EntityResult }) {
  const router = useRouter();
  if (entity.lat === null || entity.lng === null) return null;

  return (
    <Section title="Para tu visita">
      <View style={styles.visit}>
        <Ionicons name="map-outline" size={22} color={colors.accent} />
        <Text variant="caption" color="textSecondary" style={styles.flex}>
          Míralo en el mapa con el aire y el suelo de ahora, y qué hay cerca.
        </Text>
        <View style={styles.visitActions}>
          <Button label="Ver en el mapa" size="sm" onPress={() => router.push(`/mapa?entidad=${entity.slug}`)} />
          {/* Google Maps en el punto exacto (F4.5). Sale de OVENG y lo dice. */}
          <Button
            label="Cómo llegar ↗"
            size="sm"
            variant="secondary"
            onPress={() => void Linking.openURL(directionsUrl({ lat: entity.lat!, lng: entity.lng! }))}
          />
        </View>
      </View>
    </Section>
  );
}

/**
 * "Publicaciones" (F4.4): lo que la gente ha publicado etiquetando este lugar.
 * Es lo que convierte un lugar en algo más que una ficha de datos.
 */
export function PlacePosts({ entity, viewerId }: { entity: EntityResult; viewerId: string | null }) {
  const key = `${entity.id}|${viewerId ?? ''}`;
  const [loaded, setLoaded] = useState<{ key: string; posts: FeedPost[] | null } | null>(null);

  useEffect(() => {
    let active = true;
    fetchPlacePosts(entity.id, viewerId)
      .then((posts) => {
        if (active) setLoaded({ key, posts });
      })
      .catch(() => {
        if (active) setLoaded({ key, posts: null });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const current = loaded?.key === key ? loaded : null;

  return (
    <Section title="Publicaciones">
      {current === null ? (
        <ActivityIndicator color={colors.accent} />
      ) : current.posts === null ? (
        <Empty icon="images-outline" text="No se han podido cargar las publicaciones de este lugar." />
      ) : current.posts.length === 0 ? (
        <Empty
          icon="images-outline"
          text={`Aún nadie ha publicado desde ${entity.name}. Si vas, cuéntalo: al publicar, pulsa «Etiquetar un lugar».`}
        />
      ) : (
        <View style={styles.list}>
          {current.posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </View>
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  item: {
    gap: spacing.xs,
  },
  adminRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  visitActions: {
    gap: spacing.xs,
  },
  visit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.accentTint,
  },
});
