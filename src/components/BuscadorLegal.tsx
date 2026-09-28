import { useMemo, useState, type FormEvent } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  FilePenLine,
  FileSearch,
  Filter,
  HardDrive,
  LoaderCircle,
  RotateCcw,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  WifiOff,
  X,
} from 'lucide-react';
import { AREA_LABELS, getLawsForScope } from '../lib/corpus-catalog';
import { executeCorpusSearch, type CorpusSearchResult } from '../services/corpus-search';
import { useUiStore } from '../store/useUiStore';
import { trackEvent } from '../lib/analytics';
import type { CorpusSearchScope, LegalArticle, LegalEngineeringArea } from '../types';

const scopes = Object.entries(AREA_LABELS) as Array<[CorpusSearchScope, string]>;

const SUGGESTED_LEGAL_SEARCHES = [
  { label: 'Rescisión laboral', query: 'rescisión laboral', scope: 'laboral' as const },
  { label: 'Artículo 47 LFT', query: 'artículo 47', scope: 'laboral' as const, lawCode: 'LFT' },
  { label: 'Prescripción fiscal', query: 'prescripción fiscal', scope: 'fiscal' as const },
  { label: 'Asamblea de accionistas', query: 'asamblea de accionistas', scope: 'mercantil' as const, lawCode: 'LGSM' },
  { label: 'Despacho aduanero', query: 'despacho aduanero', scope: 'aduanal' as const },
  { label: 'Acreditamiento IVA', query: 'acreditamiento del impuesto', scope: 'fiscal' as const, lawCode: 'LIVA' },
  { label: 'Títulos de crédito', query: 'pagaré endoso', scope: 'mercantil' as const, lawCode: 'LGTOC' },
  { label: 'Prácticas desleales', query: 'discriminación de precios', scope: 'comercio_exterior' as const, lawCode: 'LCE' },
];

const AREA_BADGES: Record<LegalEngineeringArea, { bg: string; text: string; border: string }> = {
  laboral: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  mercantil: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  fiscal: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' },
  aduanal: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  comercio_exterior: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
};

function articlePlainText(article: LegalArticle): string {
  return `${article.lawName}\n${article.articleNumber}\n\n${article.content}\n\nFuente oficial para cotejo: ${article.sourceUrl}`;
}

