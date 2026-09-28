import { useState } from 'react';
import {
  ArrowRight,
  BookOpenCheck,
  FilePenLine,
  HardDrive,
  Landmark,
  Scale,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import logoUrl from '../assets/logo-lockup-transparent.png';
import { CORPUS_STATS } from '../lib/corpus-catalog';
import { LICITACIONES_STATS } from '../lib/licitaciones-catalog';
import type { AppModuleTab } from '../types';

interface IntroductionProps {
  onOpenStation: (tab?: AppModuleTab) => void;
}

export function Introduction({ onOpenStation }: IntroductionProps) {
  const [isEntering, setIsEntering] = useState(false);

  const handleStart = (tab?: AppModuleTab) => {
    setIsEntering(true);
    setTimeout(() => {
      onOpenStation(tab);
    }, 200);
  };

  return (
    <div className="relative flex min-h-screen w-screen select-none items-center justify-center overflow-x-hidden bg-legal-shell font-sans text-white p-4 sm:p-6 md:py-8">
      {/* Ambient Lighting & Depth */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[15%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.10)_0%,transparent_70%)] filter blur-3xl" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(30,58,95,0.22)_0%,transparent_75%)] filter blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-legal-gold/30 to-transparent" />
      </div>

      {/* Main Presentation Container */}
      <main
        className={`relative z-10 flex w-full max-w-4xl flex-col items-center gap-6 sm:gap-8 text-center py-4 transition-all duration-300 ${
          isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
      >
        {/* =========================================================================
            NIVEL 1: HERO FOCUS (Punto focal unificado y llamada a la acción principal)
            ========================================================================= */}
        <header className="flex flex-col items-center gap-3 sm:gap-4 max-w-2xl">
          {/* Proportioned Brand Lockup */}
          <div className="w-full max-w-[240px] sm:max-w-[300px] flex justify-center">
            <img
              src={logoUrl}
              alt="Logotipo Lex Corporativo"
              width={300}
              height={237}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-auto object-contain drop-shadow-[0_10px_25px_rgba(197,160,89,0.28)]"
            />
          </div>

          {/* Category Tag */}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-legal-gold/30 bg-legal-gold/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-legal-gold shadow-card">
            <Sparkles size={12} className="text-legal-gold" /> Plataforma de Consulta e Ingeniería Jurídica
          </span>


          {/* REGLA DEL BOTÓN ÚNICO (Pendiente.md): El único botón primario con fondo sólido */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleStart('estudio')}
              className="inline-flex items-center justify-center gap-2.5 rounded-xl bg-legal-gold hover:bg-legal-goldhover text-slate-950 px-6 py-3.5 text-xs sm:text-sm font-bold shadow-premium hover:shadow-dialog hover:shadow-legal-gold/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <span>Abrir Ingeniería Jurídica</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </header>

        {/* =========================================================================
            NIVEL 2: SELECTOR DE MÓDULOS (Tarjetas secundarias limpias, sin muros de viñetas)
            ========================================================================= */}
        <section className="w-full space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Módulos de Trabajo Especializados
            </h2>
            <span className="text-[10px] text-slate-400">Acceso directo sin registro</span>
          </div>

          <div className="grid gap-4 md:grid-cols-3 text-left">
            {/* Módulo 1: Ingeniería Jurídica */}
            <div
              onClick={() => handleStart('estudio')}
              className="group relative rounded-2xl border border-legal-gold/30 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-card backdrop-blur-md transition-all duration-200 hover:border-legal-gold/70 hover:shadow-premium flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-legal-gold/30 bg-legal-gold/15 text-legal-gold">
                    <FilePenLine size={18} />
                  </span>
                  <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    25 documentos: Asambleas y contratos
                  </span>
                </div>
                <h3 className="font-serif text-base font-bold text-white transition group-hover:text-legal-gold">
                  Ingeniería Jurídica
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Redacción estructurada con variables guiadas e importación local DOCX/PDF. Sin almacenamiento en la nube, sin rastreo ni telemetría.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStart('estudio');
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-legal-gold/30 bg-legal-gold/10 px-3 py-2 text-xs font-semibold text-legal-gold transition group-hover:bg-legal-gold group-hover:text-slate-950"
                >
                  <span>Redactar Instrumentos</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* Módulo 2: Fundamentador Jurídico */}
            <div
              onClick={() => handleStart('normativa')}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-card backdrop-blur-md transition-all duration-200 hover:border-blue-500/50 hover:bg-slate-900/90 hover:shadow-premium flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-500/20 bg-blue-500/10 text-blue-400">
                    <BookOpenCheck size={18} />
                  </span>
                  <span className="rounded-md bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
                    5 materias: {CORPUS_STATS.instruments} leyes federales
                  </span>
                </div>
                <h3 className="font-serif text-base font-bold text-white transition group-hover:text-blue-300">
                  Fundamentador Jurídico
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  Consulta en Laboral, Mercantil, Fiscal, Aduanal y Comercio Exterior con motor SQLite WASM determinista en navegador.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStart('normativa');
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 transition group-hover:border-blue-500/60 group-hover:bg-blue-600 group-hover:text-white"
                >
                  <span>Consultar Fundamentador</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>

            {/* Módulo 3: Radar de Licitaciones */}
            <div
              onClick={() => handleStart('licitaciones')}
              className="group relative rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-card backdrop-blur-md transition-all duration-200 hover:border-amber-500/50 hover:bg-slate-900/90 hover:shadow-premium flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
                    <Landmark size={18} />
                  </span>
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    {LICITACIONES_STATS.total.toLocaleString('es-MX')} licitaciones
                  </span>
                </div>
                <h3 className="font-serif text-base font-bold text-white transition group-hover:text-amber-300">
                  Radar de Licitaciones
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">
                  CompraNet federal + compras estatales (Yucatán) con seguimiento de convocatorias, bases, juntas de aclaraciones y plazos.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStart('licitaciones');
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-300 transition group-hover:border-amber-500/60 group-hover:bg-amber-600 group-hover:text-white"
                >
                  <span>Explorar Radar</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            NIVEL 3: ACCESO SECUNDARIO DESKTOP (Barra horizontal refinada, no invasiva)
            ========================================================================= */}
        <aside className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 p-3.5 sm:px-5 sm:py-3 shadow-card backdrop-blur-sm transition-colors hover:border-legal-gold/40">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 border border-legal-gold/30 text-legal-gold">
                <HardDrive size={18} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-white">
                    Lex Corporativo Desktop
                  </span>
                  <span className="rounded bg-legal-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-legal-gold uppercase tracking-wider">
                    Windows .EXE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Estación de trabajo local para auditoría en 5 materias, redacción Word/PDF y expedientes privados.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleStart('desktop')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-1.5 text-xs font-medium transition shrink-0 cursor-pointer active:scale-95"
            >
              <span>Ficha Técnica Desktop</span>
              <ArrowRight size={13} />
            </button>
          </div>
        </aside>

        {/* =========================================================================
            TRUST BAR & PRIVACY (Garantías institucionales discretas)
            ========================================================================= */}
        <footer className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-[11px] font-medium text-slate-400 pt-1">
          <span className="flex items-center gap-1.5">
            <Zap size={12} className="text-legal-gold" /> Sin registro ni costo
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <Scale size={12} className="text-blue-400" /> Legislación federal oficial
          </span>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} className="text-emerald-400" /> 100% privado en navegador
          </span>
        </footer>
      </main>
    </div>
  );
}
