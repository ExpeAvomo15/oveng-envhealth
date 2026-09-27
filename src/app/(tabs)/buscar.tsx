import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  EntityCard,
  PersonCard,
  ResultSkeleton,
  ScopeChips,
  SearchBar,
  SuggestionCard,
  TrendChip,
  suggestions,
  trendingTopics,
} from '@/components/search';
import { Callout, Screen, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import type { EnvironmentalCategoryName, Profile } from '@/lib/database.types';
import {
  EntityFollowsUnavailable,
  followEntity,
  getFollowedEntityIds,
  unfollowEntity,
  type EntityResult,
} from '@/lib/entities';
import { followUser, getFollowedUserIds, unfollowUser } from '@/lib/profiles';
import {
  EMPTY_RESULTS,
  hasResults,
  search,
  totalResults,
  type SearchResults,
  type SearchScope,
} from '@/lib/search';
import { colors, radius, spacing } from '@/theme';

/** Espera antes de consultar: no se busca con cada tecla. */
const DEBOUNCE_MS = 300;

/**
 * Buscar — el directorio de entidades y personas.
 *
 * Tiene dos estados y se distinguen por una sola cosa, `active`: sin búsqueda
 * enseña sugerencias y tendencias (que es lo que resuelve el arranque en frío,
 * cuando el feed está vacío y no hay a quién seguir), y con búsqueda enseña
 * resultados. Agrupados por tipo cuando el alcance es "Todo", en lista plana
 * cuando hay un chip concreto: si ya has dicho "Empresas", los títulos de
 * sección sobran.
 */
export default function SearchScreen() {
  const router = useRouter();
  const { profile: viewer } = useAuth();
  // Las etiquetas del feed navegan aquí con el término ya puesto.
  const { q } = useLocalSearchParams<{ q?: string }>();

  const [term, setTerm] = useState('');
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>('todo');
  const [category, setCategory] = useState<EnvironmentalCategoryName | undefined>();

  /**
   * Resultados y error se guardan **junto a la búsqueda a la que pertenecen**.
   *
   * Así `loading` no es un estado que haya que encender y apagar a mano —es
   * "todavía no hay respuesta para esta búsqueda"— y una respuesta que llega
   * tarde no puede pintarse sobre otra búsqueda. Es el mismo patrón que usa el
   * perfil público con el username.
   */
  const [loaded, setLoaded] = useState<{ key: string; results: SearchResults } | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);

  const [followedEntities, setFollowedEntities] = useState<Set<string>>(new Set());
  const [followedPeople, setFollowedPeople] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const viewerId = viewer?.id ?? null;
  /**
   * Hay búsqueda activa con texto, con categoría **o con un chip que no sea
   * "Todo"**: pulsar "Empresas" sin escribir nada pide ver las empresas, que es
   * cómo se recorre el directorio sin saber qué buscar. Solo "Todo" y sin nada
   * escrito deja la pantalla en modo descubrimiento.
   */
  const active = query.trim().length > 0 || category !== undefined || scope !== 'todo';

  /** Identidad de la búsqueda actual. `null` cuando no hay ninguna. */
  const searchKey = active ? `${scope}|${category ?? ''}|${query.trim()}` : null;

  const results = loaded !== null && loaded.key === searchKey ? loaded.results : null;
  const error = failed !== null && failed.key === searchKey ? failed.message : null;
  const loading = active && results === null && error === null;

  /**
   * Un término que llega por la URL —lo que hacen las etiquetas del feed— se
   * trata como si se hubiera escrito.
   *
   * El ajuste va **en el render y no en un efecto**: es estado derivado de un
   * parámetro, y hacerlo en un efecto provoca un render de más con el valor
   * viejo en pantalla. React reacciona al `setState` durante el render sin
   * llegar a pintar el intermedio.
   */
  const [appliedQuery, setAppliedQuery] = useState<string | null>(null);
  if (typeof q === 'string' && q.length > 0 && q !== appliedQuery) {
    setAppliedQuery(q);
    setTerm(q);
    setQuery(q);
    setCategory(undefined);
    setScope('todo');
  }

  /**
   * Debounce del texto. La categoría y el alcance no lo necesitan: son de un
   * toque, no de tecleo, y esperar 300 ms tras pulsar un chip se nota.
   */
  useEffect(() => {
    const timer = setTimeout(() => setQuery(term), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    // Sin búsqueda activa no se consulta nada: la pantalla enseña sugerencias.
    if (searchKey === null) return;

    // La limpieza marca esta petición como abandonada. Sin esto, una respuesta
    // lenta de una búsqueda anterior se pintaría encima de la actual.
    let live = true;

    search({ term: query, scope, category })
      .then(async (found) => {
        if (!live) return;
        setLoaded({ key: searchKey, results: found });

        if (!viewerId) return;

        // El estado de los botones, en dos consultas para toda la lista.
        const entityIds = [...found.empresas, ...found.iniciativas, ...found.lugares].map(
          (entity) => entity.id,
        );
        const peopleIds = found.personas.map((person) => person.id);

        const [entities, people] = await Promise.all([
          getFollowedEntityIds(viewerId, entityIds),
          getFollowedUserIds(viewerId, peopleIds),
        ]);

        if (!live) return;
        setFollowedEntities(entities);
        setFollowedPeople(people);
      })
      .catch(() => {
        if (!live) return;
        setFailed({
          key: searchKey,
          message: 'No se ha podido completar la búsqueda. Inténtalo de nuevo.',
        });
      });

    return () => {
      live = false;
    };
  }, [searchKey, query, scope, category, viewerId]);

  const onChangeTerm = useCallback((value: string) => {
    setTerm(value);
    // Escribir manda sobre la tarjeta temática que se hubiera pulsado antes.
    setCategory(undefined);
  }, []);

  function searchTopic(topic: string) {
    setTerm(topic);
    setQuery(topic);
    setCategory(undefined);
    setScope('todo');
  }

  function searchCategory(next: EnvironmentalCategoryName) {
    setTerm('');
    setQuery('');
    setCategory(next);
    setScope('todo');
  }

  async function toggleEntityFollow(entity: EntityResult) {
    if (!viewerId || busyId) return;

    const next = !followedEntities.has(entity.id);
    setBusyId(entity.id);
    setFollowedEntities((previous) => toggled(previous, entity.id, next));

    try {
      if (next) await followEntity(viewerId, entity.id);
      else await unfollowEntity(viewerId, entity.id);
    } catch (caught) {
      setFollowedEntities((previous) => toggled(previous, entity.id, !next));
      showToast(
        caught instanceof EntityFollowsUnavailable
          ? 'Seguir entidades todavía no está disponible.'
          : next
            ? 'No se ha podido seguir la entidad.'
            : 'No se ha podido dejar de seguir.',
      );
    } finally {
      setBusyId(null);
    }
  }

  async function togglePersonFollow(person: Profile) {
    if (!viewerId || busyId) return;

    const next = !followedPeople.has(person.id);
    setBusyId(person.id);
    setFollowedPeople((previous) => toggled(previous, person.id, next));

    try {
      if (next) await followUser(viewerId, person.id);
      else await unfollowUser(viewerId, person.id);
    } catch {
      setFollowedPeople((previous) => toggled(previous, person.id, !next));
      showToast(next ? 'No se ha podido seguir la cuenta.' : 'No se ha podido dejar de seguir.');
    } finally {
      setBusyId(null);
    }
  }

  const shown = results ?? EMPTY_RESULTS;

  const entitySections = useMemo(
    () =>
      [
        { key: 'empresa' as const, title: 'Empresas', rows: shown.empresas },
        { key: 'iniciativa' as const, title: 'Iniciativas', rows: shown.iniciativas },
        { key: 'lugar' as const, title: 'Lugares', rows: shown.lugares },
      ].filter((section) => section.rows.length > 0),
    [shown],
  );

  const renderEntity = (entity: EntityResult) => (
    <EntityCard
      key={entity.id}
      entity={entity}
      following={followedEntities.has(entity.id)}
      busy={busyId === entity.id}
      onPress={() => router.push(`/entidad/${entity.slug}`)}
      onToggleFollow={() => toggleEntityFollow(entity)}
    />
  );

  const renderPerson = (person: Profile) => (
    <PersonCard
      key={person.id}
      profile={person}
      following={followedPeople.has(person.id)}
      busy={busyId === person.id}
      canFollow={person.id !== viewerId}
      onPress={() => router.push(`/user/${person.username}`)}
      onToggleFollow={() => togglePersonFollow(person)}
    />
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text variant="display">Buscar</Text>
        <SearchBar value={term} onChange={onChangeTerm} />
        <ScopeChips value={scope} onChange={setScope} />
      </View>

      {error ? (
        <View style={styles.block}>
          <Callout tone="error">{error}</Callout>
        </View>
      ) : null}

      {!active ? (
        <View style={styles.blocks}>
          <View style={styles.block}>
            <SectionTitle title="Sugerencias" />
            <View style={styles.list}>
              {suggestions.map((suggestion) => (
                <SuggestionCard
                  key={suggestion.title}
                  suggestion={suggestion}
                  onPress={() => searchCategory(suggestion.category)}
                />
              ))}
            </View>
          </View>

          <View style={styles.block}>
            <SectionTitle title="Tendencias" />
            <View style={styles.chips}>
              {trendingTopics.map((topic) => (
                <TrendChip key={topic} topic={topic} onPress={() => searchTopic(topic)} />
              ))}
            </View>
          </View>
        </View>
      ) : loading ? (
        <View style={styles.list}>
          <ResultSkeleton />
          <ResultSkeleton />
          <ResultSkeleton />
        </View>
      ) : !hasResults(shown) ? (
        <EmptyResults term={query} category={category} />
      ) : scope === 'todo' ? (
        <View style={styles.blocks}>
          {entitySections.map((section) => (
            <View key={section.key} style={styles.block}>
              <SectionTitle
                title={section.title}
                onSeeAll={() => setScope(section.key)}
              />
              <View style={styles.list}>{section.rows.map(renderEntity)}</View>
            </View>
          ))}

          {shown.personas.length > 0 ? (
            <View style={styles.block}>
              <SectionTitle title="Personas" onSeeAll={() => setScope('persona')} />
              <View style={styles.list}>{shown.personas.map(renderPerson)}</View>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.block}>
          <Text variant="caption" color="textSecondary">
            {totalResults(shown) === 1 ? '1 resultado' : `${totalResults(shown)} resultados`}
          </Text>
          <View style={styles.list}>
            {scope === 'persona'
              ? shown.personas.map(renderPerson)
              : [...shown.empresas, ...shown.iniciativas, ...shown.lugares].map(
                  renderEntity,
                )}
          </View>
        </View>
      )}
    </Screen>
  );
}

/** Añade o quita un id sin mutar el conjunto anterior. */
function toggled(set: Set<string>, id: string, present: boolean): Set<string> {
  const next = new Set(set);
  if (present) next.add(id);
  else next.delete(id);
  return next;
}

function SectionTitle({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="subtitle">{title}</Text>
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="button"
          accessibilityLabel={`Ver todo en ${title}`}
          style={({ pressed }) => [styles.seeAll, pressed && styles.pressed]}>
          <Text variant="label" color="accent">
            Ver todo
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.accent} />
        </Pressable>
      ) : null}
    </View>
  );
}

/**
 * Vacío con salida. Decir "sin resultados" y callarse deja a quien busca sin
 * saber qué hacer; aquí se dice qué se ha buscado y qué se puede probar.
 */
function EmptyResults({
  term,
  category,
}: {
  term: string;
  category: EnvironmentalCategoryName | undefined;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="search-outline" size={28} color={colors.accent} />
      </View>
      <Text variant="subtitle" style={styles.centered}>
        Sin resultados
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.centered}>
        {category
          ? 'Todavía no hay nada en esta categoría. Prueba con otra o escribe qué buscas.'
          : `No hay nada que coincida con "${term}". Prueba con menos palabras, o busca por lugar — "Monte Alén", "Bata".`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  blocks: {
    gap: spacing.xl,
  },
  block: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  centered: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
