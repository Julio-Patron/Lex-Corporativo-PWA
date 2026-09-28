import type { LicitacionPublica } from '../../types';
import YUCATAN_LICITACIONES_RAW from '../../data/yucatan-licitaciones.json';

export const YUCATAN_CENTRAL_SOURCE = {
  id: 'yucatan-central',
  nombre: 'Plataforma de Adquisiciones · Gobierno de Yucatán',
  url: 'https://adquisiciones.yucatan.gob.mx/',
  ambito: 'estatal',
  verificadaEl: '2026-09-23',
  integridad: 'complete',
} as const;

export const YUCATAN_CENTRAL_LICITACIONES: LicitacionPublica[] =
  (YUCATAN_LICITACIONES_RAW as LicitacionPublica[]).filter(
    (item) => item.id !== 'yuc-pj-tsj-2026-07',
  );
