import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Callout, Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import type { EntityAdminState } from '@/hooks/use-entity-admin';
import { EntityAdminsUnavailable } from '@/lib/entity-admins';
import type { EntityResult } from '@/lib/entities';
import { colors, radius, spacing } from '@/theme';

export type PageAdminProps = {
  entity: EntityResult;
  admin: EntityAdminState;
  hasSession: boolean;
};

/**
 * "¿Trabajas aquí? Gestionar esta página" (F4.4): el modelo LinkedIn adaptado.
 *
 * Solo hay cuentas de personas; quien trabaja en una entidad reclama su página
 * y queda como administrador **al instante**, porque por ahora la aprobación es
 * automática. Antes de confirmar se dice qué podrá hacer y que el claim es
 * público; y la página lo dice siempre: la verificación llega después.
 *
 * Sin sesión, el botón lleva a la bienvenida: reclamar pide cuenta.
 */
export function PageAdmin({ entity, admin, hasSession }: PageAdminProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  if (admin.isAdmin === null && hasSession) return null;

  async function confirm() {
    setBusy(true);
    try {
      await admin.claim();
      setConfirming(false);
      showToast(`Ya administras ${entity.name}.`);
    } catch (caught) {
      showToast(
        caught instanceof EntityAdminsUnavailable
          ? 'Gestionar páginas todavía no está disponible.'
          : 'No se ha podido completar. Prueba otra vez.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (admin.isAdmin) {
    return (
      <View style={styles.card}>
        <View style={styles.badge} accessibilityLabel="Administras esta página">
          <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
          <Text variant="label" color="accent">
            Administras esta página
          </Text>
        </View>
        <Text variant="caption" color="textSecondary">
          Puedes publicar ofertas de empleo en nombre de {entity.name}. La verificación de
          administradores llegará pronto.
        </Text>
        <View style={styles.actions}>
          <Button
            label="Publicar oferta"
            size="sm"
            onPress={() => router.push(`/oferta?entidad=${entity.slug}`)}
          />
          <Button
            label="Dejar de administrar"
            size="sm"
            variant="ghost"
            onPress={() => {
              void admin.leave().then(() => showToast('Ya no administras esta página.'));
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">¿Trabajas aquí?</Text>
        <Text variant="caption" color="textSecondary">
          {admin.count > 0
            ? `${admin.count === 1 ? '1 persona administra' : `${admin.count} personas administran`} esta página.`
            : 'Nadie administra esta página todavía.'}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button
          label={hasSession ? 'Gestionar esta página' : 'Inicia sesión para gestionarla'}
          size="sm"
          variant="secondary"
          onPress={() => (hasSession ? setConfirming(true) : router.push('/welcome'))}
        />
      </View>

      {confirming ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setConfirming(false)}>
          <Pressable style={styles.backdrop} onPress={() => setConfirming(false)}>
            <Pressable style={styles.sheet} onPress={() => undefined} accessible={false}>
              <Text variant="subtitle">Gestionar {entity.name}</Text>
              <Text variant="body">Si administras esta página podrás:</Text>
              <View style={styles.list}>
                <Text variant="body">• Publicar ofertas de empleo en su nombre.</Text>
                <Text variant="body">• Cambiarlas y cerrarlas cuando ya no busquéis a nadie.</Text>
              </View>
              <Callout tone="info">
                Es público: cualquiera verá que administras esta página. La verificación de
                administradores llegará pronto; hasta entonces, entras al momento.
              </Callout>
              <Button label="Sí, gestionar esta página" fullWidth loading={busy} onPress={confirm} />
              <Button label="Ahora no" variant="ghost" fullWidth onPress={() => setConfirming(false)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  flex: {
    gap: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    backgroundColor: colors.accentTint,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
  list: {
    gap: spacing.xs,
  },
});
