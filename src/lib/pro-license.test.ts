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
  saveByokApiKey,
} from './pro-license';

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

  it('reconoce códigos vigentes', () => {
    expect(isValidLicenseCode('LEX-PRO-2026')).toBe(true);
    expect(isValidLicenseCode('LEX-MOVIL-PRO')).toBe(true);
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

  it('activa sesión Pro con licencia válida', async () => {
    const session = await activateWithLicenseCode('lex-pro-2026');
    expect(session.method).toBe('license');
    expect(await isProUnlocked()).toBe(true);
    expect((await getProSession())?.method).toBe('license');
  });

  it('rechaza licencias inválidas', async () => {
    await expect(activateWithLicenseCode('XXXX-INVALID-1')).rejects.toThrow();
    expect(await isProUnlocked()).toBe(false);
  });

  it('guarda y recupera la clave BYOK', async () => {
    const key = 'AIzaSyDUMMYDUMMYDUMMYDUMMY12345';
    const session = await saveByokApiKey(key);
    expect(session.method).toBe('byok');
    expect(await getByokApiKey()).toBe(key);
    expect(await isProUnlocked()).toBe(true);
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
