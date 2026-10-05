import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FundamentadorAiDrawer } from './FundamentadorAiDrawer';
import { getByokApiKey } from '../../lib/pro-license';
import { runFundamentadorAi, type FundamentadorAiResponse } from '../../services/fundamentador-ai';
import type { LegalArticle } from '../../types';

vi.mock('../../lib/pro-license', () => ({ getByokApiKey: vi.fn() }));
vi.mock('../../services/fundamentador-ai', async (original) => ({
  ...await original<typeof import('../../services/fundamentador-ai')>(),
  runFundamentadorAi: vi.fn(),
}));

const article: LegalArticle = {
  id: 'lft-47', lawCode: 'LFT', lawName: 'Ley Federal del Trabajo', articleNumber: 'Artículo 47',
  title: 'Rescisión', content: 'Texto recuperado', area: 'laboral', sourceKind: 'ley',
  sourceName: 'Cámara de Diputados', sourceUrl: 'https://www.diputados.gob.mx/LeyesBiblio/pdf/LFT.pdf',
};
const result: FundamentadorAiResponse = {
  analysis: 'Análisis [LFT Art. 47]', model: 'test-model', executionTimeMs: 1,
  ragArticles: [article], citationValidation: { valid: true, invalidCitations: [] },
};
const props = () => ({
  isOpen: true, onClose: vi.fn(), onConfigureKey: vi.fn(), initialQuery: 'Texto seleccionado',
  documentContext: 'DOCUMENTO PRIVADO', citations: [],
  onInsertFootnote: vi.fn(), onInsertBlockquote: vi.fn(), onAddCitation: vi.fn(), onInsertAnalysis: vi.fn(),
});

