import { useEffect, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { getByokApiKey, getProSession, isLikelyGeminiApiKey, removeByokApiKey, saveByokApiKey, type ProSession } from '../../lib/pro-license';
import { GEMINI_MODEL, testGeminiApiKey } from '../../services/fundamentador-ai';
import { AccessibleDialog } from '../ui/AccessibleDialog';

interface ProAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Notifica un cambio de configuración, NO una activación de licencia. */
  onActivated?: () => void;
  featureName?: string;
}

export function ProAccessModal({ isOpen, onClose, onActivated, featureName }: ProAccessModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [storedKey, setStoredKey] = useState<string | null>(null);
  const [session, setSession] = useState<ProSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'test' | 'save' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const request = useRef<AbortController | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) {
        request.current?.abort();
        setBusy((value) => value === 'test' ? null : value);
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  useEffect(() => {
    const current = ++generation.current;
    if (isOpen) {
      setApiKey('');
      setError('');
      setStatus('');
      setBusy(null);
      setLoading(true);
      void Promise.all([getByokApiKey(), getProSession()]).then(([key, savedSession]) => {
        if (generation.current !== current) return;
        setStoredKey(key);
        setSession(savedSession);
        setLoading(false);
      });
    }
    return () => {
      generation.current++;
      request.current?.abort();
      request.current = null;
    };
  }, [isOpen]);

  const close = () => {
    generation.current++;
    request.current?.abort();
    setApiKey('');
    setStoredKey(null);
    onClose();
  };

  async function act(action: 'test' | 'save' | 'delete') {
    const key = apiKey.trim() || storedKey || '';
    if (action !== 'delete' && !isLikelyGeminiApiKey(key)) {
      setError('La clave no parece válida. Cópiala completa desde Google AI Studio.');
      return;
    }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = generation.current;
    setError('');
    setStatus('');
    setBusy(action);
    try {
      if (action === 'test') await testGeminiApiKey(key, { signal: controller.signal });
      if (action === 'save') await saveByokApiKey(key);
      if (action === 'delete') await removeByokApiKey();
      if (generation.current !== current || controller.signal.aborted) return;
      if (action === 'test') setStatus(`Conexión verificada con ${GEMINI_MODEL}. Esto no garantiza cuota futura ni exactitud jurídica.`);
      else {
        setStoredKey(action === 'save' ? key : null);
        setApiKey('');
        setStatus(action === 'save' ? 'Clave guardada. Guardarla no verifica la conexión ni activa una licencia.' : 'Clave eliminada. La licencia no se ha modificado.');
        onActivated?.();
      }
    } catch (err) {
      if (generation.current === current && !controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'No fue posible completar la operación.');
      }
    } finally {
      if (generation.current === current && request.current === controller) {
        request.current = null;
        setBusy(null);
      }
    }
  }

  return (
    <AccessibleDialog isOpen={isOpen} onClose={close} label="Configuración de IA y clave BYOK"
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/70 sm:items-center">
      <section className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-slate-700 bg-slate-900 text-white shadow-dialog sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="font-serif text-lg font-bold">Configuración de IA {featureName ? `· ${featureName}` : ''}</h2>
          <button type="button" onClick={close} aria-label="Cerrar configuración" className="min-h-11 min-w-11 p-3"><X size={18} /></button>
        </header>
        <div className="space-y-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm">
          <p>Conecta tu propia clave de Gemini (BYOK). Puedes probarla, guardarla, reemplazarla o eliminarla sin comprar ni activar una licencia.</p>
          <p>La clave, la consulta y los artículos recuperados se envían directamente a Google al usar IA. El fragmento adicional del documento solo se envía si lo autorizas en el fundamentador. La prueba envía únicamente la clave y un mensaje genérico, sin documentos.</p>
          <p>La clave se guarda en este navegador con <strong>ofuscación local, NO cifrado</strong>. Otros scripts o personas con acceso al dispositivo pueden recuperarla. Google aplica sus propias condiciones, cuotas y posibles cargos.</p>
          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-amber-300 underline">
            Obtener una clave en Google AI Studio <ExternalLink size={14} />
          </a>
          <p className="text-xs text-slate-300">Modelo: {GEMINI_MODEL} (alias actualizado por Google; puede cambiar de versión).</p>
          <p role="status">{loading ? 'Cargando configuración…' : storedKey ? 'Hay una clave guardada en este dispositivo.' : 'No hay una clave guardada.'}</p>
          <form onSubmit={(event) => { event.preventDefault(); void act('save'); }} className="space-y-3">
            <label htmlFor="pro-byok-key" className="block font-bold">{storedKey ? 'Nueva clave para reemplazar la guardada' : 'Tu API key de Gemini'}</label>
            <input id="pro-byok-key" type="password" autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
              value={apiKey} disabled={loading || !!busy} onChange={(event) => { setApiKey(event.target.value); setStatus(''); setError(''); }}
              className="w-full rounded-xl border border-slate-600 bg-slate-950 px-3 py-3 text-base" />
            {!online && <p role="status">Sin conexión. Puedes guardar o eliminar la clave; la prueba requiere Internet.</p>}
            {error && <p role="alert" className="text-red-300">{error}</p>}
            {status && <p role="status" className="text-emerald-300">{status}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={loading || !!busy || !online} onClick={() => void act('test')} className="min-h-11 rounded-xl border px-3 disabled:opacity-50">Probar conexión</button>
              <button type="submit" disabled={loading || !!busy} className="min-h-11 rounded-xl bg-amber-300 px-3 font-bold text-slate-950 disabled:opacity-50">{storedKey ? 'Guardar reemplazo' : 'Guardar clave'}</button>
              <button type="button" disabled={loading || !!busy || !storedKey} onClick={() => void act('delete')} className="min-h-11 rounded-xl border px-3 disabled:opacity-50">Eliminar clave</button>
              {busy === 'test' && <button type="button" onClick={() => { request.current?.abort(); setBusy(null); setStatus('Prueba cancelada.'); }} className="min-h-11 rounded-xl border px-3">Cancelar prueba</button>}
            </div>
          </form>
          <section className="rounded-xl border border-slate-700 p-3 text-xs text-slate-300">
            <h3 className="mb-1 font-bold">Licencia independiente de la IA</h3>
            <p>{session?.method === 'license' ? 'Se conserva tu sesión de licencia local heredada; no equivale a una compra verificada.' : session?.method === 'byok' ? 'Se conserva un registro BYOK heredado; no es una licencia de pago.' : 'No hay una licencia registrada.'}</p>
            <p>No hay verificación de compras disponible en esta edición. Una licencia por sí sola no proporciona una clave ni acceso a Gemini.</p>
          </section>
        </div>
      </section>
    </AccessibleDialog>
  );
}
