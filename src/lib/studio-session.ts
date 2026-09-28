import type { LegalArticle, LegalCitation, StudioDocument } from '../types';
import { studioStorage } from './studio-storage';

const EMPTY_TITLE = '';
const EMPTY_HTML = '<p>Comienza a redactar tu contrato, convenio o escrito aquí…</p>';
const PENDING_CITATION = 'lex_studio_pending_citation';

export function createStudioDocument(partial: Partial<StudioDocument> = {}): StudioDocument {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), title: EMPTY_TITLE, sourceKind: 'blank', editorHtml: EMPTY_HTML,
    citations: [], createdAt: now, updatedAt: now, ...partial };
}

export function isUntouchedStudioDocument(document: StudioDocument): boolean {
  const isTitleEmpty = !document.title || document.title === EMPTY_TITLE || document.title === 'Documento Jurídico sin Título';
  const isHtmlEmpty = !document.editorHtml || document.editorHtml === EMPTY_HTML || document.editorHtml === '<p></p>' || document.editorHtml.includes('Comienza a redactar tu contrato');
  return document.sourceKind === 'blank' && isTitleEmpty && isHtmlEmpty && document.citations.length === 0;
}

type Persistence = typeof studioStorage;
type PendingCitation = { read(): string | null; acknowledge(value: string): void };
export type StudioSessionStatus = 'loading' | 'empty' | 'saved' | 'pending' | 'saving' | 'error';
export interface StudioSessionSnapshot {
  document: StudioDocument;
  documents: StudioDocument[];
  initialized: boolean;
  transitioning: boolean;
  locked: boolean;
  status: StudioSessionStatus;
  error: string | null;
}

const browserPendingCitation: PendingCitation = {
  read: () => typeof sessionStorage === 'undefined' ? null : sessionStorage.getItem(PENDING_CITATION),
  acknowledge: (value) => {
    if (sessionStorage.getItem(PENDING_CITATION) === value) sessionStorage.removeItem(PENDING_CITATION);
  },
};

function errorMessage(error: unknown, action: string): string {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return 'No hay espacio suficiente para guardar. Descarga una copia del documento y libera espacio antes de reintentar.';
  }
  return `${action}. ${error instanceof Error ? error.message : 'Reintenta o descarga una copia para conservar tu trabajo.'}`;
}

function articleFromPending(value: string): LegalArticle {
  const article: unknown = JSON.parse(value);
  const fields = ['id', 'lawCode', 'lawName', 'articleNumber', 'title', 'content', 'sourceName', 'sourceUrl'];
  if (!article || typeof article !== 'object' || fields.some((key) => typeof Reflect.get(article, key) !== 'string')) {
    throw new Error('La cita pendiente no contiene los datos necesarios.');
  }
  return article as LegalArticle;
}

