import { executeCorpusSearch } from './corpus-search';
import type { CorpusSearchScope, LegalArticle } from '../types';

// Official rolling Flash alias: https://ai.google.dev/gemini-api/docs/models
export const GEMINI_MODEL = 'gemini-flash-latest';
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const AI_TIMEOUT_MS = 30_000;

export interface GeminiRequestOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

export interface FundamentadorAiRequest extends GeminiRequestOptions {
  /** Texto seleccionado o instrucción del usuario. */
  prompt: string;
  /** Fragmento del documento en edición para dar contexto (opcional). */
  documentContext?: string;
  /** Consentimiento explícito para enviar el fragmento adicional. */
  includeDocumentContext?: boolean;
  scope?: CorpusSearchScope;
  /** Máximo de artículos del corpus local a inyectar como RAG. */
  ragLimit?: number;
  /** Función para recuperar la clave BYOK del usuario. */
  getApiKey: () => Promise<string | null>;
}

export interface FundamentadorAiResponse {
  analysis: string;
  model: string;
  ragArticles: LegalArticle[];
  executionTimeMs: number;
  citationValidation: CitationValidation;
}

export interface CitationValidation {
  valid: boolean;
  invalidCitations: string[];
}

function citationLabel(article: LegalArticle): string {
  const number = article.articleNumber.replace(/^(?:artículo|articulo|art\.?)\s*/i, '').trim();
  return `${article.lawCode} Art. ${number}`;
}

/** Verifica identidad de referencias, no la interpretación ni la corrección jurídica. */
export function validateAnalysisCitations(analysis: string, articles: LegalArticle[]): CitationValidation {
  const normalize = (value: string) => value.toLocaleLowerCase('es').replace(/\s+/g, ' ').trim();
  const allowed = new Set(articles.map((article) => normalize(citationLabel(article))));
  const references = [...analysis.matchAll(/\[([^\]\n]+)\]/g)].map((match) => match[1]);
  const invalidCitations = references.filter((reference) => !allowed.has(normalize(reference)));
  const malformed = (analysis.match(/\[/g)?.length ?? 0) !== references.length
    || (analysis.match(/\]/g)?.length ?? 0) !== references.length;
  return { valid: references.length > 0 && !invalidCitations.length && !malformed, invalidCitations };
}

const SYSTEM_INSTRUCTION = [
  'Eres el "Fundamentador Jurídico" de Lex Corporativo, un asistente doctrinal mexicano.',
  'Tu tarea es fundamentar con precisión el fragmento o la consulta del usuario, citando ÚNICAMENTE los artículos oficiales provistos en el contexto RAG.',
  'Reglas estrictas:',
  '1. Basa tu análisis solo en los artículos del contexto RAG. Si no hay fundamento suficiente, dilo explícitamente.',
  '2. Cita siempre en el formato [LEY Art. N] (por ejemplo [LFT Art. 47]) al final de cada afirmación.',
  '3. Usa español jurídico formal mexicano, conciso (máximo 220 palabras).',
  '4. No inventes números de artículo ni leyes que no estén en el contexto.',
].join('\n');

function buildRagContext(articles: LegalArticle[]): string {
  if (!articles.length) return 'Sin artículos relevantes en el corpus local.';
  return articles
    .map(
      (a, i) =>
        `Fuente ${i + 1}: [${citationLabel(a)}] ${a.lawName}\n${a.content.slice(0, 1200)}`,
    )
    .join('\n\n');
}

function buildUserPrompt(req: FundamentadorAiRequest, ragContext: string): string {
  const parts = [
    '=== CONTEXTO RAG (corpus oficial) ===',
    ragContext,
    '=== CONSULTA DEL USUARIO ===',
    req.prompt.trim(),
  ];
  const doc = req.includeDocumentContext ? req.documentContext?.trim() : undefined;
  if (doc) {
    parts.splice(2, 0, '=== FRAGMENTO DEL DOCUMENTO EN EDICIÓN ===', doc.slice(0, 1500));
  }
  return parts.join('\n\n');
}

