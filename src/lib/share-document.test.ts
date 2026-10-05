import { afterEach, describe, expect, it, vi } from 'vitest';
import { shareDocumentCopy } from './share-document';
import { downloadTextCopy } from './document-import';

vi.mock('./document-import', () => ({ downloadTextCopy: vi.fn() }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('shareDocumentCopy', () => {
  it('comparte un archivo TXT con fuentes cuando el dispositivo admite archivos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share, canShare: () => true });
    expect(await shareDocumentCopy('Contrato', 'Cláusula\nFUENTES: LFT')).toBe('shared');
    const file = share.mock.calls[0][0].files[0] as File;
    expect(file.name).toBe('Contrato.txt');
    expect(file.type).toBe('text/plain;charset=utf-8');
  });

  it('comparte texto aunque canShare no esté disponible', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    await shareDocumentCopy('Contrato', 'Texto');
    expect(share).toHaveBeenCalledWith({ title: 'Contrato', text: 'Contrato\n\nTexto' });
  });

  it('no copia ni descarga cuando el usuario cancela', async () => {
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError')), clipboard: { writeText } });
    expect(await shareDocumentCopy('Contrato', 'Texto')).toBe('cancelled');
    expect(writeText).not.toHaveBeenCalled();
    expect(downloadTextCopy).not.toHaveBeenCalled();
  });

  it('copia si no se admite compartir', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    expect(await shareDocumentCopy('Contrato', 'Texto')).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('Contrato\n\nTexto');
  });

  it('descarga si compartir y portapapeles fallan', async () => {
    vi.stubGlobal('navigator', {
      share: vi.fn().mockRejectedValue(new Error('Denegado')),
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error('Denegado')) },
    });
    expect(await shareDocumentCopy('Contrato/1', 'Texto')).toBe('downloaded');
    expect(downloadTextCopy).toHaveBeenCalledWith('Contrato/1\n\nTexto', 'Contrato-1.txt');
  });
});
