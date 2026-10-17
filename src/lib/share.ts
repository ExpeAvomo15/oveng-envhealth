import { Platform, Share } from 'react-native';

/**
 * Compartir un enlace fuera de OVENG (F4.7).
 *
 * En el móvil, la hoja nativa del sistema: en web es la Web Share API
 * (`navigator.share`), que abre WhatsApp, Telegram, el correo…; en iOS y
 * Android, `Share` de React Native. En un escritorio sin Web Share no hay hoja
 * que abrir, y se copia el enlace.
 */

export type ShareOutcome = 'shared' | 'copied' | 'cancelled' | 'failed';

type WebNavigator = Navigator & { share?: (data: ShareData) => Promise<void> };

/** ¿Hay hoja nativa de compartir? En web, solo si el navegador tiene Web Share. */
export function canShareNatively(): boolean {
  if (Platform.OS !== 'web') return true;
  return typeof navigator !== 'undefined' && typeof (navigator as WebNavigator).share === 'function';
}

export async function copyLink(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}

export async function shareLink({ url, title, text }: { url: string; title: string; text?: string }): Promise<ShareOutcome> {
  if (Platform.OS !== 'web') {
    try {
      const result = await Share.share({ title, message: text ? `${text}\n\n${url}` : url, url });
      return result.action === Share.dismissedAction ? 'cancelled' : 'shared';
    } catch {
      return 'failed';
    }
  }

  if (canShareNatively()) {
    try {
      await (navigator as WebNavigator).share!({ title, text, url });
      return 'shared';
    } catch (error) {
      // Cerrar la hoja sin elegir no es un fallo.
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // Cualquier otro rechazo (permisos, contexto inseguro): se copia.
    }
  }
  return (await copyLink(url)) ? 'copied' : 'failed';
}

/** El texto que acompaña al enlace: el inicio de la publicación. */
export function shareSnippet(content: string, max = 120): string {
  const flat = content.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}
