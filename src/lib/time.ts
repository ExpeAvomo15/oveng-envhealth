/** Tiempo relativo en español, con el detalle justo para un feed. */
export function relativeTime(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate);
  const seconds = Math.max(0, Math.floor((now.getTime() - then.getTime()) / 1000));

  if (seconds < 60) return 'ahora';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;

  const days = Math.floor(hours / 24);
  if (days <= 7) return `${days} d`;

  // Pasada una semana, la fecha dice más que "hace 23 d".
  const sameYear = then.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(then);
}
