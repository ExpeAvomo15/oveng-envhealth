import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { splitByHashtags } from '@/lib/hashtags';

/**
 * Texto de una publicación con las etiquetas en verde.
 *
 * Desde F2.2 las etiquetas **llevan a Buscar** con el término ya puesto, en vez
 * de avisar de que no llevan a ninguna parte.
 *
 * Ojo con lo que encuentran: Buscar es el directorio de entidades y personas,
 * así que tocar #reforestación busca empresas, iniciativas y lugares que hablen
 * de reforestación — **no publicaciones con esa etiqueta**. Buscar
 * publicaciones por etiqueta necesita consultar `posts`, que no está en la capa
 * de datos de F2.2. Anotado en notas-archivo-f0-f2.md.
 */
export function PostText({ content, collapsed = false }: { content: string; collapsed?: boolean }) {
  const router = useRouter();
  const segments = splitByHashtags(content);
  // En el feed, un texto largo se corta a cuatro líneas con "ver más", como en
  // Instagram (F4.6b). No es un botón aparte: va dentro del cuerpo de la
  // tarjeta, que ya lleva al detalle, donde se lee entero. Un pulsable dentro
  // de otro haría que en web el toque navegara además.
  const clamp = collapsed && content.length > LONG_TEXT;

  const text = (
    <Text variant="body" numberOfLines={clamp ? 4 : undefined}>
      {segments.map((segment, index) =>
        // Los trozos no tienen identidad propia: el índice es la única clave
        // posible, y la lista se reconstruye entera cuando cambia el texto.
        segment.kind === 'text' ? (
          <Text key={index} variant="body">
            {segment.value}
          </Text>
        ) : (
          <Text
            key={index}
            variant="body"
            color="accent"
            onPress={() => router.push(`/buscar?q=${encodeURIComponent(segment.tag)}`)}
            accessibilityRole="link"
            accessibilityLabel={`Buscar ${segment.tag}`}
            style={styles.hashtag}>
            {segment.value}
          </Text>
        ),
      )}
    </Text>
  );

  if (!clamp) return text;
  return (
    <>
      {text}
      <Text variant="body" color="textSecondary">
        ver más
      </Text>
    </>
  );
}

/** A partir de aquí, en el feed, el texto se corta. Unas cuatro líneas en un móvil. */
const LONG_TEXT = 180;

const styles = StyleSheet.create({
  hashtag: {
    // En web el puntero indica que se puede pulsar.
    cursor: 'pointer',
  },
});
