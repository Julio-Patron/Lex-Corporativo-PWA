import type { LicitacionPublica } from '../../types';
import JALISCO_LICITACIONES_RAW from '../../data/jalisco-licitaciones.json';

export const JALISCO_SOURCE = {
  id: 'jalisco',
  nombre: 'Sistema Electrónico de Compras Gubernamentales',
  url: 'https://compras.jalisco.gob.mx/',
  ambito: 'estatal',
  verificadaEl: '2026-09-23',
  integridad: 'complete',
} as const;

export const JALISCO_LICITACIONES: LicitacionPublica[] =
  JALISCO_LICITACIONES_RAW as LicitacionPublica[];
