import { executeCorpusSearch } from './corpus-search';
import type { CorpusSearchScope, LegalArticle } from '../types';

export const GEMINI_MODEL = 'gemini-2.0-flash';
export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export interface FundamentadorAiRequest {
  /** Texto seleccionado o instrucción del usuario. */
  prompt: string;
  /** Fragmento del documento en edición para dar contexto (opcional). */
  documentContext?: string;
  scope?: CorpusSearchScope;
  /** Máximo de artículos del corpus local a inyectar como RAG. */
  ragLimit?: number;
  /** Función para recuperar la clave BYOK del usuario. */
  getApiKey: () => Promise<string | null>;
  /** Inyección para pruebas. */
  fetchImpl?: typeof fetch;
}

export interface FundamentadorAiResponse {
  analysis: string;
  model: string;
  ragArticles: LegalArticle[];
  executionTimeMs: number;
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
        `[${i + 1}] [${a.lawCode} ${a.articleNumber}] ${a.lawName}\n${a.content.slice(0, 1200)}`,
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
  const doc = req.documentContext?.trim();
  if (doc) {
    parts.splice(2, 0, '=== FRAGMENTO DEL DOCUMENTO EN EDICIÓN ===', doc.slice(0, 1500));
  }
  return parts.join('\n\n');
}

async function callGemini(
  apiKey: string,
  userPrompt: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const url = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent`;
  const body = {
    system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 640, topP: 0.9 },
  };

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 403) {
      throw new Error('Tu clave BYOK fue rechazada por Google. Revísala en AI Studio.');
    }
    if (response.status === 429) {
      throw new Error('Cuota de tu clave agotada por ahora. Intenta más tarde.');
    }
    throw new Error(`La API de Gemini respondió con error ${response.status}.`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) throw new Error('Gemini no devolvió contenido útil.');
  return text;
}

/**
 * RAG del Fundamentador Jurídico (versión PWA móvil Pro):
 * 1) Recupera artículos del corpus SQLite WASM local.
 * 2) Construye grounding y llama a Gemini con la clave BYOK del usuario.
 */
export async function runFundamentadorAi(
  req: FundamentadorAiRequest,
): Promise<FundamentadorAiResponse> {
  const apiKey = (await req.getApiKey())?.trim();
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

  const userPrompt = buildUserPrompt(req, buildRagContext(rag.articles));
  const analysis = await callGemini(apiKey, userPrompt, req.fetchImpl ?? fetch);

  return {
    analysis,
    model: GEMINI_MODEL,
    ragArticles: rag.articles,
    executionTimeMs: Math.max(1, Math.round(performance.now() - started)),
  };
}
