import { BookOpen, Copy, ExternalLink, Trash2 } from 'lucide-react';
import type { LegalCitation } from '../../types';
import { useUiStore } from '../../store/useUiStore';

interface FootnotesAppendixProps {
  citations: LegalCitation[];
  onRemoveCitation: (citationId: string) => void;
}

export function FootnotesAppendix({ citations, onRemoveCitation }: FootnotesAppendixProps) {
  const { notify } = useUiStore();

  if (citations.length === 0) return null;

  const copyCitationText = (citation: LegalCitation) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    const text = `${citation.lawName}, ${citation.articleNumber}.\n${citation.content}\nFuente oficial: ${citation.sourceName} (${citation.sourceUrl})`;
    navigator.clipboard.writeText(text);
    notify('Cita legal copiada al portapapeles.', 'success');
  };

  const handleRemove = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    onRemoveCitation(id);
  };

  return (
    <section
      aria-label="Notas al pie y apéndice de fundamentación legal"
      className="mt-8 border-t-2 border-slate-900/80 pt-4"
    >
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-legal-gold" />
          <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-slate-900">
            Notas al Pie y Apéndice de Fundamentación Legal ({citations.length})
          </h3>
        </div>
        <span className="text-[10px] font-medium text-slate-400">
          Corpus Federal Vigente · DOF
        </span>
      </div>

      <ol className="space-y-3 pl-0 text-left text-xs leading-relaxed text-slate-700">
        {citations.map((citation, index) => (
          <li
            key={citation.id}
            className="group relative flex items-start gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-3 transition hover:border-slate-200 hover:bg-slate-50"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-900 text-[10px] font-bold text-white">
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-950">
                {citation.lawName}, {citation.articleNumber}
                {citation.title && <span className="font-normal text-slate-600"> — {citation.title}</span>}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{citation.content}</p>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                <a
                  href={citation.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-legal-golddark hover:underline"
                >
                  <span>{citation.sourceName}</span>
                  <ExternalLink size={10} />
                </a>
                <span>·</span>
                <span>Incorporada: {new Date(citation.createdAt).toLocaleDateString('es-MX')}</span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 opacity-90 group-hover:opacity-100">
              <button
                type="button"
                onClick={() => copyCitationText(citation)}
                className="studio-icon-button h-9 w-9 min-h-9 min-w-9 sm:h-7 sm:w-7 sm:min-h-7 sm:min-w-7 text-slate-400 hover:text-slate-900 active:scale-90"
                title="Copiar texto de la cita"
                aria-label={`Copiar cita ${index + 1}`}
              >
                <Copy size={14} className="sm:w-3.5 sm:h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleRemove(citation.id)}
                className="studio-icon-button h-9 w-9 min-h-9 min-w-9 sm:h-7 sm:w-7 sm:min-h-7 sm:min-w-7 text-slate-400 hover:text-red-600 active:scale-90"
                title="Eliminar de las notas al pie"
                aria-label={`Eliminar cita ${index + 1}`}
              >
                <Trash2 size={14} className="sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
