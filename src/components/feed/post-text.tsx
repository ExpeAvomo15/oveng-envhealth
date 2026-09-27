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
 * de datos de F2.2. Anotado en notas.md.
 */
export function PostText({ content }: { content: string }) {
  const router = useRouter();
  const segments = splitByHashtags(content);

  return (
    <Text variant="body">
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
}

const styles = StyleSheet.create({
  hashtag: {
    // En web el puntero indica que se puede pulsar.
    cursor: 'pointer',
  },
});