export function BuscadorLegal() {
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [scope, setScope] = useState<CorpusSearchScope>(
    (searchParams.get('scope') as CorpusSearchScope) || 'todos',
  );
  const [lawCode, setLawCode] = useState(searchParams.get('law') ?? '');
  const [showFilters, setShowFilters] = useState(false);
  const [result, setResult] = useState<CorpusSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { isOnline, notify } = useUiStore();

  const availableLaws = useMemo(() => getLawsForScope(scope), [scope]);
  const activeLawCode = availableLaws.some((law) => law.code === lawCode) ? lawCode : '';

  const activeFiltersCount = (scope !== 'todos' ? 1 : 0) + (activeLawCode ? 1 : 0);

  const performSearch = async (
    requestedQuery: string,
    requestedScope: CorpusSearchScope,
    requestedLawCode?: string,
  ) => {
    const normalizedQuery = requestedQuery.trim();
    if (normalizedQuery.length < 2) {
      setError('Escribe al menos dos caracteres para buscar.');
      return;
    }

    setError('');
    setIsSearching(true);
    setExpanded(new Set());
    try {
      const nextResult = await executeCorpusSearch({
        query: normalizedQuery,
        scope: requestedScope,
        lawCode: requestedLawCode || undefined,
        limit: 30,
      });
      setResult(nextResult);
      trackEvent('legal_search_performed', {
        query_length: normalizedQuery.length,
        scope: requestedScope,
        law: requestedLawCode || 'todos',
        results_count: nextResult.articles.length,
      });

      const url = new URL(window.location.href);
      url.searchParams.set('q', normalizedQuery);
      url.searchParams.set('scope', requestedScope);
      if (requestedLawCode) url.searchParams.set('law', requestedLawCode);
      else url.searchParams.delete('law');
      window.history.replaceState(null, '', url);
    } catch {
      setError('No pudimos cargar la legislación. Recarga la aplicación e inténtalo de nuevo.');
    } finally {
      setIsSearching(false);
    }
  };

  const runSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    await performSearch(query, scope, activeLawCode || undefined);
  };

  const handleSuggestionClick = (sugQuery: string, sugScope: CorpusSearchScope, sugLawCode?: string) => {
    setQuery(sugQuery);
    setScope(sugScope);
    setLawCode(sugLawCode ?? '');
    void performSearch(sugQuery, sugScope, sugLawCode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /** Limpia solo los filtros, conserva el query */
  const resetFilters = () => {
    setScope('todos');
    setLawCode('');
    if (query.trim()) {
      void performSearch(query, 'todos', undefined);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('scope');
    url.searchParams.delete('law');
    window.history.replaceState(null, '', url);
  };

  /** Limpia todo: query + filtros + resultados */
  const resetAll = () => {
    setQuery('');
    setScope('todos');
    setLawCode('');
    setResult(null);
    setError('');
    const url = new URL(window.location.href);
    url.searchParams.delete('q');
    url.searchParams.delete('scope');
    url.searchParams.delete('law');
    window.history.replaceState(null, '', url);
  };

  const copyArticle = async (article: LegalArticle) => {
    try {
      await navigator.clipboard.writeText(articlePlainText(article));
      setCopiedId(article.id);
      trackEvent('article_copy', {
        article_id: article.id,
        law_code: article.lawCode,
      });
      window.setTimeout(() => setCopiedId(null), 1600);
      notify('Artículo copiado al portapapeles.', 'success');
    } catch {
      notify('El navegador no permitió copiar el texto.', 'error');
    }
  };

  const shareArticle = async (article: LegalArticle) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${article.lawCode} · ${article.articleNumber}`,
          text: articlePlainText(article),
        });
      } else {
        await copyArticle(article);
      }
    } catch (shareError) {
      if ((shareError as Error).name !== 'AbortError') {
        notify('No fue posible compartir el artículo.', 'error');
      }
    }
  };

  const sendToStudio = (article: LegalArticle) => {
    sessionStorage.setItem('lex_studio_pending_citation', JSON.stringify(article));
    const url = new URL(window.location.href);
    url.searchParams.set('tab', 'estudio');
    window.history.pushState(null, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    trackEvent('legal_article_send_to_studio', { article_id: article.id, law_code: article.lawCode });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* Clean Hero Section */}
      <section className="border-b border-slate-800 bg-legal-shell text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-5">
          {/* Header: Title and SQLite Status */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="font-serif text-xl font-bold leading-tight sm:text-2xl text-white">
              Fundamentador Jurídico Federal
            </h1>

            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold ${
                isOnline
                  ? 'border-emerald-700/60 bg-emerald-950/40 text-emerald-300'
                  : 'border-amber-700/60 bg-amber-950/40 text-amber-200'
              }`}
            >
              {isOnline ? <ShieldCheck size={14} /> : <WifiOff size={14} />}
              {isOnline ? 'SQLite WASM' : 'Sin conexión'}
            </div>
          </div>

          {/* Integrated Search Box */}
          <form
            onSubmit={runSearch}
            className="mt-4 rounded-2xl border border-slate-700 bg-slate-900/90 p-3 shadow-premium"
          >
            <label htmlFor="legal-query" className="sr-only">
              ¿Qué necesitas fundamentar?
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  id="legal-query"
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar concepto, supuesto jurídico o artículo (ej. rescisión, art. 47 LFT)..."
                  autoComplete="off"
                  className="min-h-11 w-full rounded-xl border border-slate-600 bg-slate-950 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-legal-gold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="inline-flex min-h-11 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-xl bg-legal-gold px-5 text-xs font-bold text-slate-950 transition hover:bg-legal-goldhover disabled:cursor-wait disabled:opacity-60 cursor-pointer"
                >
                  {isSearching ? <LoaderCircle size={16} className="animate-spin" /> : <FileSearch size={16} />} Buscar
                </button>
                <button
                  type="button"
                  onClick={() => setShowFilters(!showFilters)}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-xs font-bold transition cursor-pointer ${
                    showFilters || activeFiltersCount > 0
                      ? 'border-legal-gold bg-legal-gold/20 text-legal-gold font-bold'
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                  aria-expanded={showFilters}
                >
                  <Filter size={15} />
                  <span>Filtros</span>
                  {activeFiltersCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-legal-gold text-[10px] font-bold text-slate-950">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Quick 1-Touch Scope Pills */}
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">
                Materia:
              </span>
              {scopes.map(([scopeKey, scopeLabel]) => {
                const isActive = scope === scopeKey;
                return (
                  <button
                    key={scopeKey}
                    type="button"
                    onClick={() => {
                      setScope(scopeKey);
                      setLawCode('');
                      if (query.trim()) {
                        void performSearch(query, scopeKey, undefined);
                      }
                    }}
                    className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition cursor-pointer ${
                      isActive
                        ? 'bg-legal-gold text-slate-950 font-bold shadow-card'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    {scopeLabel}
                  </button>
                );
              })}
            </div>

            {/* Collapsible Filters Bar */}
            {showFilters && (
              <div className="mt-3 grid gap-2 border-t border-slate-700/80 pt-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-300">
                  Área Jurídica
                  <select
                    value={scope}
                    onChange={(event) => {
                      setScope(event.target.value as CorpusSearchScope);
                      setLawCode('');
                    }}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    {scopes.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold text-slate-300">
                  Ley o reglamento
                  <select
                    value={activeLawCode}
                    onChange={(event) => setLawCode(event.target.value)}
                    className="mt-1 min-h-10 w-full rounded-xl border border-slate-600 bg-slate-950 px-3 text-xs text-white focus:border-legal-gold focus:outline-none"
                  >
                    <option value="">Todas las leyes del área</option>
                    {availableLaws.map((law) => (
                      <option key={law.code} value={law.code}>
                        {law.code} · {law.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {/* Active Filter Chips */}
            {activeFiltersCount > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-2">
                <span className="text-[11px] font-bold text-slate-400">Filtros activos:</span>
                {scope !== 'todos' && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Área: {AREA_LABELS[scope]}
                    <button
                      type="button"
                      onClick={() => {
                        setScope('todos');
                        setLawCode('');
                      }}
                      className="hover:text-white cursor-pointer"
                      title="Quitar filtro de área"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {activeLawCode && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-legal-gold">
                    Ley: {activeLawCode}
                    <button
                      type="button"
                      onClick={() => setLawCode('')}
                      className="hover:text-white cursor-pointer"
                      title="Quitar filtro de ley"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={resetFilters}
                  className="text-[11px] font-bold text-red-400 hover:text-red-300 ml-1 underline cursor-pointer"
                >
                  Restablecer
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="mt-2 rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-xs text-red-200">
                {error}
              </p>
            )}
          </form>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6">

        {/* Suggestions — visible when no search performed yet */}
        {!result && !isSearching && (
          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-legal-golddark" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Consultas frecuentes
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SUGGESTED_LEGAL_SEARCHES.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSuggestionClick(item.query, item.scope, item.lawCode)}
                  className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-legal-gold hover:bg-amber-50/60 hover:text-slate-950 transition active:scale-95 cursor-pointer"
                >
                  <Search size={12} className="text-slate-400 group-hover:text-legal-golddark" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        {result && (
          <div className="space-y-4" aria-live="polite">
            <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">
                  {result.articles.length} {result.articles.length === 1 ? 'resultado' : 'resultados'} para "{result.query}"
                </p>
                <p className="mt-1 text-xs text-slate-500">Área consultada: {result.scopeLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <RotateCcw size={12} /> Nueva consulta
                </button>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                  <ShieldCheck size={13} className="text-emerald-600" /> SQLite WASM
                </span>
              </div>
            </div>

            {result.articles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                <FileSearch className="mx-auto text-slate-400" size={32} />
                <h2 className="mt-2 text-sm font-bold text-slate-900">No encontramos coincidencias</h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Prueba con menos palabras, elige otra área o consulta todas las leyes y reglamentos.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {result.articles.map((article) => {
                  const isExpanded = expanded.has(article.id);
                  const areaBadge = AREA_BADGES[article.area] || { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' };

                  return (
                    <article
                      key={article.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition hover:border-slate-300"
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                                {article.lawCode}
                              </span>
                              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${areaBadge.bg} ${areaBadge.text} ${areaBadge.border}`}>
                                {AREA_LABELS[article.area] || article.area}
                              </span>
                              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                                {article.articleNumber}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                {article.sourceKind}
                              </span>
                            </div>
                            <h2 className="mt-2 font-serif text-sm font-bold leading-5 text-slate-950 sm:text-base">
                              {article.lawName}
                            </h2>
                            {article.title && (
                              <p className="mt-1 text-xs font-medium text-slate-500">{article.title}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => copyArticle(article)}
                              className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              aria-label="Copiar artículo"
                              title="Copiar artículo"
                            >
                              {copiedId === article.id ? (
                                <Check size={16} className="text-emerald-600" />
                              ) : (
                                <Copy size={16} />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => shareArticle(article)}
                              className="flex min-h-9 min-w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
                              aria-label="Compartir artículo"
                              title="Compartir artículo"
                            >
                              <Share2 size={16} />
                            </button>
                          </div>
                        </div>

                        <p
                          className={`mt-3 max-w-[78ch] whitespace-pre-line text-xs sm:text-sm leading-6 sm:leading-7 text-slate-700 ${
                            isExpanded ? '' : 'line-clamp-4'
                          }`}
                        >
                          {article.content}
                        </p>

                        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <a
                            href={article.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex min-h-9 items-center gap-2 rounded-xl text-xs font-bold text-blue-700 hover:text-blue-900"
                          >
                            <ExternalLink size={14} /> {article.sourceName}
                          </a>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => sendToStudio(article)}
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-bold text-slate-800 hover:bg-slate-50 hover:border-slate-400 cursor-pointer active:scale-95 transition"
                            >
                              <FilePenLine size={14} className="text-legal-golddark" /> Usar en Ingeniería Jurídica
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpanded((current) => {
                                  const next = new Set(current);
                                  if (next.has(article.id)) next.delete(article.id);
                                  else next.add(article.id);
                                  return next;
                                })
                              }
                              className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                              {isExpanded ? 'Contraer texto' : 'Ver texto completo'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Desktop Complementary Banner */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-card">
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold text-legal-gold flex items-center justify-center sm:justify-start gap-2">
                  <HardDrive size={15} /> ¿Necesitas auditar o redactar contratos con estos fundamentos?
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Lex Corporativo Desktop incluye auditoría de cláusulas, exportación Word/PDF y expedientes locales con clave propia (BYOK).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('tab', 'desktop');
                  window.history.pushState(null, '', url);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-4 py-2 text-xs font-bold transition cursor-pointer shrink-0"
              >
                <span>Ficha Técnica Desktop</span>
              </button>
            </div>

            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs leading-5 text-slate-600">
              Coteja siempre la vigencia y última reforma en la fuente oficial enlazada antes de emitir opinión legal.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
