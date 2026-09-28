import type {
  LicitacionCaracter,
  LicitacionEstatus,
  LicitacionMateria,
  LicitacionOfficialSource,
  LicitacionPublica,
  LicitacionTipoProcedimiento,
} from '../types';
import { YUCATAN_PODER_JUDICIAL_LICITACIONES } from './connectors/yucatan-poder-judicial';
import { YUCATAN_CENTRAL_LICITACIONES } from './connectors/yucatan-central';
import { CDMX_LICITACIONES } from './connectors/cdmx';
import { JALISCO_LICITACIONES } from './connectors/jalisco';
import { NUEVO_LEON_LICITACIONES } from './connectors/nuevo-leon';
import FEDERAL_LICITACIONES_RAW from '../data/federal-licitaciones.json';

export const COMPRANET_PORTAL_URL = 'https://comprasmx.buengobierno.gob.mx';
export const COMPRANET_GOB_URL = 'https://www.gob.mx/compranet';
export const DATOS_ABIERTOS_URL = 'https://datos.gob.mx/busca/dataset/concentrado-de-contrataciones-abiertas-de-la-apf';
export const PDN_CONTRATACIONES_URL = 'https://www.plataformadigitalnacional.org/contrataciones';

const COMPRANET_SOURCE: LicitacionOfficialSource = {
  id: 'compranet',
  nombre: 'ComprasMX · CompraNet',
  url: COMPRANET_PORTAL_URL,
  ambito: 'federal',
  verificadaEl: '2026-09-23',
  integridad: 'complete',
};

export function getLicitacionOfficialSource(
  licitacion: LicitacionPublica,
): LicitacionOfficialSource {
  return licitacion.fuenteOficial ?? COMPRANET_SOURCE;
}

export const MATERIA_LABELS: Record<'todas' | LicitacionMateria, string> = {
  todas: 'Todas las materias',
  adquisiciones: 'Adquisiciones de bienes',
  servicios: 'Prestación de servicios',
  obra_publica: 'Obra pública',
  arrendamientos: 'Arrendamientos',
  servicios_obra: 'Servicios relacionados con obra pública',
};

export const CARACTER_LABELS: Record<'todos' | LicitacionCaracter, string> = {
  todos: 'Todos los caracteres',
  nacional: 'Nacional',
  internacional_tlc: 'Internacional bajo TLC',
  internacional_abierta: 'Internacional abierta',
  no_especificado: 'Por confirmar',
};

export const TIPO_PROCEDIMIENTO_LABELS: Record<LicitacionTipoProcedimiento, string> = {
  licitacion_publica: 'Licitación Pública',
  invitacion_tres_personas: 'Invitación a Cuando Menos 3 Personas',
  adjudicacion_directa: 'Adjudicación Directa',
};

export const ESTATUS_LABELS: Record<'todos' | LicitacionEstatus, string> = {
  todos: 'Todos los estatus',
  recepcion_propuestas: 'Recepción de propuestas',
  junta_aclaraciones: 'Junta de aclaraciones',
  convocatoria_publicada: 'Convocatoria publicada',
  visita_sitio: 'Visita al sitio',
  evaluacion: 'En evaluación',
  fallo_emitido: 'Fallo emitido',
};

/**
 * Catálogo oficial de las 32 Entidades Federativas de México + Ámbito Nacional
 */
export const ENTIDADES_FEDERATIVAS_MEXICO: string[] = [
  'Nacional / Federal',
  'Aguascalientes',
  'Baja California',
  'Baja California Sur',
  'Campeche',
  'Chiapas',
  'Chihuahua',
  'Ciudad de México',
  'Coahuila',
  'Colima',
  'Durango',
  'Estado de México',
  'Guanajuato',
  'Guerrero',
  'Hidalgo',
  'Jalisco',
  'Michoacán',
  'Morelos',
  'Nayarit',
  'Nuevo León',
  'Oaxaca',
  'Puebla',
  'Querétaro',
  'Quintana Roo',
  'San Luis Potosí',
  'Sinaloa',
  'Sonora',
  'Tabasco',
  'Tamaulipas',
  'Tlaxcala',
  'Veracruz',
  'Yucatán',
  'Zacatecas',
];

