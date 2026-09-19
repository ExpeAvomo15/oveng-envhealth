import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ImpactCard, ProfileCounts, ProfileHeader, ProfileTabs, type ProfileTab } from '@/components/profile';
import { Button, Callout, Screen, Text } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { EMPTY_COUNTS, getProfileCounts, type ProfileCounts as Counts } from '@/lib/profiles';
import { colors, radius, screenPadding, shadows, spacing } from '@/theme';

/** Perfil propio. El de otras cuentas vive en `/user/[username]`. */
export default function ProfileScreen() {
  const router = useRouter();
  const { profile, profileLoading, refreshProfile, signOut } = useAuth();

  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const [countsLoading, setCountsLoading] = useState(true);
  const [tab, setTab] = useState<ProfileTab>('publicaciones');
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  const userId = profile?.id ?? null;

  // Al volver de editar el perfil hay que releer: los cambios se guardaron en
  // otra pantalla y esta se quedó con los datos de antes.
  useFocusEffect(
    useCallback(() => {
      let active = true;

      void refreshProfile();

      if (userId) {
        setCountsLoading(true);
        getProfileCounts(userId)
          .then((value) => {
            if (active) setCounts(value);
          })
          .catch(() => {
            if (active) setCounts(EMPTY_COUNTS);
          })
          .finally(() => {
            if (active) setCountsLoading(false);
          });
      }

      return () => {
        active = false;
      };
    }, [userId, refreshProfile]),
  );

  async function handleSignOut() {
    setMenuOpen(false);
    setSigningOut(true);
    setError(null);

    const result = await signOut();
    if (result.error) {
      setError(result.error);
      setSigningOut(false);
    }
  }

  if (!profile) {
    return (
      <Screen>
        <View style={styles.fallback}>
          {profileLoading ? (
            <Text variant="body" color="textSecondary">
              Cargando tu perfil…
            </Text>
          ) : (
            <Callout tone="error" title="No hay perfil para esta cuenta">
              La sesión existe pero `profiles` no tiene su fila. Suele significar que el trigger
              on_auth_user_created falló al registrarte.
            </Callout>
          )}
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ProfileHeader profile={profile} />

      <View style={styles.actions}>
        <Button
          label="Editar perfil"
          variant="secondary"
          onPress={() => router.push('/editar-perfil')}
          style={styles.editButton}
        />

        <Pressable
          onPress={() => setMenuOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel="Más opciones"
          accessibilityState={{ expanded: menuOpen }}
          style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
        </Pressable>

      </View>

      {/*
        El menú va en un Modal, no en una vista absoluta dentro de la cabecera.
        Dentro, la fila de contadores quedaba por encima en el orden de pintado
        y se comía el toque: el menú se veía pero no se podía pulsar. Además, en
        Android un hijo que sobresale de su padre no recibe toques.
      */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}>
        <Pressable
          style={styles.backdrop}
          accessibilityRole="button"
          accessibilityLabel="Cerrar el menú"
          onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <Pressable
              onPress={handleSignOut}
              accessibilityRole="menuitem"
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
              <Ionicons name="log-out-outline" size={20} color={colors.text} />
              <Text variant="body">{signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {error ? (
        <View style={styles.inset}>
          <Callout tone="error">{error}</Callout>
        </View>
      ) : null}

      <ProfileCounts counts={counts} loading={countsLoading} />

      <View style={styles.impact}>
        <ImpactCard
          icon="leaf"
          title="Tu impacto ambiental"
          value="Excelente"
          note="Se calculará con tu actividad en F2."
        />
        <ImpactCard
          icon="star"
          tone="warning"
          title="Puntos OVENG"
          value="0"
          note="Se ganan participando en iniciativas."
        />
      </View>

      <ProfileTabs active={tab} onChange={setTab} />

      <View style={styles.tabContent}>
        {tab === 'publicaciones' ? (
          <EmptyState
            icon="document-text-outline"
            title="Todavía no has publicado nada"
            detail="Cuando crees tu primera publicación aparecerá aquí."
          />
        ) : (
          <EmptyState
            icon="bookmark-outline"
            title="Guardados"
            detail="Próximamente: aquí tendrás las publicaciones que guardes."
          />
        )}
      </View>
    </Screen>
  );
}

function EmptyState({
  icon,
  title,
  detail,
}: {
  icon: 'document-text-outline' | 'bookmark-outline';
  title: string;
  detail: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={28} color={colors.accent} />
      </View>
      <Text variant="subtitle" style={styles.centered}>
        {title}
      </Text>
      <Text variant="caption" color="textSecondary" style={styles.centered}>
        {detail}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.md,
  },
  inset: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.lg,
  },
  editButton: {
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingHorizontal: screenPadding,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  menu: {
    minWidth: 220,
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.floating,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
  },
  pressed: {
    opacity: 0.6,
  },
  impact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    padding: screenPadding,
  },
  tabContent: {
    paddingHorizontal: screenPadding,
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
});