describe('FundamentadorAiDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getByokApiKey).mockResolvedValue('test-placeholder-key');
    vi.mocked(runFundamentadorAi).mockResolvedValue(result);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  async function ready(overrides = {}) {
    const callbacks = { ...props(), ...overrides };
    const rendered = render(<FundamentadorAiDrawer {...callbacks} />);
    await waitFor(() => expect(getByokApiKey).toHaveBeenCalled());
    return { ...rendered, callbacks };
  }
  const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Enviar consulta a Gemini' }));

  it('preserves selected text and defaults to no extra document disclosure', async () => {
    await ready();
    expect(screen.getByLabelText('Consulta para fundamentar')).toHaveValue('Texto seleccionado');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    submit();
    await screen.findByText(result.analysis);
    expect(runFundamentadorAi).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'Texto seleccionado', includeDocumentContext: false, signal: expect.any(AbortSignal),
    }));
    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    await waitFor(() => expect(runFundamentadorAi).toHaveBeenLastCalledWith(expect.objectContaining({
      includeDocumentContext: true,
    })));
  });

  it('inserts only analysis with references matching retrieved sources and labels source honestly', async () => {
    const { callbacks } = await ready();
    submit();
    await screen.findByText(result.analysis);
    fireEvent.click(screen.getByRole('button', { name: /Insertar en el documento/ }));
    expect(callbacks.onInsertAnalysis).toHaveBeenCalledWith(result.analysis);
    expect(screen.getByRole('link', { name: 'Cámara de Diputados' })).toHaveAttribute('href', article.sourceUrl);
    expect(screen.getByText(/Esto NO verifica/)).toBeInTheDocument();
  });

  it.each(['Sin citas', 'Inventada [LFT Art. 999]', 'Parcial [LFT Art. 47] [CFF Art. 47]'])('blocks unsafe insertion even if provider reports valid: %s', async (analysis) => {
    vi.mocked(runFundamentadorAi).mockResolvedValue({ ...result, analysis });
    const { callbacks } = await ready();
    submit();
    await screen.findByText(analysis);
    expect(screen.getByRole('button', { name: /Insertar en el documento/ })).toBeDisabled();
    expect(callbacks.onInsertAnalysis).not.toHaveBeenCalled();
    expect(screen.getByText(/Inserción bloqueada/)).toBeInTheDocument();
  });

  it('allows configuration with no key and retains the typed query across hide/reopen', async () => {
    vi.mocked(getByokApiKey).mockResolvedValue(null);
    const { callbacks, rerender } = await ready();
    expect(await screen.findByText(/No hay una clave BYOK guardada/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Consulta para fundamentar'), { target: { value: 'Mi consulta editada' } });
    fireEvent.click(screen.getByRole('button', { name: 'Configurar clave BYOK' }));
    expect(callbacks.onConfigureKey).toHaveBeenCalledOnce();
    rerender(<FundamentadorAiDrawer {...callbacks} isOpen={false} />);
    rerender(<FundamentadorAiDrawer {...callbacks} />);
    expect(screen.getByLabelText('Consulta para fundamentar')).toHaveValue('Mi consulta editada');
  });

  it.each(['cancel', 'escape', 'unmount', 'settings', 'hide'])('aborts on %s and ignores a late response', async (action) => {
    let resolve!: (value: FundamentadorAiResponse) => void;
    vi.mocked(runFundamentadorAi).mockReturnValue(new Promise((done) => { resolve = done; }));
    const { callbacks, unmount, rerender } = await ready();
    submit();
    const signal = vi.mocked(runFundamentadorAi).mock.calls[0][0].signal!;
    if (action === 'cancel') fireEvent.click(screen.getByRole('button', { name: 'Cancelar consulta' }));
    if (action === 'escape') fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    if (action === 'unmount') unmount();
    if (action === 'settings') fireEvent.click(screen.getByRole('button', { name: 'Configurar clave BYOK' }));
    if (action === 'hide') rerender(<FundamentadorAiDrawer {...callbacks} isOpen={false} />);
    expect(signal.aborted).toBe(true);
    await act(async () => resolve(result));
    expect(screen.queryByText(result.analysis)).not.toBeInTheDocument();
    expect(callbacks.onInsertAnalysis).not.toHaveBeenCalled();
  });

  it('aborts on offline, permits settings and offers retry after reconnection', async () => {
    vi.mocked(runFundamentadorAi).mockReturnValueOnce(new Promise(() => {}));
    await ready();
    submit();
    const signal = vi.mocked(runFundamentadorAi).mock.calls[0][0].signal!;
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(signal.aborted).toBe(true);
    expect(screen.getByRole('button', { name: 'Enviar consulta a Gemini' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Configurar clave BYOK' })).toBeEnabled();
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.getByRole('button', { name: 'Enviar consulta a Gemini' })).toBeEnabled();
    submit();
    await screen.findByText(result.analysis);
  });

  it('shows a failed request without clearing the selected query', async () => {
    vi.mocked(runFundamentadorAi).mockRejectedValueOnce(new Error('Cuota agotada'));
    await ready();
    submit();
    expect(await screen.findByRole('alert')).toHaveTextContent('Cuota agotada');
    expect(screen.getByLabelText('Consulta para fundamentar')).toHaveValue('Texto seleccionado');
    expect(screen.getByRole('button', { name: 'Enviar consulta a Gemini' })).toBeEnabled();
  });

  it('cancels stale analysis if a new selected query arrives', async () => {
    vi.mocked(runFundamentadorAi).mockReturnValueOnce(new Promise(() => {}));
    const { callbacks, rerender } = await ready();
    submit();
    const signal = vi.mocked(runFundamentadorAi).mock.calls[0][0].signal!;
    rerender(<FundamentadorAiDrawer {...callbacks} initialQuery="Nueva selección" />);
    expect(signal.aborted).toBe(true);
    expect(screen.getByLabelText('Consulta para fundamentar')).toHaveValue('Nueva selección');
    expect(screen.getByRole('button', { name: 'Enviar consulta a Gemini' })).toBeEnabled();
  });
});
