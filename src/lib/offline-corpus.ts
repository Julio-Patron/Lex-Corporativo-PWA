import { CORPUS_CATALOG } from './corpus-catalog';

export const CORPUS_ASSET_PATHS = [...new Set(CORPUS_CATALOG.map(item => `/corpus/${item.area}.json`))];
export const WASM_ASSET_PATH = '/wasm/sql-wasm.wasm';
export const OFFLINE_ASSET_PATHS = [...CORPUS_ASSET_PATHS, WASM_ASSET_PATH];
export const OFFLINE_CACHE_PREFIX = 'lex-offline-corpus-';
const MARKER_PATH = '/__lex_offline_corpus_complete__';
const SCHEMA = 1;

export interface OfflineCorpusManifest {
  version: string;
  assets: { path: string; sha256: string; bytes: number }[];
}
declare const __OFFLINE_CORPUS_MANIFEST__: OfflineCorpusManifest;
const buildManifest = typeof __OFFLINE_CORPUS_MANIFEST__ === 'undefined' ? null : __OFFLINE_CORPUS_MANIFEST__;

export interface OfflineCorpusStatus {
  phase: 'checking' | 'unavailable' | 'absent' | 'downloading' | 'ready' | 'error';
  completed: number;
  total: number;
  bytes: number;
  persisted: boolean;
  hasDownload: boolean;
  message: string;
}

