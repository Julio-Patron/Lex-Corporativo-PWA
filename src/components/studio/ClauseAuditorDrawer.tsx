import { useMemo } from 'react';
import { AlertCircle, CheckCircle2, ChevronRight, FileCheck, ShieldAlert, Sparkles, X } from 'lucide-react';
import type { LegalCitation } from '../../types';

export interface AuditRule {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  suggestedLawCode: string;
  suggestedArticle: string;
  explanation: string;
  searchQuery: string;
}

const MEXICAN_LEGAL_RULES: AuditRule[] = [
  {
    id: 'pagare_requisitos',
    name: 'Requisitos de Validez del Pagaré',
    category: 'Mercantil',
    keywords: ['pagaré', 'pagare', 'pagare incondicionalmente', 'a la orden de', 'suscriptor', 'aval', 'cambiario'],
    suggestedLawCode: 'LGTOC',
    suggestedArticle: 'Art. 170',
    explanation: 'El pagaré debe contener la mención de ser pagaré y la promesa incondicional de pagar una suma determinada.',
    searchQuery: 'Articulo 170 pagare promesa incondicional',
  },
  {
    id: 'intereses_moratorios',
    name: 'Intereses Moratorios y Pacto de Demora',
    category: 'Mercantil',
    keywords: ['moratorio', 'interes moratorio', 'intereses moratorios', 'tasa de interes', 'demora', 'interes legal', 'usura'],
    suggestedLawCode: 'CCom',
    suggestedArticle: 'Art. 362',
    explanation: 'Los deudores que demoren el cumplimiento de su obligación deben pagar desde el día siguiente el interés pactado o el 6% anual legal.',
    searchQuery: 'Articulo 362 prestamo mercantil interes demora',
  },
  {
    id: 'sumision_jurisdiccional',
    name: 'Sumisión Expresa a Tribunales',
    category: 'Procesal Mercantil',
    keywords: ['jurisdiccion', 'tribunales competentes', 'sumision expresa', 'fuero', 'domicilio presente o futuro'],
    suggestedLawCode: 'CCom',
    suggestedArticle: 'Art. 1093',
    explanation: 'La sumisión es expresa cuando los interesados renuncian formalmente al fuero de su domicilio y designan tribunal.',
    searchQuery: 'Articulo 1093 sumision expresa tribunales fuero',
  },
  {
    id: 'asamblea_accionistas',
    name: 'Asamblea General Ordinaria Anual',
    category: 'Corporativo',
    keywords: ['asamblea', 'accionistas', 'estados financieros', 'comisario', 'orden del dia', 'sociedad anonima'],
    suggestedLawCode: 'LGSM',
    suggestedArticle: 'Art. 181',
    explanation: 'La asamblea ordinaria debe reunirse por lo menos una vez al año dentro de los cuatro meses siguientes a la clausura del ejercicio social.',
    searchQuery: 'Articulo 181 asamblea general ordinaria ejercicio',
  },
  {
    id: 'suministro_mercantil',
    name: 'Compraventa y Suministro Mercantil',
    category: 'Mercantil',
    keywords: ['suministro', 'proveedor', 'entrega de mercancias', 'ordenes de compra', 'compraventa mercantil', 'mercancias'],
    suggestedLawCode: 'CCom',
    suggestedArticle: 'Art. 371',
    explanation: 'Serán mercantiles las compraventas a las que el Código de Comercio les da tal carácter y las que se hagan con objeto de tráfico comercial.',
    searchQuery: 'Articulo 371 compraventas mercantiles',
  },
  {
    id: 'clausula_penal',
    name: 'Cláusula Penal / Pena Convencional',
    category: 'Civil / Contratos',
    keywords: ['pena convencional', 'clausula penal', 'penalizacion', 'en caso de incumplimiento pagara', 'incumplimiento'],
    suggestedLawCode: 'CCF',
    suggestedArticle: 'Art. 1840',
    explanation: 'Pueden los contratantes estipular cierta prestación como pena para el caso de que la obligación no se cumpla.',
    searchQuery: 'Articulo 1840 clausula penal prestacion incumplimiento',
  },
  {
    id: 'rescision_laboral',
    name: 'Causales de Rescisión Laboral',
    category: 'Laboral',
    keywords: ['rescision', 'rescision laboral', 'sin responsabilidad para el patron', 'despido justificado', 'patron', 'trabajador', 'salario'],
    suggestedLawCode: 'LFT',
    suggestedArticle: 'Art. 47',
    explanation: 'Las causas de rescisión de la relación de trabajo sin responsabilidad para el patrón exigen aviso de rescisión motivado.',
    searchQuery: 'Articulo 47 rescision relacion de trabajo patron',
  },
  {
    id: 'comprobantes_fiscales',
    name: 'Obligación de Emisión de CFDI',
    category: 'Fiscal',
    keywords: ['cfdi', 'factura', 'facturacion', 'comprobante fiscal', 'retencion de iva', 'retencion', 'iva', 'isr'],
    suggestedLawCode: 'CFF',
    suggestedArticle: 'Art. 29',
    explanation: 'Los contribuyentes que deban expedir comprobantes fiscales por los actos que realicen deben emitir CFDI por internet.',
    searchQuery: 'Articulo 29 comprobantes fiscales digitales CFDI',
  },
  {
    id: 'confidencialidad_industrial',
    name: 'Secreto Industrial y Confidencialidad',
    category: 'Propiedad Intelectual',
    keywords: ['secreto industrial', 'informacion confidencial', 'confidencialidad', 'no divulgacion'],
    suggestedLawCode: 'LFPPI',
    suggestedArticle: 'Art. 163',
    explanation: 'Se considera secreto industrial a toda información de aplicación industrial o comercial de carácter confidencial.',
    searchQuery: 'Articulo 163 secreto industrial informacion confidencial',
  },
];

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('es-MX')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface ClauseAuditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentText: string;
  citations: LegalCitation[];
  onQuickSearch: (query: string) => void;
}

