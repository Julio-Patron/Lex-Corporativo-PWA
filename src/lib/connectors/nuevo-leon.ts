import type { LicitacionPublica } from '../../types';
import NUEVO_LEON_LICITACIONES_RAW from '../../data/nuevo-leon-licitaciones.json';

export const NUEVO_LEON_SOURCE = {
  id: 'nuevo-leon',
  nombre: 'Licitaciones públicas · Gobierno de Nuevo León',
  url: 'https://www.nl.gob.mx/es/licitaciones-publicas',
  ambito: 'estatal',
  verificadaEl: '2026-09-23',
  integridad: 'complete',
} as const;

export const NUEVO_LEON_LICITACIONES: LicitacionPublica[] =
  NUEVO_LEON_LICITACIONES_RAW as LicitacionPublica[];
