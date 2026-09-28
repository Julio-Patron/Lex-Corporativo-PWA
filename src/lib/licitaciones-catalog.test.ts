import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getAvailableConvocantes,
  getAvailableEntidades,
  getDaysRemaining,
  getLicitacionOfficialSource,
  LICITACIONES_DATA,
  LICITACIONES_STATS,
} from './licitaciones-catalog';

describe('licitaciones-catalog', () => {
  it('contiene un catálogo representativo de licitaciones públicas de México', () => {
    expect(LICITACIONES_DATA.length).toBeGreaterThan(10);
    expect(LICITACIONES_STATS.total).toBe(LICITACIONES_DATA.length);
    expect(LICITACIONES_STATS.convocantes).toBeGreaterThan(5);
  });

  it('obtiene lista única de convocantes con siglas y nombre', () => {
    const convocantes = getAvailableConvocantes();
    expect(convocantes.some((c) => c.siglas === 'IMSS')).toBe(true);
    expect(convocantes.some((c) => c.siglas === 'CFE')).toBe(true);
    expect(convocantes.some((c) => c.siglas === 'PEMEX')).toBe(true);
  });

  it('obtiene lista ordenada de entidades federativas', () => {
    const entidades = getAvailableEntidades();
    expect(entidades).toContain('Ciudad de México');
    expect(entidades).toContain('Jalisco');
  });

  it('formatea montos monetarios en pesos mexicanos o dólares', () => {
    expect(formatCurrency(845000000, 'MXN')).toContain('845,000,000');
    expect(formatCurrency(45000000, 'USD')).toContain('45,000,000');
  });

  it('formatea fechas legibles en español', () => {
    const formatted = formatDate('2026-08-15');
    expect(formatted).toContain('2026');
    expect(formatted).toContain('15');

    const formattedTime = formatDateTime('2026-08-15T10:00:00');
    expect(formattedTime).toContain('15');
    expect(formattedTime).toContain('hrs');
  });

  it('calcula días restantes y estilos de urgencia', () => {
    const futureDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    const urgentInfo = getDaysRemaining(futureDate);
    expect(urgentInfo.isExpired).toBe(false);
    expect(urgentInfo.badgeStyle).toBe('urgent');
    expect(urgentInfo.label).toContain('Cierra en');

    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const expiredInfo = getDaysRemaining(pastDate);
    expect(expiredInfo.isExpired).toBe(true);
    expect(expiredInfo.label).toContain('vencido');

    const unknownInfo = getDaysRemaining();
    expect(unknownInfo.isExpired).toBe(false);
    expect(unknownInfo.label).toBe('Plazo por verificar');
  });

  it('integra la primera publicación oficial de Yucatán sin completar campos ausentes', () => {
    const yucatan = LICITACIONES_DATA.find((item) => item.id === 'yuc-pj-tsj-2026-07');

    expect(yucatan).toBeDefined();
    expect(yucatan?.fechaLimitePropuestas).toBeUndefined();
    expect(yucatan?.montoEstimado).toBeUndefined();
    expect(getLicitacionOfficialSource(yucatan!).nombre).toContain('Poder Judicial de Yucatán');
    expect(getLicitacionOfficialSource(yucatan!).integridad).toBe('publication_only');
  });

  it('integra procedimientos estatales de CDMX, Jalisco, Nuevo León y Yucatán Central', () => {
    expect(LICITACIONES_DATA.some((l) => l.entidadFederativa === 'Ciudad de México')).toBe(true);
    expect(LICITACIONES_DATA.some((l) => l.entidadFederativa === 'Jalisco')).toBe(true);
    expect(LICITACIONES_DATA.some((l) => l.entidadFederativa === 'Nuevo León')).toBe(true);
    expect(LICITACIONES_DATA.some((l) => l.entidadFederativa === 'Yucatán')).toBe(true);
    expect(LICITACIONES_DATA.length).toBe(29);
  });
});
