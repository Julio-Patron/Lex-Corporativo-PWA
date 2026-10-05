import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type ProAccessMethod = 'license' | 'byok';

export interface ProSession {
  method: ProAccessMethod;
  /** Clave de licencia ofuscada (nunca en claro tras activación). */
  licenseFingerprint?: string;
  activatedAt: string;
}

interface ProDatabase extends DBSchema {
  pro: { key: string; value: string };
}

const DB_NAME = 'lex-corporativo-pro';
const DB_VERSION = 1;
const LICENSE_KEY = 'license-code';
const BYOK_KEY = 'byok-api-key';
const SESSION_KEY = 'pro-session';

/** Códigos de licencia válidos de la edición Pro Móvil (pago único vía web). */
const VALID_LICENSE_CODES = new Set(['LEX-PRO-2026', 'LEX-MOVIL-PRO']);

function hasStorage(): boolean {
  return typeof indexedDB !== 'undefined';
}

async function database(): Promise<IDBPDatabase<ProDatabase>> {
  if (!hasStorage()) {
    throw new Error('El almacenamiento local no está disponible en este dispositivo.');
  }
  return openDB<ProDatabase>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pro')) db.createObjectStore('pro');
    },
  });
}

async function idbGet(key: string): Promise<string | undefined> {
  const db = await database();
  try { return await db.get('pro', key); } finally { db.close(); }
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await database();
  try { await db.put('pro', value, key); } finally { db.close(); }
}

async function idbDelete(key: string): Promise<void> {
  const db = await database();
  try { await db.delete('pro', key); } finally { db.close(); }
}

/** Ofuscación simétrica ligera (XOR + base64) para no guardar secretos en claro. */
export function obfuscateSecret(value: string): string {
  const salt = 'lex-corporativo-pwa';
  const xored = Array.from(value).map((ch, i) =>
    String.fromCharCode(ch.charCodeAt(0) ^ salt.charCodeAt(i % salt.length)),
  ).join('');
  try {
    return btoa(unescape(encodeURIComponent(xored)));
  } catch {
    return value.split('').reverse().join('');
  }
}

export function revealSecret(obfuscated: string): string {
  const salt = 'lex-corporativo-pwa';
  try {
    const decoded = decodeURIComponent(escape(atob(obfuscated)));
    return Array.from(decoded).map((ch, i) =>
      String.fromCharCode(ch.charCodeAt(0) ^ salt.charCodeAt(i % salt.length)),
    ).join('');
  } catch {
    return obfuscated.split('').reverse().join('');
  }
}

export function normalizeLicenseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isLicenseCodeFormat(raw: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{5,31}$/.test(normalizeLicenseCode(raw));
}

export function isValidLicenseCode(raw: string): boolean {
  return VALID_LICENSE_CODES.has(normalizeLicenseCode(raw));
}

export function isLikelyGeminiApiKey(raw: string): boolean {
  const key = raw.trim();
  return key.length >= 20 && /^[A-Za-z0-9_-]+$/.test(key);
}

async function persistSession(session: ProSession): Promise<void> {
  await idbSet(SESSION_KEY, JSON.stringify(session));
}

export async function activateWithLicenseCode(rawCode: string): Promise<ProSession> {
  const code = normalizeLicenseCode(rawCode);
  if (!isLicenseCodeFormat(code)) {
    throw new Error('El código debe tener entre 6 y 32 caracteres alfanuméricos.');
  }
  if (!isValidLicenseCode(code)) {
    throw new Error('Código de licencia no reconocido. Verifica tu comprobante de compra.');
  }
  await idbSet(LICENSE_KEY, obfuscateSecret(code));
  const session: ProSession = { method: 'license', activatedAt: new Date().toISOString() };
  await persistSession(session);
  return session;
}

/** Guarda la clave BYOK del usuario localmente (nunca sale del dispositivo salvo a la API de Google). */
export async function saveByokApiKey(rawKey: string): Promise<ProSession> {
  const key = rawKey.trim();
  if (!isLikelyGeminiApiKey(key)) {
    throw new Error('La clave no parece válida. Debe ser la API key de Google AI Studio.');
  }
  await idbSet(BYOK_KEY, obfuscateSecret(key));
  const session: ProSession = { method: 'byok', activatedAt: new Date().toISOString() };
  await persistSession(session);
  return session;
}

export async function getByokApiKey(): Promise<string | null> {
  if (!hasStorage()) return null;
  try {
    const stored = await idbGet(BYOK_KEY);
    return stored ? revealSecret(stored) : null;
  } catch {
    return null;
  }
}

export async function getProSession(): Promise<ProSession | null> {
  if (!hasStorage()) return null;
  try {
    const raw = await idbGet(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ProSession;
    return parsed && (parsed.method === 'license' || parsed.method === 'byok') ? parsed : null;
  } catch {
    return null;
  }
}

export async function isProUnlocked(): Promise<boolean> {
  return (await getProSession()) !== null;
}

export async function clearProAccess(): Promise<void> {
  if (!hasStorage()) return;
  try {
    await Promise.all([idbDelete(LICENSE_KEY), idbDelete(BYOK_KEY), idbDelete(SESSION_KEY)]);
  } catch { /* noop */ }
}
