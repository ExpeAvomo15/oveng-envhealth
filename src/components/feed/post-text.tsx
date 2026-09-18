import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui';
import { showToast } from '@/components/ui/toast';
import { splitByHashtags } from '@/lib/hashtags';

/**
 * Texto de una publicación con las etiquetas en verde.
 *
 * Las etiquetas responden al toque, pero todavía no llevan a ninguna parte: la
 * búsqueda por etiqueta es F2. Se avisa en vez de no hacer nada, que es peor
 * que no poder pulsarlas.
 */
export function PostText({ content }: { content: string }) {
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
            onPress={() => showToast('La búsqueda por etiquetas llega en F2.')}
            accessibilityRole="link"
            accessibilityLabel={`Etiqueta ${segment.tag}`}
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
