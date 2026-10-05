import { createHash, webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createOfflineCorpusManager, offlineCorpus, OFFLINE_ASSET_PATHS, OFFLINE_CACHE_PREFIX, WASM_ASSET_PATH, type OfflineCorpusManifest } from './offline-corpus';
import { createCorpusEngine } from '../services/sqlite-db';

const body = new TextEncoder().encode('verified fixture');
const manifest: OfflineCorpusManifest = {
  version: 'test-v1',
  assets: OFFLINE_ASSET_PATHS.map(path => ({
    path, bytes: body.byteLength, sha256: createHash('sha256').update(body).digest('hex'),
  })),
};
let stores: Map<string, Map<string, Response>>;
let network: ReturnType<typeof vi.fn>;
let persist: ReturnType<typeof vi.fn>;

beforeEach(() => {
  stores = new Map();
  vi.stubGlobal('crypto', webcrypto);
  vi.stubGlobal('caches', {
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name)!;
      return {
        match: async (key: string) => store.get(key)?.clone(),
        put: async (key: string, value: Response) => { store.set(key, value.clone()); },
      };
    },
  });
  network = vi.fn(async () => new Response(body));
  vi.stubGlobal('fetch', network);
  persist = vi.fn().mockResolvedValue(true);
  Object.defineProperty(navigator, 'storage', {
    configurable: true, value: { persist, persisted: vi.fn().mockResolvedValue(true) },
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('explicit offline corpus package', () => {
  it('never downloads during inspection and persists a complete package across fresh managers', async () => {
    const manager = createOfflineCorpusManager(manifest);
    await manager.refresh();
    expect(manager.getSnapshot().phase).toBe('absent');
    expect(network).not.toHaveBeenCalled();
    const phases: string[] = [];
    manager.subscribe(() => phases.push(manager.getSnapshot().phase));
    await manager.download();
    expect(persist).toHaveBeenCalledOnce();
    expect(network).toHaveBeenCalledTimes(6);
    expect(manager.getSnapshot()).toMatchObject({ phase: 'ready', completed: 6, persisted: true });
    expect(phases.slice(0, -1)).not.toContain('ready');
    for (const [url, options] of network.mock.calls as unknown as [string, RequestInit][]) {
      expect(new URL(url).origin).toBe(location.origin);
      expect(OFFLINE_ASSET_PATHS).toContain(new URL(url).pathname);
      expect(options).toMatchObject({ cache: 'no-store', credentials: 'omit', redirect: 'error', mode: 'same-origin' });
    }
    network.mockRejectedValue(new Error('offline'));
    const cold = createOfflineCorpusManager(manifest);
    await cold.refresh();
    expect(cold.getSnapshot().phase).toBe('ready');
    expect(await (await cold.read(WASM_ASSET_PATH))?.text()).toBe('verified fixture');
    for (const path of OFFLINE_ASSET_PATHS) expect(await cold.read(path)).toBeDefined();
    expect(network).toHaveBeenCalledTimes(6);
  });

  it.each(['http', 'network', 'hash', 'quota'])('cleans a failed %s attempt and retries from scratch', async failure => {
    network.mockImplementationOnce(async () => new Response(body));
    network.mockImplementationOnce(async () => {
      if (failure === 'http') return new Response('', { status: 503 });
      if (failure === 'hash') return new Response('wrong version');
      throw new DOMException(failure, failure === 'quota' ? 'QuotaExceededError' : 'NetworkError');
    });
    const manager = createOfflineCorpusManager(manifest);
    await manager.download();
    expect(manager.getSnapshot().phase).toBe('error');
    expect(stores.size).toBe(0);
    expect(await manager.read(WASM_ASSET_PATH)).toBeUndefined();
    network.mockImplementation(async () => new Response(body));
    await manager.download();
    expect(manager.getSnapshot().phase).toBe('ready');
  });

  it('deduplicates clicks and cancellation removes staging before a retry', async () => {
    let started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    network.mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      started();
      init.signal!.addEventListener('abort', () => reject(new DOMException('cancel', 'AbortError')));
    }));
    const manager = createOfflineCorpusManager(manifest);
    const first = manager.download();
    expect(manager.download()).toBe(first);
    await waiting;
    manager.cancel();
    await first;
    expect(manager.getSnapshot().phase).toBe('absent');
    expect(stores.size).toBe(0);
    await manager.download();
    expect(manager.getSnapshot().phase).toBe('ready');
  });

  it('cleans a CacheStorage quota failure without writing a completion marker', async () => {
    const originalOpen = caches.open.bind(caches);
    vi.spyOn(caches, 'open').mockImplementation(async name => {
      const cache = await originalOpen(name);
      return { ...cache, put: vi.fn().mockRejectedValue(new DOMException('Full', 'QuotaExceededError')) } as Cache;
    });
    const manager = createOfflineCorpusManager(manifest);
    await manager.download();
    expect(manager.getSnapshot().phase).toBe('error');
    expect(stores.size).toBe(0);
  });

  it('removal aborts a pending download and cannot later report it ready', async () => {
    let started!: () => void;
    const waiting = new Promise<void>(resolve => { started = resolve; });
    network.mockImplementationOnce((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      started();
      init.signal!.addEventListener('abort', () => reject(new DOMException('cancel', 'AbortError')));
    }));
    const manager = createOfflineCorpusManager(manifest);
    const downloading = manager.download();
    await waiting;
    await manager.remove();
    await downloading;
    expect(manager.getSnapshot()).toMatchObject({ phase: 'absent', hasDownload: false });
    expect(stores.size).toBe(0);
  });

  it('invalidates changed builds, missing assets, and uncommitted partial packages', async () => {
    const manager = createOfflineCorpusManager(manifest);
    await manager.download();
    const nextVersion = createOfflineCorpusManager({ ...manifest, version: 'test-v2' });
    await nextVersion.refresh();
    expect(nextVersion.getSnapshot()).toMatchObject({ phase: 'absent', hasDownload: true });
    expect(await nextVersion.read(WASM_ASSET_PATH)).toBeUndefined();
    const store = [...stores.values()][0];
    store.delete(new URL(WASM_ASSET_PATH, location.origin).href);
    await manager.refresh();
    expect(manager.getSnapshot().phase).toBe('absent');
    expect(await manager.read(OFFLINE_ASSET_PATHS[0])).toBeUndefined();
    await nextVersion.download();
    expect(stores.size).toBe(1);
    expect([...stores.keys()][0]).toContain('test-v2');
    const current = [...stores.values()][0];
    for (const key of current.keys()) if (key.includes('__lex_offline')) current.delete(key);
    await nextVersion.refresh();
    expect(nextVersion.getSnapshot().phase).toBe('absent');
  });

  it('rejects non-allowlisted manifests and reads without contacting external services', async () => {
    const manager = createOfflineCorpusManager({ ...manifest, assets: [...manifest.assets.slice(1), {
      ...manifest.assets[0], path: 'https://googleapis.com/secret',
    }] });
    await manager.download();
    expect(manager.getSnapshot().phase).toBe('error');
    expect(network).not.toHaveBeenCalled();
    await expect(manager.read('/api/secrets')).rejects.toThrow('fuera del catálogo');
  });

  it('removes only corpus caches, preserving shell and document stores', async () => {
    const manager = createOfflineCorpusManager(manifest);
    stores.set('workbox-precache-shell', new Map());
    stores.set('documents', new Map());
    await manager.download();
    await manager.remove();
    expect([...stores.keys()]).toEqual(['workbox-precache-shell', 'documents']);
    expect(manager.getSnapshot()).toMatchObject({ phase: 'absent', hasDownload: false });
    expect(await manager.read(WASM_ASSET_PATH)).toBeUndefined();
  });

  it('does not let a cancelled tab delete another tab’s successful package', async () => {
    const first = createOfflineCorpusManager(manifest);
    await first.download();
    network.mockRejectedValueOnce(new Error('failed second tab'));
    const second = createOfflineCorpusManager(manifest);
    await second.download();
    await first.refresh();
    expect(first.getSnapshot().phase).toBe('ready');
    expect([...stores.keys()].filter(key => key.startsWith(OFFLINE_CACHE_PREFIX))).toHaveLength(1);
  });

  it('handles unsupported storage and denied persistence without promising durability', async () => {
    persist.mockRejectedValue(new Error('denied'));
    const manager = createOfflineCorpusManager(manifest);
    await manager.download();
    expect(manager.getSnapshot()).toMatchObject({ phase: 'ready', persisted: false });
    vi.stubGlobal('caches', undefined);
    await manager.refresh();
    expect(manager.getSnapshot().phase).toBe('unavailable');
  });

  it('cold-starts real SQLite/WASM and searches the full real corpus from CacheStorage with network disabled', async () => {
    const contents = new Map(OFFLINE_ASSET_PATHS.map(path => [path, readFileSync(`public${path}`)]));
    const realManifest = {
      version: 'real-fixture',
      assets: OFFLINE_ASSET_PATHS.map(path => ({
        path, bytes: contents.get(path)!.byteLength,
        sha256: createHash('sha256').update(contents.get(path)!).digest('hex'),
      })),
    };
    network.mockImplementation(async (url: string) => new Response(new Uint8Array(contents.get(new URL(url).pathname)!)));
    await createOfflineCorpusManager(realManifest).download();
    const cold = createOfflineCorpusManager(realManifest);
    vi.spyOn(offlineCorpus, 'read').mockImplementation(cold.read);
    network.mockClear().mockRejectedValue(new Error('No network or HTTP cache'));
    const actualSqlJs = await vi.importActual<typeof import('sql.js')>('sql.js');
    const engine = createCorpusEngine({ initialize: actualSqlJs.default });
    const results = await engine.search({ area: 'laboral', lawCode: 'LFT', searchTerms: 'rescisión', candidateArticleNumber: '47' });
    expect(results[0].lawCode).toBe('LFT');
    expect(results[0].articleNumber).toMatch(/47/);
    const db = await engine.database('todos');
    expect(db.exec('SELECT COUNT(*) FROM provisions')[0].values[0][0]).toBeGreaterThan(5000);
    db.close();
    expect(network).not.toHaveBeenCalled();
  });
});