const FEDERAL_LICITACIONES_DATA: LicitacionPublica[] = FEDERAL_LICITACIONES_RAW as LicitacionPublica[];

export const LICITACIONES_DATA: LicitacionPublica[] = [
  ...YUCATAN_PODER_JUDICIAL_LICITACIONES,
  ...YUCATAN_CENTRAL_LICITACIONES,
  ...CDMX_LICITACIONES,
  ...JALISCO_LICITACIONES,
  ...NUEVO_LEON_LICITACIONES,
  ...FEDERAL_LICITACIONES_DATA,
];

export const LICITACIONES_STATS = {
  total: LICITACIONES_DATA.length,
  convocantes: new Set(LICITACIONES_DATA.map((l) => l.convocante)).size,
  entidades: new Set(LICITACIONES_DATA.map((l) => l.entidadFederativa)).size,
  coberturaEntidades: () => {
    const entidadCounts = new Map<string, number>();
    LICITACIONES_DATA.forEach((l) => {
      entidadCounts.set(l.entidadFederativa, (entidadCounts.get(l.entidadFederativa) || 0) + 1);
    });
    return entidadCounts;
  },
};

export function getAvailableConvocantes(): Array<{ siglas: string; nombre: string }> {
  const map = new Map<string, string>();
  for (const item of LICITACIONES_DATA) {
    if (!map.has(item.siglasConvocante)) {
      map.set(item.siglasConvocante, item.convocante);
    }
  }
  return Array.from(map.entries())
    .map(([siglas, nombre]) => ({ siglas, nombre }))
    .sort((a, b) => a.siglas.localeCompare(b.siglas, 'es-MX'));
}

/**
 * Devuelve todas las 32 entidades federativas de México + Nacional/Federal
 */
export function getAvailableEntidades(): string[] {
  return ENTIDADES_FEDERATIVAS_MEXICO;
}

export function formatCurrency(amount: number, currency: 'MXN' | 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(isoString: string): string {
  try {
    const cleanDateStr = isoString.split('T')[0];
    const parts = cleanDateStr.split('-').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      const [year, month, day] = parts;
      const date = new Date(year, month - 1, day, 12, 0, 0);
      return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    const date = new Date(isoString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export function formatDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const dateStr = formatDate(isoString);
    const timeStr = date.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${dateStr} · ${timeStr} hrs`;
  } catch {
    return isoString;
  }
}

export interface DaysRemainingInfo {
  days: number;
  isExpired: boolean;
  label: string;
  badgeStyle: 'urgent' | 'warning' | 'open';
}

export function getDaysRemaining(isoString?: string): DaysRemainingInfo {
  if (!isoString) {
    return {
      days: 0,
      isExpired: false,
      label: 'Plazo por verificar',
      badgeStyle: 'open',
    };
  }
  try {
    const target = new Date(isoString).getTime();
    const now = Date.now();
    const diffMs = target - now;
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return {
        days: 0,
        isExpired: true,
        label: 'Plazo vencido / En evaluación',
        badgeStyle: 'urgent',
      };
    }

    if (days <= 3) {
      return {
        days,
        isExpired: false,
        label: `Cierra en ${days} ${days === 1 ? 'día' : 'días'}`,
        badgeStyle: 'urgent',
      };
    }

    if (days <= 7) {
      return {
        days,
        isExpired: false,
        label: `Cierra en ${days} días`,
        badgeStyle: 'warning',
      };
    }

    return {
      days,
      isExpired: false,
      label: `Cierra en ${days} días`,
      badgeStyle: 'open',
    };
  } catch {
    return {
      days: 0,
      isExpired: false,
      label: 'Fecha por confirmar',
      badgeStyle: 'open',
    };
  }
}
