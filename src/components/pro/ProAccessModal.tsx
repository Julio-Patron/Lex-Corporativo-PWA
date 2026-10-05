import { useEffect, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  LoaderCircle,
  Lock,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import {
  activateWithLicenseCode,
  isLicenseCodeFormat,
  isLikelyGeminiApiKey,
  saveByokApiKey,
  type ProSession,
} from '../../lib/pro-license';
import { trackEvent } from '../../lib/analytics';
import { useUiStore } from '../../store/useUiStore';
import logoMark from '../../assets/logo-mark.png';

type Step = 'choose' | 'license' | 'byok';

interface ProAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Se invoca tras activación exitosa (con la sesión Pro). */
  onActivated?: (session: ProSession) => void;
  /** Texto contextual de la función bloqueada (ej. "Fundamentación con IA"). */
  featureName?: string;
}

export function ProAccessModal({ isOpen, onClose, onActivated, featureName }: ProAccessModalProps) {
  const { notify } = useUiStore();
  const [step, setStep] = useState<Step>('choose');
  const [licenseCode, setLicenseCode] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep('choose');
      setError('');
      setBusy(false);
      trackEvent('pro_access_modal_open', { feature: featureName ?? 'generic' });
    }
  }, [isOpen, featureName]);

  if (!isOpen) return null;

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isLicenseCodeFormat(licenseCode)) {
      setError('Formato inválido. Usa el código exactamente como aparece en tu comprobante.');
      return;
    }
    setBusy(true);
    try {
      const session = await activateWithLicenseCode(licenseCode);
      trackEvent('pro_license_activated', { method: 'license' });
      notify('Licencia Pro activada en este dispositivo.', 'success');
      onActivated?.(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible activar la licencia.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveByok = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isLikelyGeminiApiKey(apiKey)) {
      setError('La clave no parece válida. Cópiala completa desde Google AI Studio.');
      return;
    }
    setBusy(true);
    try {
      const session = await saveByokApiKey(apiKey);
      trackEvent('pro_license_activated', { method: 'byok' });
      notify('Clave BYOK guardada. Fundamentador IA habilitado.', 'success');
      onActivated?.(session);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar la clave.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-access-title"
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl sm:rounded-2xl border border-slate-700 bg-slate-900 text-white shadow-dialog animate-slideUp sm:animate-fadeIn">
        {/* Mobile handle */}
        <div className="flex justify-center pb-0 pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-slate-700" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-legal-gold/40 bg-legal-shell shadow-card">
              <img src={logoMark} alt="Lex Corporativo" className="h-full w-full rounded-xl object-contain" />
            </span>
            <div>
              <span className="inline-flex items-center gap-1 rounded-full border border-legal-gold/40 bg-legal-gold/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                <Sparkles size={10} /> Edición Pro Móvil
              </span>
              <h2 id="pro-access-title" className="font-serif text-sm sm:text-base font-bold text-white leading-tight">
                {featureName ?? 'Funciones Pro con IA'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition active:scale-95"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-4 sm:p-6 space-y-4">
          {step === 'choose' && (
            <>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                La versión PWA móvil es de <strong className="text-amber-300">pago único</strong> y
                descargable desde la web. Activa tu acceso para usar el editor con IA y el
                Fundamentador Jurídico RAG sobre el corpus federal.
              </p>

              <div className="grid grid-cols-1 gap-3">
                <button
                  type="button"
                  onClick={() => setStep('license')}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-legal-gold/40 bg-legal-gold/10 p-4 text-left transition hover:bg-legal-gold/15 active:scale-98"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-legal-gold text-slate-950">
                      <KeyRound size={18} />
                    </span>
                    <div>
                      <strong className="block text-sm font-bold text-white">Tengo un código de licencia</strong>
                      <span className="block text-[11px] text-slate-300">
                        Activa la edición completa con el código de tu compra (pago único).
                      </span>
                    </div>
                  </div>
                  <BadgeCheck size={18} className="shrink-0 text-legal-gold" />
                </button>

                <button
                  type="button"
                  onClick={() => setStep('byok')}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-slate-500 active:scale-98"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-blue-300">
                      <ShieldCheck size={18} />
                    </span>
                    <div>
                      <strong className="block text-sm font-bold text-white">Usar mi propia clave (BYOK)</strong>
                      <span className="block text-[11px] text-slate-400">
                        Conecta tu API key gratuita de Google AI Studio. Tus datos no salen del dispositivo.
                      </span>
                    </div>
                  </div>
                  <ExternalLink size={16} className="shrink-0 text-slate-500" />
                </button>
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <Smartphone size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                <p className="text-[11px] leading-relaxed text-slate-400">
                  <strong className="text-slate-200">Instálala como app:</strong> desde el menú de tu
                  navegador elige «Añadir a pantalla de inicio». Sin tiendas ni comisiones; todo se
                  guarda localmente en tu teléfono.
                </p>
              </div>
            </>
          )}

          {step === 'license' && (
            <form onSubmit={handleActivateLicense} className="space-y-4">
              <div>
                <label htmlFor="pro-license-code" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Código de licencia
                </label>
                <input
                  id="pro-license-code"
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="LEX-PRO-2026"
                  value={licenseCode}
                  onChange={(e) => setLicenseCode(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base tracking-widest text-amber-200 placeholder:text-slate-600 focus:border-legal-gold focus:outline-none"
                />
                <p className="mt-2 text-[11px] text-slate-500">
                  Lo encuentras en el comprobante de tu compra web. Se valida en tu dispositivo.
                </p>
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('choose'); setError(''); }}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-legal-gold px-4 py-3 text-sm font-bold text-slate-950 shadow-premium transition hover:bg-amber-400 active:scale-95 disabled:opacity-60"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Lock size={15} />}
                  <span>Activar licencia</span>
                </button>
              </div>
            </form>
          )}

          {step === 'byok' && (
            <form onSubmit={handleSaveByok} className="space-y-4">
              <ol className="space-y-2.5">
                <li className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-legal-gold/20 text-[10px] font-black text-legal-gold">1</span>
                  <span>
                    Abre{' '}
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-amber-300 underline inline-flex items-center gap-0.5"
                      onClick={() => trackEvent('pro_byok_ai_studio_click')}
                    >
                      Google AI Studio <ExternalLink size={11} />
                    </a>{' '}
                    y genera una API key gratuita.
                  </span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-legal-gold/20 text-[10px] font-black text-legal-gold">2</span>
                  <span>Pégala aquí. Se guarda solo en tu dispositivo (IndexedDB).</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs text-slate-300">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-legal-gold/20 text-[10px] font-black text-legal-gold">3</span>
                  <span>El Fundamentador IA llamará a Gemini directamente desde tu navegador.</span>
                </li>
              </ol>

              <div>
                <label htmlFor="pro-byok-key" className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  Tu API key de Gemini
                </label>
                <input
                  id="pro-byok-key"
                  type="password"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="AIza…"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-legal-gold focus:outline-none"
                />
              </div>

              {error && (
                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/50 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep('choose'); setError(''); }}
                  className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
                >
                  Atrás
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-legal-gold px-4 py-3 text-sm font-bold text-slate-950 shadow-premium transition hover:bg-amber-400 active:scale-95 disabled:opacity-60"
                >
                  {busy ? <LoaderCircle size={16} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  <span>Guardar y activar</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-slate-950 px-4 py-3 sm:px-6 flex items-center justify-between text-[10px] font-bold">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck size={12} /> Cero telemetría de contenido
          </span>
          <span className="text-slate-500">Pago único · Sin suscripción</span>
        </div>
      </div>
    </div>
  );
}
