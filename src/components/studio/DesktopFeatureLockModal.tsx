import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  FolderLock,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { DESKTOP_SPECS } from '../../lib/desktop-specs';
import { trackEvent } from '../../lib/analytics';
import logoMark from '../../assets/logo-mark.png';

export type LockedFeatureType = 'auditar' | 'fundamentar' | null;

interface DesktopFeatureLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: LockedFeatureType;
  onNavigateToDesktop?: () => void;
}

export function DesktopFeatureLockModal({
  isOpen,
  onClose,
  feature,
  onNavigateToDesktop,
}: DesktopFeatureLockModalProps) {
  if (!isOpen || !feature) return null;

  const isAuditor = feature === 'auditar';

  const title = isAuditor
    ? 'Auditoría Contractual y Semántica'
    : 'Motor de Fundamentación y Citas en Vivo';

  const subtitle = isAuditor
    ? 'El análisis algorítmico profundo de cláusulas, detección de contradicciones y evaluación de salud contractual contra el marco legal mexicano son exclusivos de la aplicación Desktop.'
    : 'La consulta directa e indexación en memoria del corpus federal completo (Leyes, Códigos y Reglamentos) con inserción de citas formalizadas es exclusiva de la aplicación Desktop.';

  const handleDownloadDirect = () => {
    trackEvent('desktop_lock_modal_download_click', { feature });
    window.location.href = DESKTOP_SPECS.downloadUrl;
  };

  const handleGoToDesktopPresentation = () => {
    trackEvent('desktop_lock_modal_learn_more_click', { feature });
    onClose();
    if (onNavigateToDesktop) {
      onNavigateToDesktop();
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'desktop');
      window.history.pushState(null, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/75 p-0 sm:items-center sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lock-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-700 bg-slate-900 text-white shadow-dialog sm:rounded-2xl">
        {/* Mobile handle */}
        <div className="flex justify-center pb-0 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-legal-gold/40 bg-legal-shell shadow-card">
              <img src={logoMark} alt="Lex Corporativo" className="h-full w-full object-contain" />
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-legal-gold/40 bg-legal-gold/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
              <Lock size={10} /> Exclusivo de Lex Desktop
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            aria-label="Cerrar aviso"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[65vh] overflow-y-auto p-5 sm:p-6 space-y-5">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-legal-gold">
              {isAuditor ? <Sparkles size={14} /> : <Scale size={14} />}
              <span>{isAuditor ? 'Módulo de Auditoría' : 'Módulo de Fundamentación'}</span>
            </div>
            <h2 id="lock-modal-title" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-white">
              {title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              {subtitle}
            </p>
          </div>

          {/* Value Props Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ¿Por qué está reservado para la Estación Desktop?
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-start gap-2 rounded-lg bg-slate-900/80 p-3 border border-slate-800/80">
                <Cpu size={16} className="text-amber-400 shrink-0 mt-1" />
                <div>
                  <strong className="block text-white font-bold text-[11px]">Motor SQLite Nativo</strong>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    Búsquedas vectoriales y relacionales instantáneas sobre 100% de la legislación mexicana.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-slate-900/80 p-3 border border-slate-800/80">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-1" />
                <div>
                  <strong className="block text-white font-bold text-[11px]">Privacidad Absoluta</strong>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    Contratos y expedientes confidenciales nunca salen de tu ordenador local.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-slate-900/80 p-3 border border-slate-800/80">
                <FolderLock size={16} className="text-blue-400 shrink-0 mt-1" />
                <div>
                  <strong className="block text-white font-bold text-[11px]">Auditoría Multi-Materia</strong>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    Reglas jurídicas especializadas en Mercantil, Laboral, Fiscal y Comercio Exterior.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-slate-900/80 p-3 border border-slate-800/80">
                <CheckCircle2 size={16} className="text-legal-gold shrink-0 mt-1" />
                <div>
                  <strong className="block text-white font-bold text-[11px]">Cero Telemetría</strong>
                  <span className="text-[10px] text-slate-400 leading-tight block">
                    Sin suscripciones en la nube ni transferencias externas de datos de clientes.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Version Banner */}
          <div className="flex items-center justify-between rounded-xl border border-legal-gold/30 bg-legal-gold/10 p-3 sm:px-4">
            <div className="text-left">
              <span className="text-[11px] font-bold text-amber-200">
                Instalador Oficial para Windows (v{DESKTOP_SPECS.version})
              </span>
              <p className="text-[10px] text-amber-300/80">
                {DESKTOP_SPECS.platform} · {DESKTOP_SPECS.fileSizeFormatted}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadDirect}
              className="inline-flex items-center gap-2 rounded-lg bg-legal-gold px-3 py-2 text-xs font-bold text-slate-950 shadow-premium transition hover:bg-amber-400 active:scale-95 shrink-0"
              title="Descargar instalador oficial directamente"
            >
              <Download size={13} />
              <span>Descargar</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t border-slate-800 bg-slate-950 p-4 sm:px-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto rounded-xl border border-slate-700 bg-transparent px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
          >
            Continuar en el Editor Web
          </button>
          <button
            type="button"
            onClick={handleGoToDesktopPresentation}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-2 text-xs font-bold text-slate-950 transition hover:bg-white active:scale-95 shadow-premium"
          >
            <span>Conocer Estación Desktop</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