/** Document lifetime is independent of the editor. Writes and transitions share one queue. */
export function createStudioSession(storage: Persistence = studioStorage, pending: PendingCitation = browserPendingCitation, acquireWriter: () => Promise<boolean> = async () => true) {
  let snapshot: StudioSessionSnapshot = { document: createStudioDocument(), documents: [], initialized: false,
    transitioning: false, locked: false, status: 'loading', error: null };
  let revision = 0;
  let committedRevision = 0;
  let persisted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let initializing: Promise<boolean> | undefined;
  let queue: Promise<unknown> = Promise.resolve();
  let receipt: { value: string; articleId: string; documentId: string } | undefined;
  const listeners = new Set<() => void>();

  const publish = (partial: Partial<StudioSessionSnapshot>) => {
    snapshot = { ...snapshot, ...partial };
    listeners.forEach((listener) => listener());
  };
  const dirty = () => revision !== committedRevision;
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const exclusive = <T,>(work: () => Promise<T>): Promise<T> => {
    const result = queue.then(work, work);
    queue = result.catch(() => undefined);
    return result;
  };
  const schedule = () => {
    clearTimer();
    if (snapshot.initialized && dirty()) timer = setTimeout(() => { void flush(); }, 650);
  };
  const update = (change: (document: StudioDocument) => StudioDocument) => {
    if (snapshot.transitioning || snapshot.locked) return;
    const document = change(snapshot.document);
    if (document === snapshot.document) return;
    revision += 1;
    publish({ document: { ...document, updatedAt: new Date().toISOString() }, status: 'pending' });
    schedule();
  };

  const initialize = (): Promise<boolean> => {
    if (snapshot.initialized) return Promise.resolve(true);
    if (initializing) return initializing;
    const startRevision = revision;
    publish({ status: dirty() ? 'pending' : 'loading', error: null });
    initializing = (async () => {
      try {
        if (!await acquireWriter()) {
          publish({ locked: true });
          throw new Error('El Estudio está abierto en otra pestaña. Cierra esa pestaña y pulsa Reintentar para editar aquí.');
        }
        publish({ locked: false });
        const [allDocuments, lastOpened] = await Promise.all([storage.list(), storage.lastOpened()]);
        const documents = allDocuments.filter((document) => !isUntouchedStudioDocument(document));
        const restored = lastOpened === null ? undefined : documents.find((document) => document.id === lastOpened) ?? documents[0];
        if (revision === startRevision && revision === 0 && restored) {
          persisted = true;
          publish({ document: restored });
        }
        publish({ initialized: true, documents, status: dirty() ? 'pending' : persisted ? 'saved' : 'empty', error: null });
        schedule();
        return true;
      } catch (error) {
        publish({ status: 'error', error: errorMessage(error, 'No se pudieron recuperar los borradores locales') });
        return false;
      } finally { initializing = undefined; }
    })();
    return initializing;
  };

  async function commit(): Promise<boolean> {
    clearTimer();
    while (dirty()) {
      const document = snapshot.document;
      const savingRevision = revision;
      publish({ status: 'saving', error: null });
      try {
        await storage.save(document);
        committedRevision = savingRevision;
        persisted = true;
        const documents = [document, ...snapshot.documents.filter((item) => item.id !== document.id)]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        publish({ documents, status: dirty() ? 'pending' : 'saved' });
      } catch (error) {
        publish({ status: 'error', error: errorMessage(error, 'No se pudo guardar el borrador') });
        return false;
      }
    }
    if (receipt && receipt.documentId === snapshot.document.id && persisted &&
        snapshot.document.citations.some((citation) => citation.articleId === receipt?.articleId)) {
      try { pending.acknowledge(receipt.value); receipt = undefined; }
      catch (error) {
        publish({ error: errorMessage(error, 'El borrador está guardado, pero no se pudo confirmar la recepción de la cita') });
        return false;
      }
    }
    publish({ status: persisted ? 'saved' : 'empty', error: null });
    return true;
  }

  async function flush(): Promise<boolean> {
    if (!await initialize()) return false;
    return exclusive(commit);
  }

  async function replace(document: StudioDocument): Promise<boolean> {
    if (!await initialize()) return false;
    return exclusive(async () => {
      publish({ transitioning: true });
      try {
        if (!await commit()) return false;
        const existing = snapshot.documents.some((item) => item.id === document.id);
        await storage.remember(existing ? document.id : null);
        persisted = existing;
        revision = !existing && !isUntouchedStudioDocument(document) ? 1 : 0;
        committedRevision = 0;
        publish({ document, status: dirty() ? 'pending' : existing ? 'saved' : 'empty', error: null });
        schedule();
        return true;
      } catch (error) {
        publish({ error: errorMessage(error, 'No se pudo abrir el documento') });
        return false;
      } finally { publish({ transitioning: false }); }
    });
  }

  async function remove(id: string): Promise<boolean> {
    if (!await initialize()) return false;
    return exclusive(async () => {
      publish({ transitioning: true });
      const active = snapshot.document.id === id;
      if (active) clearTimer();
      try {
        await storage.remove(id);
        if (active) {
          revision = 0;
          committedRevision = 0;
          persisted = false;
          receipt = undefined;
        }
        publish({ documents: snapshot.documents.filter((document) => document.id !== id), error: null,
          ...(active ? { document: createStudioDocument(), status: 'empty' as const } : {}) });
        return true;
      } catch (error) {
        publish({ error: errorMessage(error, 'No se pudo eliminar el borrador') });
        return false;
      } finally { publish({ transitioning: false }); }
    });
  }

  function addCitation(article: LegalArticle) {
    update((document) => {
      if (document.citations.some((citation) => citation.articleId === article.id)) return document;
      const citation: LegalCitation = { id: crypto.randomUUID(), articleId: article.id, lawCode: article.lawCode,
        lawName: article.lawName, articleNumber: article.articleNumber, title: article.title, content: article.content,
        sourceName: article.sourceName, sourceUrl: article.sourceUrl, createdAt: new Date().toISOString() };
      return { ...document, citations: [...document.citations, citation] };
    });
  }

  async function receivePendingCitation(): Promise<boolean> {
    if (!await initialize()) return false;
    return exclusive(async () => {
      try {
        const value = pending.read();
        if (!value) return true;
        const article = articleFromPending(value);
        addCitation(article);
        receipt = { value, articleId: article.id, documentId: snapshot.document.id };
        return commit();
      } catch (error) {
        publish({ error: errorMessage(error, 'No se pudo recibir la cita desde Legislación') });
        return false;
      }
    });
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    initialize, update, replace, remove, addCitation, flush, receivePendingCitation,
    retry: async () => await receivePendingCitation() && await flush(),
    prepareToLeave: async () => !dirty() && !receipt || await receivePendingCitation() && await flush(),
    hasPendingChanges: dirty,
  };
}

export type StudioSession = ReturnType<typeof createStudioSession>;
let singleton: StudioSession | undefined;
let writerAcquired = false;
let writerRequest: Promise<boolean> | undefined;

function acquireBrowserWriter(): Promise<boolean> {
  if (writerAcquired) return Promise.resolve(true);
  if (writerRequest) return writerRequest;
  if (!navigator.locks) return Promise.reject(new Error('Este navegador no permite proteger la edición entre pestañas. Usa una versión actual de Chrome, Edge, Firefox o Safari.'));
  writerRequest = new Promise<boolean>((resolve, reject) => {
    void navigator.locks.request('lex-corporativo-estudio-writer', { ifAvailable: true }, async (lock) => {
      writerAcquired = Boolean(lock);
      resolve(writerAcquired);
      // A browser-owned lock is released automatically when this page closes.
      if (lock) await new Promise<void>(() => {});
    }).catch(reject);
  }).finally(() => { writerRequest = undefined; });
  return writerRequest;
}
export function getStudioSession(): StudioSession {
  if (!singleton) {
    singleton = createStudioSession(studioStorage, browserPendingCitation, acquireBrowserWriter);
    if (typeof window !== 'undefined') {
      const session = singleton;
      window.addEventListener('beforeunload', (event) => {
        if (!session.hasPendingChanges()) return;
        void session.flush();
        event.preventDefault();
        event.returnValue = '';
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && session.hasPendingChanges()) void session.flush();
      });
    }
  }
  return singleton;
}
