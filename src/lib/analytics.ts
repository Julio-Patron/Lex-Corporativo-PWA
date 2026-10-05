import { track } from '@vercel/analytics';

export type AnalyticsEvent =
  | 'download_desktop_click'
  | 'copy_hash_click'
  | 'tab_change'
  | 'legal_search_performed'
  | 'tender_search_performed'
  | 'article_copy'
  | 'legal_article_send_to_studio'
  | 'source_link_click'
  | 'desktop_lock_modal_download_click'
  | 'desktop_lock_modal_learn_more_click'
  | 'station_enter'
  | 'home_return_click'
  | 'pro_access_modal_open'
  | 'pro_license_activated'
  | 'pro_byok_ai_studio_click';

export type EventProperties = Record<string, string | number | boolean | null | undefined>;

const SENSITIVE_PROPERTY_KEYS = new Set([
  'query',
  'q',
  'lq',
  'search',
  'searchTerms',
  'text',
  'content',
  'citation',
  'citationText',
]);

/**
 * Sanitiza una URL eliminando parámetros de búsqueda del usuario ('q', 'lq')
 * antes de ser reportada a Vercel Analytics o Speed Insights.
 */
export function sanitizeAnalyticsUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl, 'https://lexcorporativo.com.mx');
    parsed.searchParams.delete('q');
    parsed.searchParams.delete('lq');
    return parsed.pathname + (parsed.search ? parsed.search : '');
  } catch {
    return '/';
  }
}

/**
 * Registra un evento personalizado en Vercel Analytics.
 * Funciona de forma segura y silenciosa en entornos de desarrollo y producción,
 * excluyendo cualquier texto de consultas, documentos o citas.
 */
export function trackEvent(name: AnalyticsEvent, properties?: EventProperties): void {
  try {
    // Sanitizar propiedades nulas, indefinidas o sensibles
    const sanitizedProps: Record<string, string | number | boolean> = {};
    if (properties) {
      for (const [key, value] of Object.entries(properties)) {
        if (value !== null && value !== undefined && !SENSITIVE_PROPERTY_KEYS.has(key)) {
          sanitizedProps[key] = value;
        }
      }
    }

    track(name, sanitizedProps);
  } catch {
    // Fail silently in case analytics is blocked by adblockers or offline
  }
}

