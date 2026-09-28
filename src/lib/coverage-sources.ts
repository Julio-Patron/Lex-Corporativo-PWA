export type ProcurementSourceStatus = 'available' | 'partial' | 'prioritized';

export interface ProcurementSource {
  id: string;
  territory: string;
  scope: 'Federal' | 'Estatal';
  sourceName: string;
  sourceUrl: string;
  status: ProcurementSourceStatus;
  description: string;
  lastVerifiedAt?: string;
}

export const PROCUREMENT_SOURCES: ProcurementSource[] = [
  {
    id: 'federal',
    territory: 'México',
    scope: 'Federal',
    sourceName: 'ComprasMX · CompraNet',
    sourceUrl: 'https://comprasmx.buengobierno.gob.mx',
    status: 'available',
    lastVerifiedAt: '2026-09-23',
    description: 'Procedimientos federales consultables en el catálogo actual, con cotejo en el expediente oficial.',
  },
  {
    id: 'nuevo-leon',
    territory: 'Nuevo León',
    scope: 'Estatal',
    sourceName: 'Licitaciones públicas · Gobierno de Nuevo León',
    sourceUrl: 'https://www.nl.gob.mx/es/licitaciones-publicas',
    status: 'available',
    lastVerifiedAt: '2026-09-23',
    description: 'Convocatorias y subastas de las dependencias centrales. Conector estatal verificado e integrado.',
  },
  {
    id: 'yucatan-poder-judicial',
    territory: 'Yucatán',
    scope: 'Estatal',
    sourceName: 'Poder Judicial de Yucatán · Actas y licitaciones',
    sourceUrl: 'https://www.pjyucatan.gob.mx/transparencia/informacion_publica/tsj/licitaciones',
    status: 'partial',
    lastVerifiedAt: '2026-09-23',
    description: 'Primera publicación estatal integrada. La cobertura se limita al Tribunal Superior de Justicia y conserva como pendientes los campos que la fuente no expone.',
  },
  {
    id: 'yucatan-central',
    territory: 'Yucatán · Gobierno central',
    scope: 'Estatal',
    sourceName: 'Plataforma de Adquisiciones · Gobierno de Yucatán',
    sourceUrl: 'https://adquisiciones.yucatan.gob.mx/',
    status: 'available',
    lastVerifiedAt: '2026-09-23',
    description: 'Concursos, convocatorias y licitaciones en proceso de la Plataforma de Adquisiciones de Yucatán.',
  },
  {
    id: 'jalisco',
    territory: 'Jalisco',
    scope: 'Estatal',
    sourceName: 'Sistema Electrónico de Compras Gubernamentales',
    sourceUrl: 'https://compras.jalisco.gob.mx/',
    status: 'available',
    lastVerifiedAt: '2026-09-23',
    description: 'Procesos de compra, bases y etapas de licitación del Gobierno de Jalisco (SECG).',
  },
  {
    id: 'cdmx',
    territory: 'Ciudad de México',
    scope: 'Estatal',
    sourceName: 'Tianguis Digital · Gobierno de la Ciudad de México',
    sourceUrl: 'https://tianguisdigital.cdmx.gob.mx/',
    status: 'available',
    lastVerifiedAt: '2026-09-23',
    description: 'Convocatorias y oportunidades de contratación pública del Tianguis Digital CDMX.',
  },
];

export const COVERAGE_SUMMARY = {
  available: PROCUREMENT_SOURCES.filter((source) => source.status === 'available').length,
  partial: PROCUREMENT_SOURCES.filter((source) => source.status === 'partial').length,
  prioritized: PROCUREMENT_SOURCES.filter((source) => source.status === 'prioritized').length,
};

const RETIRED_SAVED_KEYS = ['lex_pwa_favorites_v2', 'lex_pwa_fav_licitaciones_v2'];

export function clearRetiredSavedData(): void {
  try {
    RETIRED_SAVED_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* almacenamiento no disponible */
  }
}
