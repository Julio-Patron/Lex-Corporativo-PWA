import { useState } from 'react';
import { CheckCircle2, ExternalLink, Landmark, Map, RadioTower, X } from 'lucide-react';
import { COVERAGE_SUMMARY, PROCUREMENT_SOURCES } from '../lib/coverage-sources';

interface CoverageSourcesSheetProps {
  open: boolean;
  onClose: () => void;
}

export function CoverageSourcesSheet({ open, onClose }: CoverageSourcesSheetProps) {
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragDelta, setDragDelta] = useState(0);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 backdrop-blur-xs sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        aria-modal="true"
        role="dialog"
        aria-label="Cobertura y fuentes"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-dialog transition-transform sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => setDragStart(event.touches[0].clientY)}
        onTouchMove={(event) => {
          if (dragStart === null) return;
          const delta = event.touches[0].clientY - dragStart;
          if (delta > 0) setDragDelta(delta);
        }}
        onTouchEnd={() => {
          if (dragDelta > 80) onClose();
          setDragStart(null);
          setDragDelta(0);
        }}
        style={dragDelta > 0 ? { transform: `translateY(${dragDelta}px)`, transition: 'none' } : {}}
      >
        <div className="flex justify-center pb-0 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-300" />
        </div>

        <header className="flex shrink-0 items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <Map size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950">Cobertura y fuentes</h2>
              <p className="text-[11px] text-slate-500">Procedencia verificable del radar de licitaciones</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
                <CheckCircle2 size={13} /> {COVERAGE_SUMMARY.available} {COVERAGE_SUMMARY.available === 1 ? 'fuente consultable' : 'fuentes consultables'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800">
                <Landmark size={13} /> {COVERAGE_SUMMARY.partial} cobertura parcial
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-800 ring-1 ring-blue-200">
                <RadioTower size={13} /> {COVERAGE_SUMMARY.prioritized} conectores priorizados
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Lex distingue lo que ya puede consultarse de las fuentes oficiales que siguen en integración. Una fuente verificada no implica todavía cobertura automática.
            </p>
          </div>

          <div className="space-y-3">
            {PROCUREMENT_SOURCES.map((source) => {
              const available = source.status === 'available';
              const partial = source.status === 'partial';
              return (
                <article key={source.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-950">
                          <Landmark size={16} className="text-slate-500" /> {source.territory}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                          {source.scope}
                        </span>
                        <span
                          className={`rounded-full px-3 py-0.5 text-[10px] font-bold ${
                            available
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                              : partial
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                              : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'
                          }`}
                        >
                          {available
                            ? 'Disponible en Lex'
                            : partial
                              ? 'Cobertura parcial'
                              : 'Integración priorizada'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-bold text-slate-700">{source.sourceName}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{source.description}</p>
                      {source.lastVerifiedAt && (
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          Verificada el {new Date(`${source.lastVerifiedAt}T12:00:00`).toLocaleDateString('es-MX')}
                        </p>
                      )}
                    </div>
                    <a
                      href={source.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-bold text-blue-700 transition hover:bg-slate-50"
                      aria-label={`Abrir fuente oficial de ${source.territory}`}
                    >
                      Fuente oficial <ExternalLink size={13} />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="rounded-xl bg-slate-100 px-3 py-2 text-[11px] leading-4 text-slate-600">
            La cobertura se amplía por conector y se publicará como activa únicamente después de validar actualización, campos y enlaces de cada portal.
          </p>
        </div>
      </section>
    </div>
  );
}