async function callGemini(
  apiKey: string,
  userPrompt: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
  systemInstruction?: string,
): Promise<string> {
  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`;
  const body = {
    ...(systemInstruction ? { system_instruction: { parts: [{ text: systemInstruction }] } } : {}),
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
  };

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify(body),
    signal,
    cache: 'no-store',
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });

  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      throw new Error('Tu clave BYOK fue rechazada por Google. Revísala en AI Studio.');
    }
    if (response.status === 429) {
      throw new Error('Cuota de tu clave agotada por ahora. Intenta más tarde.');
    }
    if (response.status === 404) {
      throw new Error('El modelo de Gemini no está disponible para esta clave. Comprueba su acceso en Google AI Studio.');
    }
    throw new Error(`La API de Gemini respondió con error ${response.status}.`);
  }

  const data = (await response.json()) as {
    promptFeedback?: { blockReason?: string };
    candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string; thought?: boolean }> } }>;
  };
  const candidate = data.candidates?.[0];
  if (data.promptFeedback?.blockReason || (candidate?.finishReason && candidate.finishReason !== 'STOP')) {
    throw new Error('Gemini bloqueó o interrumpió la respuesta. Reformula la consulta; no se insertará una respuesta incompleta.');
  }
  const text = candidate?.content?.parts
    ?.filter((part) => !part.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini no devolvió contenido útil.');
  return text;
}

async function withRequest<T>(options: GeminiRequestOptions, work: (signal: AbortSignal) => Promise<T>): Promise<T> {
  if (options.signal?.aborted) throw new DOMException('Solicitud cancelada.', 'AbortError');
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Sin conexión. Gemini necesita Internet; puedes seguir usando el corpus local.');
  }
  const controller = new AbortController();
  let timedOut = false;
  let rejectAbort: (reason: Error) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => { rejectAbort = reject; });
  const cancel = () => {
    controller.abort();
    rejectAbort(timedOut
      ? new Error('Gemini tardó demasiado. Intenta de nuevo.')
      : new DOMException('Solicitud cancelada.', 'AbortError'));
  };
  options.signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(() => { timedOut = true; cancel(); }, AI_TIMEOUT_MS);
  try {
    return await Promise.race([work(controller.signal), interrupted]);
  } catch (error) {
    if (timedOut) throw new Error('Gemini tardó demasiado. Intenta de nuevo.');
    if (controller.signal.aborted) throw new DOMException('Solicitud cancelada.', 'AbortError');
    if (error instanceof TypeError) throw new Error('No fue posible conectar con Google. Revisa tu conexión y vuelve a intentar.');
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', cancel);
  }
}

/** Prueba real sin documentos, corpus ni consultas del usuario; no guarda la clave. */
export async function testGeminiApiKey(apiKey: string, options: GeminiRequestOptions = {}): Promise<void> {
  if (!apiKey.trim()) throw new Error('Introduce una clave de Gemini.');
  await withRequest(options, (signal) =>
    callGemini(apiKey.trim(), 'Responde únicamente: OK. Esta es una prueba de conexión sin documentos.', options.fetchImpl ?? fetch, signal),
  );
}

/**
 * RAG del Fundamentador Jurídico (versión PWA móvil Pro):
 * 1) Recupera artículos del corpus SQLite WASM local.
 * 2) Construye grounding y llama a Gemini con la clave BYOK del usuario.
 */
export async function runFundamentadorAi(
  req: FundamentadorAiRequest,
): Promise<FundamentadorAiResponse> {
  if (!req.prompt.trim()) throw new Error('Escribe una consulta para fundamentar.');
  return withRequest(req, async (signal) => {
    const apiKey = (await req.getApiKey())?.trim();
    signal.throwIfAborted();
    if (!apiKey) {
      throw new Error('Configura tu clave BYOK (Google AI Studio) para usar el Fundamentador IA.');
    }

    const started = performance.now();
    const ragLimit = req.ragLimit ?? 5;
    const rag = await executeCorpusSearch({
      query: req.prompt,
      scope: req.scope ?? 'todos',
      limit: ragLimit,
    });
    signal.throwIfAborted();

    const userPrompt = buildUserPrompt(req, buildRagContext(rag.articles));
    const analysis = await callGemini(apiKey, userPrompt, req.fetchImpl ?? fetch, signal, SYSTEM_INSTRUCTION);
    signal.throwIfAborted();

    return {
      analysis,
      model: GEMINI_MODEL,
      ragArticles: rag.articles,
      executionTimeMs: Math.max(1, Math.round(performance.now() - started)),
      citationValidation: validateAnalysisCitations(analysis, rag.articles),
    };
  });
}
