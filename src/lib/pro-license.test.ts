import {
  activateWithLicenseCode,
  clearProAccess,
  getByokApiKey,
  getProSession,
  isLikelyGeminiApiKey,
  isLicenseCodeFormat,
  isProUnlocked,
  isValidLicenseCode,
  normalizeLicenseCode,
  obfuscateSecret,
  revealSecret,
  removeByokApiKey,
  saveByokApiKey,
} from './pro-license';
import { openDB } from 'idb';

async function storeLegacySession(method: 'license' | 'byok') {
  const db = await openDB('lex-corporativo-pro', 1);
  const session = { method, activatedAt: '2026-01-01T00:00:00.000Z' };
  await db.put('pro', JSON.stringify(session), 'pro-session');
  db.close();
  return session;
}

describe('pro-license', () => {
  beforeEach(async () => {
    await clearProAccess();
  });

  it('normaliza códigos de licencia', () => {
    expect(normalizeLicenseCode('  lex-pro-2026 ')).toBe('LEX-PRO-2026');
  });

  it('valida formato de códigos', () => {
    expect(isLicenseCodeFormat('LEX-PRO-2026')).toBe(true);
    expect(isLicenseCodeFormat('ab')).toBe(false);
  });

  it('no acepta códigos públicos como prueba de compra', () => {
    expect(isValidLicenseCode('LEX-PRO-2026')).toBe(false);
    expect(isValidLicenseCode('LEX-MOVIL-PRO')).toBe(false);
    expect(isValidLicenseCode('OTRA-COSA-123')).toBe(false);
  });

  it('valida formato de clave Gemini', () => {
    expect(isLikelyGeminiApiKey('AIzaSyDUMMYDUMMYDUMMYDUMMY12345')).toBe(true);
    expect(isLikelyGeminiApiKey('corta')).toBe(false);
    expect(isLikelyGeminiApiKey('con espacios no vale xxxxxxxxx')).toBe(false);
  });

  it('ofusca y revela secretos de forma reversible', () => {
    const secret = 'AIzaSyTEST-KEY_1234567890';
    const obfuscated = obfuscateSecret(secret);
    expect(obfuscated).not.toBe(secret);
    expect(revealSecret(obfuscated)).toBe(secret);
  });

  it('no activa licencias sin un verificador de compras', async () => {
    await expect(activateWithLicenseCode('lex-pro-2026')).rejects.toThrow(/verificación de compras/);
    expect(await isProUnlocked()).toBe(false);
    expect(await getProSession()).toBeNull();
  });

  it('rechaza licencias inválidas', async () => {
    await expect(activateWithLicenseCode('XXXX-INVALID-1')).rejects.toThrow();
    expect(await isProUnlocked()).toBe(false);
  });

  it('guarda y recupera la clave BYOK', async () => {
    const key = 'AIzaSyDUMMYDUMMYDUMMYDUMMY12345';
    await saveByokApiKey(key);
    expect(await getByokApiKey()).toBe(key);
    expect(await isProUnlocked()).toBe(false);
    expect(await getProSession()).toBeNull();
  });

  it('guardar, reemplazar y eliminar clave preserva la licencia heredada', async () => {
    const session = await storeLegacySession('license');
    await saveByokApiKey('test-key-placeholder-123456789');
    await saveByokApiKey('replacement-placeholder-987654321');
    expect(await getByokApiKey()).toBe('replacement-placeholder-987654321');
    expect(await getProSession()).toEqual(session);
    await removeByokApiKey();
    expect(await getByokApiKey()).toBeNull();
    expect(await getProSession()).toEqual(session);
    expect(await isProUnlocked()).toBe(true);
  });

  it('preserva registros BYOK heredados sin convertirlos en licencias pagadas', async () => {
    const session = await storeLegacySession('byok');
    await saveByokApiKey('test-key-placeholder-123456789');
    await removeByokApiKey();
    expect(await getProSession()).toEqual(session);
    expect(await isProUnlocked()).toBe(false);
  });

  it('no pierde clave ni licencia por un reemplazo inválido', async () => {
    const session = await storeLegacySession('license');
    await saveByokApiKey('test-key-placeholder-123456789');
    await expect(saveByokApiKey('short')).rejects.toThrow();
    expect(await getByokApiKey()).toBe('test-key-placeholder-123456789');
    expect(await getProSession()).toEqual(session);
  });

  it('rechaza claves BYOK con formato inválido', async () => {
    await expect(saveByokApiKey('corta')).rejects.toThrow();
  });

  it('limpia el acceso Pro', async () => {
    await saveByokApiKey('AIzaSyDUMMYDUMMYDUMMYDUMMY12345');
    await clearProAccess();
    expect(await isProUnlocked()).toBe(false);
    expect(await getByokApiKey()).toBeNull();
  });
});
