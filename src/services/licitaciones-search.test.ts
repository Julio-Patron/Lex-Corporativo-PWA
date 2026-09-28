import {
  calculateLicitacionScore,
  executeLicitacionesSearch,
} from './licitaciones-search';
import { LICITACIONES_DATA } from '../lib/licitaciones-catalog';

describe('licitaciones-search', () => {
  it('calcula puntajes más altos para coincidencias en número de procedimiento y título', () => {
    const imssLicitacion = LICITACIONES_DATA.find((l) => l.siglasConvocante === 'IMSS')!;
    const scoreByNumber = calculateLicitacionScore(imssLicitacion, 'la-50-gyr');
    const scoreByWord = calculateLicitacionScore(imssLicitacion, 'medicamentos');
    const scoreIrrelevant = calculateLicitacionScore(imssLicitacion, 'subestaciones');

    expect(scoreByNumber).toBeGreaterThan(scoreByWord);
    expect(scoreByWord).toBeGreaterThan(scoreIrrelevant);
  });

  it('retorna score 10 para query vacío', () => {
    const imssLicitacion = LICITACIONES_DATA.find((l) => l.siglasConvocante === 'IMSS')!;
    expect(calculateLicitacionScore(imssLicitacion, '')).toBe(10);
  });

  it('filtra licitaciones por materia', async () => {
    const result = await executeLicitacionesSearch({ materia: 'obra_publica' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.licitaciones.every((l) => l.materia === 'obra_publica')).toBe(true);
  });

  it('filtra licitaciones por dependencia convocante', async () => {
    const result = await executeLicitacionesSearch({ convocante: 'IMSS' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.licitaciones.some((l) => l.siglasConvocante === 'IMSS')).toBe(true);
  });

  it('filtra licitaciones por entidad federativa', async () => {
    const result = await executeLicitacionesSearch({ entidadFederativa: 'Jalisco' });
    expect(result.total).toBeGreaterThan(0);
    expect(result.licitaciones.some((l) => l.entidadFederativa === 'Jalisco')).toBe(true);
  });

  it('encuentra la publicación estatal verificada de Yucatán', async () => {
    const result = await executeLicitacionesSearch({
      query: 'PODJUDTSJ-CA 07/2026',
      entidadFederativa: 'Yucatán',
      sortBy: 'relevancia',
    });

    expect(result.licitaciones[0].id).toBe('yuc-pj-tsj-2026-07');
    expect(result.licitaciones[0].fuenteOficial?.ambito).toBe('estatal');
  });

  it('filtra por término de búsqueda y ordena por relevancia', async () => {
    const result = await executeLicitacionesSearch({
      query: 'ciberseguridad',
      sortBy: 'relevancia',
    });
    expect(result.total).toBeGreaterThan(0);
    expect(result.licitaciones[0].titulo.toLowerCase()).toContain('ciberseguridad');
  });

  it('filtra licitaciones por estatus sin acoplamiento al calendario', async () => {
    // Verifica filtrado contra un estatus presente en el catálogo
    const sampleStatus = LICITACIONES_DATA[0].estatus;
    const result = await executeLicitacionesSearch({ estatus: sampleStatus });
    expect(result.total).toBeGreaterThan(0);
    expect(result.licitaciones.every((l) => l.estatus === sampleStatus)).toBe(true);

    // Verifica que cualquier estatus consultado mantenga la invariante de filtrado
    const propResult = await executeLicitacionesSearch({ estatus: 'recepcion_propuestas' });
    expect(propResult.licitaciones.every((l) => l.estatus === 'recepcion_propuestas')).toBe(true);
  });

  it('ordena por cierre más próximo por defecto', async () => {
    const result = await executeLicitacionesSearch({});
    const withDeadline = result.licitaciones.filter(
      (l) => l.fechaLimitePropuestas
    );
    for (let i = 1; i < withDeadline.length; i++) {
      const prevTime = new Date(withDeadline[i - 1].fechaLimitePropuestas!).getTime();
      const currTime = new Date(withDeadline[i].fechaLimitePropuestas!).getTime();
      expect(prevTime).toBeLessThanOrEqual(currTime);
    }
  });

  it('ordena por monto mayor cuando se especifica', async () => {
    const result = await executeLicitacionesSearch({ sortBy: 'monto_mayor' });
    for (let i = 1; i < result.licitaciones.length; i++) {
      const prevMonto = result.licitaciones[i - 1].montoEstimado ?? 0;
      const currMonto = result.licitaciones[i].montoEstimado ?? 0;
      expect(prevMonto).toBeGreaterThanOrEqual(currMonto);
    }
  });

  it('ordena por fecha más reciente cuando se especifica', async () => {
    const result = await executeLicitacionesSearch({ sortBy: 'reciente' });
    for (let i = 1; i < result.licitaciones.length; i++) {
      const prevDate = new Date(result.licitaciones[i - 1].fechaPublicacion).getTime();
      const currDate = new Date(result.licitaciones[i].fechaPublicacion).getTime();
      expect(prevDate).toBeGreaterThanOrEqual(currDate);
    }
  });
});
