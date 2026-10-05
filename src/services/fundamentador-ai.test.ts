import { runFundamentadorAi } from './fundamentador-ai';
import type { LegalArticle } from '../types';

vi.mock('./corpus-search', () => ({
  executeCorpusSearch: vi.fn(async () => ({
    query: 'despido',
    scope: 'todos',
    scopeLabel: 'Todas las materias',
    articles: [
      {
        id: 'lft-47',
        lawCode: 'LFT',
        lawName: 'Ley Federal del Trabajo',
        articleNumber: 'Artículo 47',
        title: 'Causas de rescisión',
        content: 'Son causas de rescisión de la relación de trabajo, sin responsabilidad para el patrón…',
        area: 'laboral',
        sourceKind: 'ley',
        sourceName: 'Cámara de Diputados',
        sourceUrl: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf',
      } satisfies LegalArticle,
    ],
    executionTimeMs: 3,
    engine: 'sqlite_wasm_local',
  })),
}));

const geminiOkResponse = {
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text: 'El despido implica rescisión [LFT Art. 47].' }] } },
    ],
  }),
} as unknown as Response;

describe('fundamentador-ai', () => {
  it('exige clave BYOK', async () => {
    await expect(
      runFundamentadorAi({ prompt: 'despido', getApiKey: async () => null }),
    ).rejects.toThrow(/BYOK/i);
  });

  it('recupera RAG y llama a Gemini con la clave del usuario', async () => {
    const fetchImpl = vi.fn(async () => geminiOkResponse) as unknown as typeof fetch;
    const res = await runFundamentadorAi({
      prompt: 'despido sin responsabilidad patronal',
      scope: 'laboral',
      getApiKey: async () => 'AIzaSyTESTKEY1234567890123',
      fetchImpl,
    });

    expect(res.analysis).toContain('LFT Art. 47');
    expect(res.ragArticles).toHaveLength(1);
    expect(res.ragArticles[0].lawCode).toBe('LFT');

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('generativelanguage.googleapis.com');
    expect((init as RequestInit).headers).toMatchObject({
      'X-goog-api-key': 'AIzaSyTESTKEY1234567890123',
    });
    // El prompt debe incluir el contexto RAG y la consulta.
    const body = JSON.parse(String((init as RequestInit).body));
    expect(body.contents[0].parts[0].text).toContain('LFT');
    expect(body.contents[0].parts[0].text).toContain('despido');
    expect(body.system_instruction.parts[0].text).toContain('Fundamentador');
  });

  it('mapea errores 403 a clave rechazada', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 403, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(
      runFundamentadorAi({
        prompt: 'despido',
        getApiKey: async () => 'AIzaSyTESTKEY1234567890123',
        fetchImpl,
      }),
    ).rejects.toThrow(/rechazada/i);
  });

  it('mapea 429 a cuota agotada', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) })) as unknown as typeof fetch;
    await expect(
      runFundamentadorAi({
        prompt: 'despido',
        getApiKey: async () => 'AIzaSyTESTKEY1234567890123',
        fetchImpl,
      }),
    ).rejects.toThrow(/Cuota/i);
  });
});
