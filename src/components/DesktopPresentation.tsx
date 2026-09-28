import { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  Download,
  ExternalLink,
  FileCheck2,
  FileSignature,
  FolderLock,
  HardDrive,
  KeyRound,
  Layers,
  Lock,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import logoMark from '../assets/logo-mark.png';
import { DESKTOP_AREAS, DESKTOP_SPECS } from '../lib/desktop-specs';
import { useUiStore } from '../store/useUiStore';
import { trackEvent } from '../lib/analytics';

export function DesktopPresentation() {
  const [copiedSha, setCopiedSha] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string>('mercantil');
  const { notify } = useUiStore();

  const handleCopySha = async () => {
    try {
      await navigator.clipboard.writeText(DESKTOP_SPECS.sha512);
      setCopiedSha(true);
      trackEvent('copy_hash_click', { algorithm: 'sha512' });
      notify('Hash SHA-512 copiado al portapapeles.', 'success');
      setTimeout(() => setCopiedSha(false), 2500);
    } catch {
      notify('No se pudo copiar el hash. Selecciónalo manualmente.', 'error');
    }
  };

  const handleDownload = () => {
    trackEvent('download_desktop_click', {
      version: DESKTOP_SPECS.version,
      platform: DESKTOP_SPECS.platform,
      fileName: DESKTOP_SPECS.fileName,
    });
    // Trigger download of the installer
    window.location.href = DESKTOP_SPECS.downloadUrl;
  };

  const activeAreaInfo = DESKTOP_AREAS.find((a) => a.code === selectedArea) || DESKTOP_AREAS[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-legal-shell text-white border-b border-slate-800 py-12 sm:py-16 px-4 sm:px-6">
        {/* Ambient Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(197,160,89,0.14)_0%,transparent_70%)] filter blur-3xl" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-[radial-gradient(circle,rgba(30,58,95,0.3)_0%,transparent_75%)] filter blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl">
          <div className="flex flex-col items-center text-center">
            {/* Brand Logo & Product Badge */}
            <div className="mb-4 flex items-center justify-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-legal-gold/40 bg-legal-shell shadow-premium shadow-black/40">
                <img src={logoMark} alt="Lex Corporativo" className="h-full w-full object-cover rounded-2xl" />
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-legal-gold/40 bg-legal-gold/10 px-4 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-legal-gold shadow-card">
                <Sparkles size={13} /> Estación Jurídica para Windows
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white max-w-3xl leading-tight">
              Lex Corporativo Desktop
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl font-normal leading-relaxed">
              Estación de trabajo local para <strong>auditoría contractual multi-materia</strong>, redacción estructurada de instrumentos jurídicos y gestión de expedientes empresariales bajo control exclusivo del equipo legal.
            </p>

            {/* Direct Download Card */}
            <div className="mt-8 w-full max-w-xl rounded-2xl border border-legal-gold/30 bg-slate-900/90 p-5 sm:p-6 shadow-dialog backdrop-blur-md">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-serif text-lg font-bold text-white">Instalador Oficial</span>
                    <span className="rounded-md bg-legal-gold/20 px-2 py-0.5 text-[10px] font-bold text-legal-gold uppercase tracking-wider">
                      v{DESKTOP_SPECS.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {DESKTOP_SPECS.platform} · {DESKTOP_SPECS.architecture} · {DESKTOP_SPECS.fileSizeFormatted}
                  </p>
                  <div className="mt-2 flex items-center justify-center sm:justify-start gap-2 text-[11px] text-emerald-400 font-medium">
                    <ShieldCheck size={14} />
                    <span>Binario firmado digitalmente y distribuible</span>
                  </div>
                </div>

                <a
                  href={DESKTOP_SPECS.downloadUrl}
                  onClick={handleDownload}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-legal-gold hover:bg-legal-goldhover text-slate-950 px-6 py-4 text-xs font-bold transition shadow-premium hover:scale-[1.02] active:scale-95 cursor-pointer shrink-0"
                >
                  <Download size={18} />
                  <span>Descargar .EXE</span>
                </a>
              </div>
            </div>

            {/* Quick Guarantees */}
            <div className="mt-6 flex flex-wrap justify-center items-center gap-4 text-xs font-medium text-slate-400">
              <span className="flex items-center gap-2">
                <HardDrive size={14} className="text-blue-400" /> Motor RAG y Corpus 100% Offline
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-2">
                <KeyRound size={14} className="text-legal-gold" /> Método BYOK (Clave propia cifrada en OS)
              </span>
              <span className="text-slate-700">•</span>
              <span className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" /> Cero Telemetría / Secreto Profesional
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Technical Sheet Container */}
      <main className="mx-auto max-w-5xl px-4 sm:px-6 -mt-4 relative z-20 space-y-8">
        
        {/* Technical Sheet Card 1: Core Functional Capabilities */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-legal-gold">
              <Layers size={20} />
            </span>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-950">
                Ficha Técnica: Capacidades de la Estación Desktop
              </h2>
              <p className="text-xs text-slate-500">
                Herramientas profesionales de alta densidad para abogados, corporativos y áreas jurídicas
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Capability 1: Multi-Area Contract Risk Audit */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <FileCheck2 size={18} />
                  </span>
                  <h3>Auditoría Contractual</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Carga de contratos y documentos (PDF o DOCX). El motor contrasta el contenido contra el corpus normativo oficial aplicable y genera un diagnóstico con <strong>semáforo de riesgo, cláusulas nulas o abusivas, omisiones críticas y redacción correctiva sugerida</strong>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-medium text-slate-500">
                Áreas: Mercantil, Laboral, Comercio Exterior, Aduanal y Fiscal.
              </div>
            </div>

            {/* Capability 2: Legal Drafting & Templates */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-legal-golddark font-bold text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-legal-golddark">
                    <FileSignature size={18} />
                  </span>
                  <h3>Redactor & Plantillas</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Asistente guiado de redacción jurídica desde plantillas canónicas o especificaciones a la medida. Ensambla instrumentos jurídicos completos con exportación nativa directa a <strong>Word editable (.docx)</strong> y <strong>PDF formal (.pdf)</strong>.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-medium text-slate-500">
                Formatos: .DOCX estructurado y .PDF formal con foliado.
              </div>
            </div>

            {/* Capability 3: Encrypted Case Vault */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                    <FolderLock size={18} />
                  </span>
                  <h3>Bóveda Local de Asuntos</h3>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">
                  Base de datos local cifrada que conserva expedientes, dictámenes de auditoría, borradores y notas de trabajo en la propia máquina, con trazabilidad forense mediante hashes criptográficos en cada cita normativa.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] font-medium text-slate-500">
                Almacenamiento: SQLite local independiente sin nube.
              </div>
            </div>
          </div>
        </section>

        {/* Technical Sheet Card 2: Multi-Area Scope Selector */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-900 text-white">
              <Scale size={20} />
            </span>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-950">
                Materias Jurídicas Cubiertas para Auditoría y Redacción
              </h2>
              <p className="text-xs text-slate-500">
                El motor de auditoría y redactor opera sobre 5 áreas del derecho corporativo mexicano
              </p>
            </div>
          </div>

          {/* Area Tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {DESKTOP_AREAS.map((area) => (
              <button
                key={area.code}
                type="button"
                onClick={() => setSelectedArea(area.code)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer ${
                  selectedArea === area.code
                    ? 'bg-slate-900 text-legal-gold shadow-card font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {area.name}
              </button>
            ))}
          </div>

          {/* Selected Area Detail Box */}
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="font-bold text-slate-950 text-sm">{activeAreaInfo.name}</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {activeAreaInfo.description}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-200">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Leyes y Códigos Federales Integrados en el Motor:
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeAreaInfo.laws.map((law) => (
                  <span
                    key={law}
                    className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 shadow-card"
                  >
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    {law}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Technical Sheet Card 3: Architecture, BYOK Privacy & Engine Specs */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-emerald-400">
              <Lock size={20} />
            </span>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-950">
                Arquitectura de Procesamiento, Privacidad y Método BYOK
              </h2>
              <p className="text-xs text-slate-500">
                Diseño Zero-Cloud con control exclusivo de credenciales y datos por el usuario
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* Architecture Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Database size={15} /> Motores Locales Integrados en el Instalador
              </h3>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">RAG Semántico Vectorial Offline</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Motor vectorial <strong>LanceDB</strong> embebido con modelo de embeddings de 384 dimensiones ejecutado localmente vía <strong>ONNX Runtime</strong> en el CPU/GPU. Búsqueda contextual instantánea sobre 7,348 fragmentos normativos sin enviar el corpus a internet.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">Bóveda Cifrada de Asuntos</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Persistencia nativa en <strong>better-sqlite3</strong> para portafolios, notas y dictámenes. Los datos permanecen estrictamente en el disco del equipo.
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">Corpus Federal Oficial Gobernado</h4>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    16 ordenamientos federales íntegros auditados y verificados con hashes SHA-256 independientes frente a publicaciones oficiales de la Cámara de Diputados y el SAT.
                  </p>
                </div>
              </div>
            </div>

            {/* BYOK Privacy Details */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <KeyRound size={15} /> Modelo de Privacidad BYOK (Bring Your Own Key)
              </h3>

              <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">Soberanía de Datos & Cero Servidores Centrales</h4>
                  <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                    La aplicación no canaliza consultas a través de servidores intermediarios. El procesamiento ocurre de forma directa y autónoma en la estación de trabajo.
                  </p>
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <h4 className="text-xs font-bold text-emerald-950">Cifrado de Llaves en el Sistema Operativo</h4>
                  <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                    Cuando el usuario configura su clave API para funciones generativas, la llave se almacena cifrada mediante las APIs de seguridad nativas de Windows (DPAPI / SafeStorage de Electron).
                  </p>
                </div>

                <div className="pt-2 border-t border-emerald-200/60">
                  <h4 className="text-xs font-bold text-emerald-950">Protección del Secreto Profesional</h4>
                  <p className="text-[11px] text-slate-700 mt-1 leading-relaxed">
                    Ningún expediente, contrato cargado ni resultado de auditoría se utiliza para re-entrenar modelos externos ni se comparte con terceros.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Technical Sheet Card 4: System Requirements & Cryptographic Verification */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-blue-400">
              <Cpu size={20} />
            </span>
            <div>
              <h2 className="font-serif text-lg sm:text-xl font-bold text-slate-950">
                Requisitos de Sistema y Verificación del Instalador
              </h2>
              <p className="text-xs text-slate-500">
                Especificaciones de hardware y comprobación de integridad para áreas de TI y seguridad
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {/* System Requirements Table */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Requisitos de Hardware y Software
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Componente</th>
                      <th className="p-3">Mínimo</th>
                      <th className="p-3">Recomendado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-600">
                    {DESKTOP_SPECS.requirements.map((req) => (
                      <tr key={req.label}>
                        <td className="p-3 font-medium text-slate-900">{req.label}</td>
                        <td className="p-3">{req.minimum}</td>
                        <td className="p-3 text-slate-900 font-medium">{req.recommended}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Cryptographic Verification Box */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Verificación de Integridad del Binario
                </h3>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Nombre de archivo:</span>
                    <span className="font-mono font-bold text-slate-900">{DESKTOP_SPECS.fileName}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Tamaño del binario:</span>
                    <span className="font-medium text-slate-900">{DESKTOP_SPECS.fileSizeFormatted} ({DESKTOP_SPECS.fileSizeBytes.toLocaleString()} bytes)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Firma digital:</span>
                    <span className="font-medium text-emerald-700 flex items-center gap-1">
                      <ShieldCheck size={14} /> Verificada (NSIS x64)
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[11px] text-slate-500 block mb-1 font-medium">Hash SHA-512 Oficial:</span>
                    <div className="rounded-lg bg-slate-900 text-slate-300 p-3 font-mono text-[10px] break-all select-all">
                      {DESKTOP_SPECS.sha512}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySha}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 transition cursor-pointer shadow-card"
                >
                  <Copy size={14} />
                  <span>{copiedSha ? '¡Hash copiado!' : 'Copiar Hash SHA-512'}</span>
                </button>
                <a
                  href={DESKTOP_SPECS.githubReleaseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-800 transition cursor-pointer shadow-card"
                  title="Ver release en GitHub"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Notas de versión</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Download Banner */}
        <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 border border-legal-gold/30">
          <div>
            <h3 className="font-serif text-base font-bold text-white">¿Listo para instalar la Estación de Trabajo?</h3>
            <p className="text-xs text-slate-400 mt-1">
              Descarga directa de {DESKTOP_SPECS.fileName} ({DESKTOP_SPECS.fileSizeFormatted}) para Windows 10 y 11.
            </p>
          </div>
          <a
            href={DESKTOP_SPECS.downloadUrl}
            onClick={handleDownload}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-legal-gold hover:bg-legal-goldhover text-slate-950 px-6 py-3 text-xs font-bold transition shadow-premium shrink-0 cursor-pointer"
          >
            <Download size={16} />
            <span>Descargar Instalador .EXE</span>
          </a>
        </section>

      </main>
    </div>
  );
}
