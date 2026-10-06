/**
 * Distancias y enlaces de mapa para Turismo Verde (F4.5).
 *
 * Sin PostGIS: los lugares son decenas, así que se ordenan en el cliente con la
 * fórmula del haversine, que da la distancia en línea recta sobre la esfera.
 * No es la distancia por carretera —eso lo dice Google Maps al pulsar "Cómo
 * llegar"—, y la tarjeta dice "a X km", no "a X km en coche".
 */

export type Point = { lat: number; lng: number };

const EARTH_RADIUS_KM = 6371;

/** Distancia en línea recta entre dos puntos, en kilómetros. */
export function distanceKm(a: Point, b: Point): number {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** "a 800 m", "a 4,2 km", "a 37 km", "a 1.240 km". */
export function formatDistance(km: number): string {
  if (km < 1) return `a ${Math.round(km * 100) * 10} m`;
  if (km < 10) return `a ${km.toFixed(1).replace('.', ',')} km`;
  return `a ${Math.round(km).toLocaleString('es-ES')} km`;
}

/**
 * "Cómo llegar": Google Maps en el punto exacto de la entidad. `?q=lat,lng`
 * pone un marcador en esas coordenadas y deja a Google calcular la ruta desde
 * donde esté la persona. En móvil abre la app si está instalada.
 */
export function directionsUrl(point: Point): string {
  return `https://www.google.com/maps?q=${point.lat},${point.lng}`;
}