export function ClauseAuditorDrawer({
  isOpen,
  onClose,
  documentText,
  citations,
  onQuickSearch,
}: ClauseAuditorDrawerProps) {
  const auditResults = useMemo(() => {
    const textNormalized = normalizeSearchText(documentText);

    return MEXICAN_LEGAL_RULES.map((rule) => {
      // Check if any keyword matches
      const isDetected = rule.keywords.some((kw) => textNormalized.includes(normalizeSearchText(kw)));

      // Check if already cited
      const isFundamented = citations.some((cit) => {
        const citNorm = normalizeSearchText(`${cit.lawCode} ${cit.lawName} ${cit.articleNumber}`);
        const lawCodeNorm = normalizeSearchText(rule.suggestedLawCode);
        const artNumClean = rule.suggestedArticle.replace(/art(?:iculo)?\.?\s*/i, '').trim();
        return citNorm.includes(lawCodeNorm) && (!artNumClean || citNorm.includes(artNumClean));
      });

      return {
        ...rule,
        isDetected,
        isFundamented,
      };
    });
  }, [documentText, citations]);

  const detectedClauses = useMemo(
    () => auditResults.filter((r) => r.isDetected),
    [auditResults],
  );

  const missingFundamentation = useMemo(
    () => detectedClauses.filter((r) => !r.isFundamented),
    [detectedClauses],
  );

  const score = useMemo(() => {
    if (detectedClauses.length === 0) return 100;
    const fundedCount = detectedClauses.filter((r) => r.isFundamented).length;
    return Math.round((fundedCount / detectedClauses.length) * 100);
  }, [detectedClauses]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-end sm:items-stretch sm:justify-end bg-slate-950/40 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Auditor de Fundamentación Legal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[88vh] sm:max-h-full h-auto sm:h-full w-full max-w-lg sm:max-w-md flex-col rounded-t-3xl sm:rounded-none bg-white shadow-dialog animate-slideUp sm:animate-slideLeft">
        {/* Mobile Pull Handle */}
        <div className="pt-3 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 bg-slate-50/80 rounded-t-3xl sm:rounded-none">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-900">
              <Sparkles size={18} />
            </span>
            <div>
              <h2 className="font-serif text-base font-bold text-slate-950">Auditor de Fundamentación</h2>
              <p className="text-[11px] text-slate-500">Escaneo semántico de cláusulas legales</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="studio-icon-button"
            aria-label="Cerrar auditor"
          >
            <X size={18} />
          </button>
        </div>

        {/* Score & Summary Banner */}
        <div className="border-b border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500">Salud de Fundamentación</span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`text-2xl font-bold ${score === 100 ? 'text-emerald-700' : score > 50 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {score}%
                </span>
                <span className="text-xs text-slate-500">
                  ({detectedClauses.length - missingFundamentation.length} de {detectedClauses.length} cláusulas con sustento)
                </span>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                missingFundamentation.length === 0
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {missingFundamentation.length === 0 ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              {missingFundamentation.length === 0 ? 'Óptimo' : `${missingFundamentation.length} Sugerencias`}
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 ${
                score === 100 ? 'bg-emerald-500' : score > 50 ? 'bg-amber-500' : 'bg-slate-700'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Clauses List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {detectedClauses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              <FileCheck size={28} className="mx-auto text-slate-400" />
              <p className="mt-2 text-xs font-bold">No se detectaron cláusulas complejas en el texto actual.</p>
              <p className="mt-1 text-[11px] text-slate-400">
                A medida que redactes términos como pagaré, intereses, asambleas, sumisión procesal o finiquitos, el auditor te sugerirá los artículos aplicables.
              </p>
            </div>
          ) : (
            detectedClauses.map((rule) => (
              <div
                key={rule.id}
                className={`rounded-xl border p-4 text-left transition ${
                  rule.isFundamented
                    ? 'border-emerald-200 bg-emerald-50/40'
                    : 'border-amber-200/90 bg-amber-50/40 shadow-card'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {rule.isFundamented ? (
                      <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                    ) : (
                      <ShieldAlert size={15} className="text-amber-600 shrink-0" />
                    )}
                    <h3 className="text-xs font-bold text-slate-950">{rule.name}</h3>
                  </div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-600 uppercase">
                    {rule.category}
                  </span>
                </div>

                <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
                  {rule.explanation}
                </p>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 pt-2 text-[11px]">
                  <span className="font-bold text-slate-900">
                    {rule.suggestedLawCode} · {rule.suggestedArticle}
                  </span>

                  {rule.isFundamented ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                      <CheckCircle2 size={12} /> Fundamentada en notas
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        onQuickSearch(rule.searchQuery);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-legal-gold px-3 py-1 text-[10px] font-bold text-slate-950 transition hover:bg-legal-goldhover active:scale-95 shadow-card"
                    >
                      <span>Fundamentar</span>
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