// Each attempt owns its cache: cancellation/failure cannot delete a second tab's download.
export function createOfflineCorpusManager(manifest: OfflineCorpusManifest | null = buildManifest) {
  let status: OfflineCorpusStatus = {
    phase: 'checking', completed: 0, total: manifest?.assets.length ?? OFFLINE_ASSET_PATHS.length,
    bytes: manifest?.assets.reduce((sum, asset) => sum + asset.bytes, 0) ?? 0,
    persisted: false, hasDownload: false, message: '',
  };
  const listeners = new Set<() => void>();
  let controller: AbortController | undefined;
  let operation: Promise<void> | undefined;
  let removing = false;
  const supported = () => manifest !== null && typeof caches !== 'undefined' && typeof crypto?.subtle !== 'undefined';
  const prefix = `${OFFLINE_CACHE_PREFIX}v${SCHEMA}-${manifest?.version}-`;
  const update = (next: Partial<OfflineCorpusStatus>) => {
    status = { ...status, ...next };
    listeners.forEach(listener => listener());
  };
  const absolute = (path: string) => new URL(path, globalThis.location.origin).href;
  const names = async () => (await caches.keys()).filter(name => name.startsWith(OFFLINE_CACHE_PREFIX));

  async function readyCache() {
    if (!supported()) return undefined;
    for (const name of (await names()).filter(name => name.startsWith(prefix))) {
      const cache = await caches.open(name);
      const marker = await cache.match(absolute(MARKER_PATH));
      if (!marker) continue;
      try {
        const record = await marker.json();
        if (record.schema !== SCHEMA || record.version !== manifest!.version) continue;
        const entries = await Promise.all(manifest!.assets.map(asset => cache.match(absolute(asset.path))));
        if (entries.every(response => response?.ok)) return cache;
      } catch { /* An incomplete or evicted package is never ready. */ }
    }
    return undefined;
  }

  async function refresh() {
    if (operation || removing) return;
    if (!supported()) {
      update({ phase: 'unavailable', message: 'La descarga requiere un navegador compatible, HTTPS y la versión publicada de la app.' });
      return;
    }
    try {
      const ready = await readyCache();
      const hasDownload = (await names()).length > 0;
      let persisted = false;
      try { persisted = await navigator.storage?.persisted?.() ?? false; } catch { /* Optional API. */ }
      if (!operation && !removing) update({
        phase: ready ? 'ready' : 'absent', completed: ready ? status.total : 0,
        hasDownload, persisted, message: hasDownload && !ready ? 'Descarga incompleta o de otra versión. Descárgala de nuevo.' : '',
      });
    } catch {
      update({ phase: 'error', message: 'No se pudo acceder al almacenamiento local. Revisa los permisos y reintenta.' });
    }
  }

  function download(): Promise<void> {
    if (operation) return operation;
    if (removing) return Promise.resolve();
    if (!supported()) return refresh();
    controller = new AbortController();
    const signal = controller.signal;
    const attemptId = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const name = `${prefix}${attemptId}`;
    update({ phase: 'downloading', completed: 0, message: '' });
    // Request persistence directly in the user's click, before network work.
    const persistence = (async () => {
      try { return await navigator.storage?.persist?.() ?? false; } catch { return false; }
    })();
    operation = (async () => {
      try {
        if (manifest!.assets.length !== OFFLINE_ASSET_PATHS.length
          || new Set(manifest!.assets.map(asset => asset.path)).size !== OFFLINE_ASSET_PATHS.length
          || manifest!.assets.some(asset => !OFFLINE_ASSET_PATHS.includes(asset.path))) {
          throw new Error('El catálogo de descarga no es válido.');
        }
        const cache = await caches.open(name);
        for (const asset of manifest!.assets) {
          signal.throwIfAborted();
          const response = await fetch(absolute(asset.path), {
            signal, cache: 'no-store', credentials: 'omit', redirect: 'error', mode: 'same-origin',
          });
          if (!response.ok || response.type === 'opaque' || response.redirected) {
            throw new Error(`No se pudo descargar ${asset.path}.`);
          }
          const bytes = await response.arrayBuffer();
          signal.throwIfAborted();
          const digest = await crypto.subtle.digest('SHA-256', bytes);
          const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
          if (bytes.byteLength !== asset.bytes || hash !== asset.sha256) {
            throw new Error('La versión descargada no coincide con la app. Conéctate, recarga y reintenta.');
          }
          await cache.put(absolute(asset.path), new Response(bytes, {
            headers: { 'Content-Type': asset.path.endsWith('.wasm') ? 'application/wasm' : 'application/json' },
          }));
          update({ completed: status.completed + 1 });
        }
        signal.throwIfAborted();
        await cache.put(absolute(MARKER_PATH), new Response(JSON.stringify({ schema: SCHEMA, version: manifest!.version })));
        signal.throwIfAborted();
        if (!(await caches.keys()).includes(name) || !(await readyCache())) {
          throw new Error('La descarga fue eliminada o el navegador liberó espacio. Reintenta.');
        }
        const persisted = await persistence;
        signal.throwIfAborted();
        // Only obsolete versions are removed; another tab may be installing this version.
        try {
          await Promise.all((await names()).filter(key => !key.startsWith(prefix)).map(key => caches.delete(key)));
        } catch { /* Old-cache cleanup must not discard a verified new package. */ }
        signal.throwIfAborted();
        update({ phase: 'ready', hasDownload: true, persisted, message: '' });
      } catch (error) {
        try { await caches.delete(name); } catch { /* Never write a completion marker on failure. */ }
        update({
          phase: signal.aborted ? 'absent' : 'error', completed: 0,
          message: signal.aborted ? 'Descarga cancelada. Puedes reintentar.' : error instanceof Error ? error.message : 'No se pudo completar la descarga. Libera espacio y reintenta.',
        });
      } finally {
        controller = undefined;
        operation = undefined;
      }
    })();
    return operation;
  }

  async function remove() {
    if (removing) return;
    removing = true;
    controller?.abort();
    await operation;
    try {
      if (typeof caches !== 'undefined') await Promise.all((await names()).map(name => caches.delete(name)));
      update({ phase: 'absent', completed: 0, hasDownload: false, message: 'Descarga eliminada. Tus documentos no se han borrado.' });
    } catch {
      update({ phase: 'error', message: 'No se pudo eliminar la descarga. Reintenta.' });
    } finally { removing = false; }
  }

  async function read(path: string): Promise<Response | undefined> {
    if (!OFFLINE_ASSET_PATHS.includes(path)) throw new Error('Recurso fuera del catálogo offline.');
    try { return await (await readyCache())?.match(absolute(path)); }
    catch { return undefined; }
  }

  return {
    getSnapshot: () => status,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh, download, remove, read,
    cancel: () => controller?.abort(),
  };
}

export const offlineCorpus = createOfflineCorpusManager();
