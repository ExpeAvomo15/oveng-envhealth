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

/**
 * Marca de tiempo de un bloque de mensajes, en llano y como en Instagram:
 * "Hoy 16:45", "Ayer 14:58", "lunes 10:02" dentro de la semana y "12 oct
 * 10:02" más atrás.
 */
export function chatStamp(isoDate: string, now: Date = new Date()): string {
  const then = new Date(isoDate);
  const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(then);
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.round((startOfDay(now) - startOfDay(then)) / 86_400_000);

  if (days <= 0) return `Hoy ${time}`;
  if (days === 1) return `Ayer ${time}`;
  if (days < 7) return `${new Intl.DateTimeFormat('es-ES', { weekday: 'long' }).format(then)} ${time}`;

  const sameYear = then.getFullYear() === now.getFullYear();
  const date = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(then);
  return `${date} ${time}`;
}
