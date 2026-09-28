import {
  BookOpenCheck,
  ExternalLink,
  FilePenLine,
  HardDrive,
  Info,
  Landmark,
  ShieldCheck,
  WifiOff,
  X,
} from 'lucide-react';
import { CORPUS_STATS, OFFICIAL_LAWS_URL } from '../lib/corpus-catalog';
import { COMPRANET_GOB_URL, COMPRANET_PORTAL_URL, DATOS_ABIERTOS_URL, LICITACIONES_STATS } from '../lib/licitaciones-catalog';
import { DESKTOP_SPECS } from '../lib/desktop-specs';
import { useUiStore } from '../store/useUiStore';

interface SearchInfoSheetProps {
  open: boolean;
  onClose: () => void;
}

export function SearchInfoSheet({ open, onClose }: SearchInfoSheetProps) {
  const { isOnline } = useUiStore();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <section
        aria-modal="true"
        role="dialog"
        aria-label="Información"
        className="flex max-h-[88vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-dialog sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Info size={20} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-950">Acerca de Lex Corporativo PWA</h2>
              <p className="text-[11px] text-slate-500">Servicios limpios de consulta jurídica y licitaciones públicas</p>
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

        <div className="space-y-4 overflow-y-auto p-4">
          {/* Service 1: Open Tenders CompraNet — first because protagonist */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <Landmark size={18} className="text-blue-700" /> Licitaciones CompraNet
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Catálogo de contrataciones públicas federales con ejecución nacional y por entidad ({LICITACIONES_STATS.total} procedimientos activos en {LICITACIONES_STATS.convocantes} instituciones convocantes como IMSS, CFE, PEMEX, SICT, SAT, etc.), con fechas críticas, montos estimados, fundamento en LAASSP/LOPSRM y enlace oficial al expediente de CompraNet.
            </p>
          </div>

          {/* Service 2: Legal Legislation */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <BookOpenCheck size={18} className="text-legal-golddark" /> Buscador Normativo Federal
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Corpus estructurado con {CORPUS_STATS.provisions.toLocaleString('es-MX')} disposiciones en{' '}
              {CORPUS_STATS.instruments} leyes y reglamentos federales (Laboral, Mercantil, Fiscal, Aduanal y Comercio Exterior),
              con motor SQLite WASM en sesión y enlaces directos a la Cámara de Diputados.
            </p>
          </div>

          {/* Service 3: Estudio Jurídico */}
          <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
              <FilePenLine size={18} className="text-amber-700" /> Estudio Jurídico Local
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              Redacción y generación de 25 instrumentos y contratos con plantillas profesionales, vinculación de citas del corpus federal, importación de documentos y guardado local en IndexedDB en tu navegador.
            </p>
          </div>

          {/* Service 3: Desktop Station Showcase */}
          <div className="rounded-2xl bg-slate-950 p-4 border border-legal-gold/40 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-legal-gold">
                <HardDrive size={16} /> Estación Desktop para Windows
              </div>
              <span className="rounded-md bg-legal-gold/20 px-2 py-0.5 text-[10px] font-bold text-legal-gold">
                v{DESKTOP_SPECS.version}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Estación de trabajo local complementaria para <strong>auditoría contractual multi-materia</strong> (Mercantil, Laboral, Comercio Exterior, Aduanal, Fiscal), redacción de instrumentos en Word (.docx) y PDF, bóveda local cifrada y privacidad con método BYOK 100% offline.
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] text-slate-400">Instalador firmado ({DESKTOP_SPECS.fileSizeFormatted})</span>
              <a
                href={DESKTOP_SPECS.downloadUrl}
                className="inline-flex items-center gap-2 rounded-lg bg-legal-gold hover:bg-legal-goldhover text-slate-950 px-3 py-2 text-xs font-bold transition cursor-pointer"
              >
                <span>Descargar .EXE</span>
              </a>
            </div>
          </div>

          {/* Privacy & Processing */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
              {isOnline ? (
                <ShieldCheck size={18} className="text-emerald-600" />
              ) : (
                <WifiOff size={18} className="text-amber-600" />
              )}
              <span>Privacidad y Procesamiento</span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              La consulta de leyes opera sobre motor SQLite WASM en la memoria del navegador durante la sesión, sin almacenar expedientes ni enviar tus consultas a servidores externos. Medimos rendimiento y embudo de forma agregada con Vercel Analytics y Speed Insights para asegurar la calidad de la plataforma.
            </p>
          </div>

          {/* Official External Links */}
          <div className="grid gap-2 sm:grid-cols-2">
            <a
              href={COMPRANET_PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-4 text-xs font-bold text-blue-700 hover:bg-slate-50 transition"
            >
              Portal ComprasMX (CompraNet) <ExternalLink size={14} />
            </a>
            <a
              href={COMPRANET_GOB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-4 text-xs font-bold text-blue-700 hover:bg-slate-50 transition"
            >
              Portal gob.mx/compranet <ExternalLink size={14} />
            </a>
            <a
              href={DATOS_ABIERTOS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-4 text-xs font-bold text-blue-700 hover:bg-slate-50 transition"
            >
              Datos Abiertos México <ExternalLink size={14} />
            </a>
            <a
              href={OFFICIAL_LAWS_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center justify-between rounded-xl border border-slate-200 px-4 text-xs font-bold text-blue-700 hover:bg-slate-50 transition"
            >
              Leyes Federales <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
