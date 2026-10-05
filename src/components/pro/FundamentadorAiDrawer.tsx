import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { runFundamentadorAi, type FundamentadorAiResponse } from '../../services/fundamentador-ai';
import { getByokApiKey } from '../../lib/pro-license';
import type { CorpusSearchScope, LegalArticle, LegalCitation } from '../../types';

interface FundamentadorAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  documentContext?: string;
  citations: LegalCitation[];
  onInsertFootnote: (article: LegalArticle) => void;
  onInsertBlockquote: (article: LegalArticle) => void;
  onAddCitation: (article: LegalArticle) => void;
  onInsertAnalysis?: (text: string) => void;
}

export function FundamentadorAiDrawer({
  isOpen,
  onClose,
  initialQuery = '',
  documentContext,
  citations,
  onInsertFootnote,
  onInsertBlockquote,
  onAddCitation,
  onInsertAnalysis,
}: FundamentadorAiDrawerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<CorpusSearchScope>('todos');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<FundamentadorAiResponse | null>(null);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const res = await runFundamentadorAi({
        prompt: query,
        scope,
        documentContext,
        getApiKey: getByokApiKey,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible completar la fundamentación.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fundamentador Jurídico IA (Pro)"
      className="fixed inset-0 z-[80] flex items-end sm:items-stretch sm:justify-end bg-slate-950/40 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="flex max-h-[92vh] sm:max-h-full h-auto sm:h-full w-full max-w-lg sm:max-w-md flex-col rounded-t-3xl sm:rounded-none bg-white shadow-2xl border-t sm:border-t-0 sm:border-l border-slate-200 animate-slideUp sm:animate-slideLeft">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-legal-gold/20 text-legal-gold">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm font-bold text-slate-950">Fundamentador IA</h2>
                <span className="rounded-full bg-legal-gold/15 px-2 py-0.2 text-[9px] font-black uppercase text-legal-golddark">
                  Pro · BYOK
                </span>
              </div>
              <p className="text-[10px] text-slate-500">RAG sobre corpus federal + tu clave de Gemini</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="studio-icon-button"
            aria-label="Cerrar fundamentador"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search form */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-100 bg-white space-y-2.5">
          <div className="relative">
            <input
              type="search"
              aria-label="Consulta para fundamentar"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="¿Qué deseas fundamentar? (o usa texto seleccionado)"
              className="studio-input pl-9 text-base sm:text-xs"
              enterKeyHint="search"
            />
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <select
              aria-label="Área jurídica"
              value={scope}
              onChange={(e) => setScope(e.target.value as CorpusSearchScope)}
              className="studio-input h-8 text-xs font-bold flex-1"
            >
              <option value="todos">Todas las materias</option>
              <option value="mercantil">Mercantil</option>
              <option value="laboral">Laboral</option>
              <option value="fiscal">Fiscal</option>
              <option value="comercio_exterior">Comercio exterior</option>
              <option value="aduanal">Aduanal</option>
            </select>
            <button type="submit" disabled={busy} className="studio-primary h-8 px-3 text-xs">
              {busy ? <LoaderCircle size={13} className="animate-spin" /> : 'Fundamentar'}
            </button>
          </div>
        </form>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {busy && (
            <div className="flex items-center justify-center p-8 text-xs font-bold text-slate-400 gap-2">
              <LoaderCircle size={16} className="animate-spin text-legal-gold" />
              <span>Consultando corpus RAG y tu Gemini…</span>
            </div>
          )}

          {!busy && !result && !error && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              <BookOpen size={24} className="mx-auto text-slate-400" />
              <p className="mt-2 text-xs font-bold">Escribe una consulta o selecciona texto del documento.</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Recuperaré los artículos oficiales y redactaré la fundamentación citada.
              </p>
            </div>
          )}

          {result && (
            <>
              {/* AI analysis */}
              <div className="rounded-xl border border-legal-gold/30 bg-amber-50/60 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-legal-golddark">
                    Fundamentación generada
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">
                    {result.model} · {result.executionTimeMs} ms
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap">
                  {result.analysis}
                </p>
                {onInsertAnalysis && (
                  <button
                    type="button"
                    onClick={() => onInsertAnalysis(result.analysis)}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[10px] font-extrabold text-white hover:bg-slate-800 active:scale-95 transition"
                  >
                    <Plus size={11} className="text-amber-300" /> Insertar en el documento
                  </button>
                )}
              </div>

              {/* RAG sources */}
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                Fuentes del corpus ({result.ragArticles.length})
              </p>
              {result.ragArticles.map((article) => {
                const isAlreadyCited = citations.some((c) => c.articleId === article.id);
                return (
                  <article
                    key={article.id}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-300">
                          {article.lawCode}
                        </span>
                        <strong className="ml-1.5 text-xs font-extrabold text-slate-900">
                          {article.articleNumber}
                        </strong>
                      </div>
                      <a
                        href={article.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-bold text-legal-golddark hover:underline flex items-center gap-0.5"
                      >
                        <span>DOF</span>
                        <ExternalLink size={10} />
                      </a>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-700 line-clamp-4">
                      {article.content}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                      <button
                        type="button"
                        onClick={() => onInsertFootnote(article)}
                        className="flex-1 rounded-lg bg-slate-900 px-2 py-1.5 text-[10px] font-extrabold text-white transition hover:bg-slate-800 active:scale-95 shadow-xs flex items-center justify-center gap-1"
                      >
                        <Plus size={11} className="text-amber-300" />
                        <span>Nota al Pie</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onInsertBlockquote(article)}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95"
                      >
                        Cita en Bloque
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddCitation(article)}
                        disabled={isAlreadyCited}
                        className={`rounded-lg px-2 py-1.5 text-[10px] font-bold transition ${
                          isAlreadyCited
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {isAlreadyCited ? 'Guardada' : 'Guardar'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 flex items-center justify-between text-[10px] font-bold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 size={13} className="text-emerald-600" /> RAG local SQLite
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck size={12} className="text-slate-400" /> Tu clave no sale del dispositivo
          </span>
        </div>
      </aside>
    </div>
  );
}
