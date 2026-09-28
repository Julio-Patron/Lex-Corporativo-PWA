import { COVERAGE_SUMMARY, PROCUREMENT_SOURCES, clearRetiredSavedData } from './coverage-sources';

describe('coverage sources', () => {
  it('distingue cobertura disponible, parcial y priorizada', () => {
    const availableTerritories = PROCUREMENT_SOURCES
      .filter((source) => source.status === 'available')
      .map((source) => source.territory);

    expect(availableTerritories).toEqual([
      'México',
      'Nuevo León',
      'Yucatán · Gobierno central',
      'Jalisco',
      'Ciudad de México',
    ]);
    expect(COVERAGE_SUMMARY).toEqual({ available: 5, partial: 1, prioritized: 0 });
    expect(
      PROCUREMENT_SOURCES.some(
        (source) => source.territory === 'Yucatán' && source.status === 'partial',
      ),
    ).toBe(true);
    expect(
      PROCUREMENT_SOURCES.every((source) => source.lastVerifiedAt === '2026-09-23'),
    ).toBe(true);
  });

  it('retira los datos locales del módulo de guardados descontinuado', () => {
    clearRetiredSavedData();

    expect(localStorage.removeItem).toHaveBeenCalledWith('lex_pwa_favorites_v2');
    expect(localStorage.removeItem).toHaveBeenCalledWith('lex_pwa_fav_licitaciones_v2');
  });
});
