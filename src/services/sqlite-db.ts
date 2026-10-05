import initSqlJs, { type Database } from 'sql.js';
import { getCorpusItem } from '../lib/corpus-catalog';
import { offlineCorpus, WASM_ASSET_PATH } from '../lib/offline-corpus';
import type { CorpusSearchScope, LegalArticle, LegalEngineeringArea } from '../types';

const CORPUS_FILES: Array<{ file: string; area: LegalEngineeringArea }> = [
  { file: '/corpus/laboral.json', area: 'laboral' },
  { file: '/corpus/mercantil.json', area: 'mercantil' },
  { file: '/corpus/fiscal.json', area: 'fiscal' },
  { file: '/corpus/aduanal.json', area: 'aduanal' },
  { file: '/corpus/comercio_exterior.json', area: 'comercio_exterior' },
];
type RawLegalArticle = Omit<LegalArticle, 'sourceKind' | 'sourceName' | 'sourceUrl'>;
const SEARCH_STOP_WORDS = new Set([
  'art', 'articulo', 'cual', 'cuales', 'como', 'con', 'del', 'desde', 'donde', 'esta',
  'este', 'estos', 'las', 'los', 'para', 'por', 'que', 'segun', 'sin', 'son', 'sus', 'una',
]);
function normalizeText(value: string): string {
  return value.toLocaleLowerCase('es-MX').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
function prepareArticle(content: string, title: string, articleNumber: string) {
  return {
    title: normalizeText(title),
    body: normalizeText(`${title} ${content}`),
    article: normalizeText(articleNumber).match(/\d+(?:\s+(?:bis|ter|quater))?/)?.[0] ?? '',
  };
}
function prepareQuery(query: string, targetArticle: string) {
  return { query, targetArticle, terms: query.split(' ').filter(term => term.length > 2 && !SEARCH_STOP_WORDS.has(term)) };
}
function scorePrepared(article: ReturnType<typeof prepareArticle>, query: ReturnType<typeof prepareQuery>): number {
  let score = 0;
  if (query.targetArticle && article.article === query.targetArticle) score += 250;
  if (query.terms.length && query.query && article.body.includes(query.query)) score += 80;
  for (const term of query.terms) {
    if (article.title.includes(term)) score += 22;
    if (article.body.includes(term)) score += 10;
  }
  return score;
}
export function calculateLegalScore(content: string, title: string, articleNumber: string, normalizedQuery: string, targetArticle: string): number {
  return scorePrepared(prepareArticle(content, title, articleNumber), prepareQuery(normalizedQuery, targetArticle));
}
function toLegalArticle(row: Record<string, unknown>): LegalArticle {
  const lawCode = row.law_code as string;
  const source = getCorpusItem(lawCode);
  return {
    id: row.id as string, lawCode, lawName: row.law_name as string,
    articleNumber: row.article_number as string, title: row.title as string,
    content: row.content as string, area: row.area as LegalEngineeringArea,
    sourceKind: source.sourceKind, sourceName: source.sourceName, sourceUrl: source.sourceUrl,
    score: row.rank as number,
  };
}
export interface SearchParams {
  searchTerms: string;
  candidateArticleNumber?: string;
  limit?: number;
}
export type ScopedSearchParams = SearchParams & { lawCode?: string; area?: CorpusSearchScope };

// A worker owns one engine. The factory also permits integration tests with real WASM.
export function createCorpusEngine(options: { initialize?: typeof initSqlJs; fetchCorpus?: typeof fetch } = {}) {
  let initPromise: Promise<Database> | undefined;
  const areas = new Map<LegalEngineeringArea, Promise<void>>();
  const prepared = new Map<string, ReturnType<typeof prepareArticle>>();
  let activeQuery = prepareQuery('', '');
  let scores = new Map<string, number>();

  function initialize(): Promise<Database> {
    if (!initPromise) {
      initPromise = (async () => {
        const cachedWasm = await offlineCorpus.read(WASM_ASSET_PATH);
        const SQL = await (options.initialize ?? initSqlJs)({
          locateFile: () => WASM_ASSET_PATH,
          ...(cachedWasm ? { wasmBinary: await cachedWasm.arrayBuffer() } : {}),
        });
        const db = new SQL.Database();
        try {
          db.run(`CREATE TABLE provisions (
            id TEXT PRIMARY KEY, law_code TEXT NOT NULL, law_name TEXT NOT NULL,
            article_number TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL, area TEXT NOT NULL
          );
          CREATE INDEX idx_provisions_law ON provisions(law_code);
          CREATE INDEX idx_provisions_area ON provisions(area);`);
          db.create_function('prepared_legal_score', (id: string) => {
            const cached = scores.get(id);
            if (cached !== undefined) return cached;
            const article = prepared.get(id);
            const score = article ? scorePrepared(article, activeQuery) : 0;
            scores.set(id, score);
            return score;
          });
          return db;
        } catch (error) { db.close(); throw error; }
      })().catch(error => { initPromise = undefined; throw error; });
    }
    return initPromise;
  }

  function loadArea(item: typeof CORPUS_FILES[number], db: Database): Promise<void> {
    const existing = areas.get(item.area);
    if (existing) return existing;
    const loading = (async () => {
      const response = options.fetchCorpus ? await options.fetchCorpus(item.file)
        : await offlineCorpus.read(item.file) ?? await fetch(item.file);
      if (!response.ok) throw new Error(`No se pudo cargar ${item.file} (${response.status}). Reintenta la búsqueda.`);
      const articles = await response.json() as RawLegalArticle[];
      const nextPrepared = new Map<string, ReturnType<typeof prepareArticle>>();
      // No awaits inside this transaction: simultaneous area downloads cannot interleave writes.
      db.run('BEGIN TRANSACTION');
      try {
        const statement = db.prepare(`INSERT INTO provisions
          (id, law_code, law_name, article_number, title, content, area)
          VALUES ($id, $law_code, $law_name, $article_number, $title, $content, $area)`);
        try {
          for (const article of articles) {
            nextPrepared.set(article.id, prepareArticle(article.content, article.title, article.articleNumber));
            statement.run({
              $id: article.id, $law_code: article.lawCode, $law_name: article.lawName,
              $article_number: article.articleNumber, $title: article.title, $content: article.content,
              $area: article.area || item.area,
            });
          }
        } finally { statement.free(); }
        db.run('COMMIT');
        for (const [id, article] of nextPrepared) prepared.set(id, article);
      } catch (error) { db.run('ROLLBACK'); throw error; }
    })().catch(error => { areas.delete(item.area); throw error; });
    areas.set(item.area, loading);
    return loading;
  }

  async function database(scope: CorpusSearchScope = 'todos'): Promise<Database> {
    const db = await initialize();
    await Promise.all(CORPUS_FILES.filter(item => scope === 'todos' || item.area === scope).map(item => loadArea(item, db)));
    return db;
  }

  async function search(params: ScopedSearchParams): Promise<LegalArticle[]> {
    const scope = params.lawCode ? getCorpusItem(params.lawCode).area : params.area ?? 'todos';
    const db = await database(scope);
    // Query execution is synchronous within the worker, so this closure is never shared by overlapping queries.
    activeQuery = prepareQuery(normalizeText(params.searchTerms), normalizeText(params.candidateArticleNumber ?? ''));
    scores = new Map();
    const filters: string[] = [];
    if (params.lawCode) filters.push('law_code = :lawCode');
    if (params.area && params.area !== 'todos') filters.push('area = :area');
    const statement = db.prepare(`SELECT * FROM (
      SELECT id, law_code, law_name, article_number, title, content, area, prepared_legal_score(id) AS rank
      FROM provisions ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}
    ) WHERE rank > 0 ORDER BY rank DESC, law_code ASC, article_number ASC LIMIT :limit`);
    const bindings: Record<string, string | number> = { ':limit': params.limit ?? 20 };
    if (params.lawCode) bindings[':lawCode'] = params.lawCode;
    if (params.area && params.area !== 'todos') bindings[':area'] = params.area;
    const results: LegalArticle[] = [];
    try {
      statement.bind(bindings);
      while (statement.step()) results.push(toLegalArticle(statement.getAsObject()));
    } finally { statement.free(); scores.clear(); }
    return results;
  }
  return { database, search };
}
const engine = createCorpusEngine();
export const getSqliteDb = engine.database;
export function searchInSingleLaw(params: SearchParams & { targetLawCode: string }): Promise<LegalArticle[]> {
  return engine.search({ ...params, lawCode: params.targetLawCode });
}
export function searchInAreaLaws(params: SearchParams & { area: CorpusSearchScope }): Promise<LegalArticle[]> {
  return engine.search(params);
}
