import { useEffect, useSyncExternalStore } from 'react';
import { offlineCorpus } from '../lib/offline-corpus';

/** Inline panel: the containing settings dialog owns focus and dismissal. */
export function OfflineCorpusSettings() {
  const status = useSyncExternalStore(offlineCorpus.subscribe, offlineCorpus.getSnapshot);
  useEffect(() => {
    void offlineCorpus.refresh();
    const refresh = () => { void offlineCorpus.refresh(); };
    window.addEventListener('focus', refresh);
    return () => { window.removeEventListener('focus', refresh); };
  }, []);
  const downloading = status.phase === 'downloading';
  return (
    <section aria-label="Corpus sin conexión" className="space-y-3 rounded-2xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900">Corpus sin conexión</h3>
      <p className="text-sm text-slate-600">
        Descarga las cinco áreas del corpus y el motor SQLite/WASM
        {status.bytes > 0 ? ` (${(status.bytes / 1024 / 1024).toFixed(1)} MB)` : ''} para consultar y fundamentar sin conexión.
        La IA de Google y las búsquedas en vivo siguen necesitando internet.
      </p>
      <p role="status" aria-live="polite" className="text-sm text-slate-700">
        {status.phase === 'ready' ? 'Corpus y motor completos: disponibles sin conexión.' :
          downloading ? `Descargando ${status.completed} de ${status.total} archivos…` :
            status.phase === 'checking' ? 'Comprobando descarga…' :
              status.message || 'Corpus no descargado. La app ligera sigue disponible.'}
      </p>
      {downloading && <progress aria-label="Progreso de descarga" max={status.total} value={status.completed} className="w-full" />}
      <p className="text-xs text-slate-500">
        {status.persisted ? 'Almacenamiento persistente concedido.' : 'Al descargar solicitaremos almacenamiento persistente; el navegador puede no concederlo.'}
        {' '}El navegador o el usuario pueden borrar los datos. Comprueba este estado antes de salir sin conexión.
        Una actualización del corpus o del motor puede requerir otra descarga. No se guardan claves, consultas ni documentos en esta descarga.
      </p>
      <div className="flex flex-wrap gap-2">
        {downloading ? (
          <button type="button" onClick={offlineCorpus.cancel} className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold active:scale-95">
            Cancelar descarga
          </button>
        ) : status.phase !== 'ready' && (
          <button type="button" disabled={status.phase === 'checking' || status.phase === 'unavailable'}
            onClick={() => { void offlineCorpus.download(); }}
            className="min-h-11 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white active:scale-95 disabled:opacity-50">
            {status.phase === 'error' ? 'Reintentar descarga' : 'Descargar corpus y motor'}
          </button>
        )}
        {(status.hasDownload || status.phase === 'ready') && !downloading && (
          <button type="button" onClick={() => { void offlineCorpus.remove(); }}
            className="min-h-11 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold active:scale-95">
            Eliminar descarga
          </button>
        )}
      </div>
    </section>
  );
}
