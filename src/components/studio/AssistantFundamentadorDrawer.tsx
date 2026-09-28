import { useEffect, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Database,
  ExternalLink,
  LoaderCircle,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { executeCorpusSearch } from '../../services/corpus-search';
import type { CorpusSearchScope, LegalArticle, LegalCitation } from '../../types';

interface AssistantFundamentadorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  citations: LegalCitation[];
  onInsertFootnote: (article: LegalArticle) => void;
  onInsertBlockquote: (article: LegalArticle) => void;
  onAddCitation: (article: LegalArticle) => void;
}

export function AssistantFundamentadorDrawer({
  isOpen,
  onClose,
  initialQuery = '',
  citations,
  onInsertFootnote,
  onInsertBlockquote,
  onAddCitation,
}: AssistantFundamentadorDrawerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<CorpusSearchScope>('todos');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<LegalArticle[]>([]);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      void runSearch(initialQuery, scope);
    }
  }, [initialQuery]);

  if (!isOpen) return null;

  async function runSearch(searchQuery: string, searchScope: CorpusSearchScope) {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setError('');
    try {
      const res = await executeCorpusSearch({ query: searchQuery, scope: searchScope, limit: 6 });
      setResults(res.articles);
    } catch {
      setError('No fue posible consultar el corpus local.');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await runSearch(query, scope);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Asistente de Fundamentación Legal"
      className="fixed inset-0 z-[70] flex items-end sm:items-stretch sm:justify-end bg-slate-950/30 backdrop-blur-xs animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="flex max-h-[88vh] sm:max-h-full h-auto sm:h-full w-full max-w-lg sm:max-w-md flex-col rounded-t-3xl sm:rounded-none bg-white shadow-2xl border-t sm:border-t-0 sm:border-l border-slate-200 animate-slideUp sm:animate-slideLeft">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-legal-gold/20 text-legal-gold">
              <Sparkles size={16} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-sm font-bold text-slate-950">Asistente de Fundamentación</h2>
                <kbd className="hidden sm:inline-block rounded bg-slate-200/80 px-1.5 py-0.2 text-[9px] font-mono font-bold text-slate-600">
                  Ctrl+K
                </kbd>
              </div>
              <p className="text-[10px] text-slate-500">Consulta en vivo del corpus federal oficial</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="studio-icon-button"
            aria-label="Cerrar asistente"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="p-4 border-b border-slate-100 bg-white space-y-2.5">
          <div className="relative">
            <input
              type="search"
              aria-label="Buscar fundamento"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artículo, término o seleccionar texto…"
              className="studio-input pl-9 text-base sm:text-xs"
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
            <button
              type="submit"
              disabled={searching}
              className="studio-primary h-8 px-3 text-xs"
            >
              {searching ? <LoaderCircle size={13} className="animate-spin" /> : 'Consultar'}
            </button>
          </div>
        </form>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          {searching && (
            <div className="flex items-center justify-center p-8 text-xs font-bold text-slate-400 gap-2">
              <LoaderCircle size={16} className="animate-spin text-legal-gold" />
              <span>Buscando en corpus local…</span>
            </div>
          )}

          {!searching && results.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              <BookOpen size={24} className="mx-auto text-slate-400" />
              <p className="mt-2 text-xs font-bold">Busca cualquier concepto o selecciona texto en el editor.</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Podrás insertar el fundamento como nota al pie <sup>[1]</sup> o cita en bloque.
              </p>
            </div>
          )}

          {results.map((article) => {
            const isAlreadyCited = citations.some((c) => c.articleId === article.id);
            return (
              <article
                key={article.id}
                className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-slate-300"
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
                    <span>Nota al Pie <sup>[N]</sup></span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onInsertBlockquote(article)}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95"
                    title="Insertar como cita textual en bloque"
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
                    title="Guardar en apéndice de citas"
                  >
                    {isAlreadyCited ? 'Guardada' : 'Guardar'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="border-t border-slate-200 p-3 bg-slate-50 flex items-center justify-between text-[10px] font-bold">
          <span className="flex items-center gap-1.5 text-emerald-700">
            <CheckCircle2 size={13} className="text-emerald-600" /> Motor local SQLite activo
          </span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <Database size={12} className="text-slate-400" /> Corpus federal en memoria
          </span>
        </div>
      </aside>
    </div>
  );
}
