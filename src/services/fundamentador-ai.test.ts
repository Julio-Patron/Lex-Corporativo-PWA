import { AI_TIMEOUT_MS, GEMINI_MODEL, runFundamentadorAi, testGeminiApiKey, validateAnalysisCitations } from './fundamentador-ai';
import { executeCorpusSearch } from './corpus-search';
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
  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    vi.clearAllMocks();
  });

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
    expect(res.citationValidation.valid).toBe(true);

    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain('generativelanguage.googleapis.com');
    expect(String(url)).toContain(GEMINI_MODEL);
    expect(String(url)).not.toContain('AIza');
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe('no-store');
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

  it.each([false, true])('only includes document context with consent: %s', async (consent) => {
    const fetchImpl = vi.fn().mockResolvedValue(geminiOkResponse);
    await runFundamentadorAi({
      prompt: 'consulta', documentContext: 'DOCUMENTO PRIVADO', includeDocumentContext: consent,
      getApiKey: async () => 'test-key', fetchImpl,
    });
    expect(fetchImpl.mock.calls[0][1].body.includes('DOCUMENTO PRIVADO')).toBe(consent);
  });

  it('tests the actual same model with a generic request, not local documents or corpus', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(geminiOkResponse);
    await testGeminiApiKey('test-key', { fetchImpl });
    expect(executeCorpusSearch).not.toHaveBeenCalled();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain(`${GEMINI_MODEL}:generateContent`);
    expect(JSON.parse(init.body).contents[0].parts[0].text).toContain('prueba de conexión sin documentos');
    expect(init.headers['X-goog-api-key']).toBe('test-key');
  });

  it.each([401, 404, 429, 503])('reports HTTP %s without reflecting provider content or keys', async (status) => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status });
    await expect(testGeminiApiKey('private-key', { fetchImpl })).rejects.toThrow();
  });

  it.each([
    {},
    { candidates: [{ content: { parts: [{ text: '' }] } }] },
    { promptFeedback: { blockReason: 'SAFETY' } },
    { candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: 'Partial analysis' }] } }] },
  ])('rejects missing, empty, blocked and truncated responses', async (data) => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => data });
    await expect(testGeminiApiKey('test-key', { fetchImpl })).rejects.toThrow();
  });

  it('does not return thought text as analysis', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      candidates: [{ content: { parts: [{ text: 'private thought', thought: true }, { text: 'Final [LFT Art. 47]' }] } }],
    }) });
    const result = await runFundamentadorAi({ prompt: 'test', getApiKey: async () => 'test-key', fetchImpl });
    expect(result.analysis).toBe('Final [LFT Art. 47]');
  });

  it('blocks offline requests before reading documents or contacting Gemini', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    const fetchImpl = vi.fn();
    await expect(testGeminiApiKey('test-key', { fetchImpl })).rejects.toThrow(/Sin conexión/);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('maps network failures to actionable connection errors', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(testGeminiApiKey('test-key', { fetchImpl })).rejects.toThrow(/conexión/);
  });

  it('aborts active requests and ignores a transport that never resolves', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn().mockReturnValue(new Promise(() => {}));
    const result = testGeminiApiKey('test-key', { signal: controller.signal, fetchImpl });
    const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort();
    await assertion;
    expect(fetchImpl.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('times out the entire request and aborts transport', async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn().mockReturnValue(new Promise(() => {}));
    const result = testGeminiApiKey('test-key', { fetchImpl });
    const assertion = expect(result).rejects.toThrow(/tardó demasiado/);
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS);
    await assertion;
    expect(fetchImpl.mock.calls[0][1].signal.aborted).toBe(true);
  });

  it('does not send an already cancelled request', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();
    await expect(testGeminiApiKey('test-key', { signal: controller.signal, fetchImpl })).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('prevents late key retrieval from sending after a timeout', async () => {
    vi.useFakeTimers();
    let resolveKey!: (key: string) => void;
    const fetchImpl = vi.fn().mockResolvedValue(geminiOkResponse);
    const result = runFundamentadorAi({
      prompt: 'consulta', getApiKey: () => new Promise((resolve) => { resolveKey = resolve; }), fetchImpl,
    });
    const assertion = expect(result).rejects.toThrow(/tardó demasiado/);
    await vi.advanceTimersByTimeAsync(AI_TIMEOUT_MS);
    await assertion;
    resolveKey('late-key');
    await Promise.resolve();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(executeCorpusSearch).not.toHaveBeenCalled();
  });

  it('limits explicitly opted-in document context to 1500 characters', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(geminiOkResponse);
    await runFundamentadorAi({
      prompt: 'consulta', documentContext: `${'Z'.repeat(1500)}PRIVATE-TAIL`,
      includeDocumentContext: true, getApiKey: async () => 'test-key', fetchImpl,
    });
    expect(fetchImpl.mock.calls[0][1].body).toContain('Z'.repeat(1500));
    expect(fetchImpl.mock.calls[0][1].body).not.toContain('PRIVATE-TAIL');
  });

  it('rejects absent, invented, malformed and mismatched citations without claiming legal verification', async () => {
    const { articles } = await executeCorpusSearch({ query: 'test', scope: 'todos', limit: 1 });
    expect(validateAnalysisCitations('Válida [LFT Art. 47]', articles).valid).toBe(true);
    for (const analysis of ['Sin referencias', '[LFT Art. 48]', '[CFF Art. 47]', '[LFT Art. 47] [inventada]', '[LFT Art. 47] [incompleta']) {
      expect(validateAnalysisCitations(analysis, articles).valid).toBe(false);
    }
  });
});
