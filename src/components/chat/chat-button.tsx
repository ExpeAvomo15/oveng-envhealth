import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { useStartChat } from '@/hooks/use-messages';
import { colors } from '@/theme';

export type ChatButtonProps = {
  /** La persona con la que se abre la conversación. */
  personId: string;
  /** Su nombre, para el nombre accesible: "Enviar mensaje a Ana". */
  personName: string;
  size?: number;
};

/**
 * El bocadillo de chat junto a una persona (F4.6): el gesto que todo el mundo
 * reconoce de WhatsApp o Instagram, para que se vea que con esa cuenta se puede
 * hablar sin tener que entrar en su perfil a buscarlo.
 *
 * En la propia cuenta no se pinta. Sin sesión lleva a la bienvenida, como
 * seguir: se ve que se puede, y se pide la cuenta al actuar.
 */
export function ChatButton({ personId, personName, size = 36 }: ChatButtonProps) {
  const { start, opening, me } = useStartChat();
  if (me === personId) return null;
  const busy = opening === personId;

  return (
    <Pressable
      onPress={() => void start(personId)}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`Enviar mensaje a ${personName}`}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size, borderRadius: size / 2 },
        pressed && styles.pressed,
      ]}>
      {busy ? (
        <ActivityIndicator size="small" color={colors.accent} />
      ) : (
        <Ionicons name="chatbubble-ellipses-outline" size={Math.round(size * 0.55)} color={colors.accent} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentTint,
  },
  pressed: {
    opacity: 0.6,
  },
});
