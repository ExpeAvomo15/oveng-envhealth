import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Ruta antigua del detalle. Desde F4.7 la publicación vive en
 * `/publicacion/[id]`; esta solo existe para que los enlaces que ya se
 * compartieron sigan llevando a su sitio.
 */
export default function LegacyPostRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/publicacion/[id]', params: { id } }} />;
}
