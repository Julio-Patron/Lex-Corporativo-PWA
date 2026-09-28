import type { LicitacionPublica } from '../../types';
import CDMX_LICITACIONES_RAW from '../../data/cdmx-licitaciones.json';

export const CDMX_SOURCE = {
  id: 'cdmx',
  nombre: 'Tianguis Digital · Gobierno de la Ciudad de México',
  url: 'https://tianguisdigital.cdmx.gob.mx/',
  ambito: 'estatal',
  verificadaEl: '2026-09-23',
  integridad: 'complete',
} as const;

export const CDMX_LICITACIONES: LicitacionPublica[] =
  CDMX_LICITACIONES_RAW as LicitacionPublica[];
