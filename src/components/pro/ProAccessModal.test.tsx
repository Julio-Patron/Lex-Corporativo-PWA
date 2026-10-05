import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProAccessModal } from './ProAccessModal';
import { getByokApiKey, getProSession, removeByokApiKey, saveByokApiKey } from '../../lib/pro-license';
import { testGeminiApiKey } from '../../services/fundamentador-ai';

vi.mock('../../lib/pro-license', () => ({
  getByokApiKey: vi.fn(), getProSession: vi.fn(), removeByokApiKey: vi.fn(), saveByokApiKey: vi.fn(),
  isLikelyGeminiApiKey: (key: string) => key.length >= 20,
}));
vi.mock('../../services/fundamentador-ai', () => ({ GEMINI_MODEL: 'gemini-flash-latest', testGeminiApiKey: vi.fn() }));

describe('ProAccessModal settings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(getByokApiKey).mockResolvedValue(null);
    vi.mocked(getProSession).mockResolvedValue(null);
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
  });

  async function ready(props = {}) {
    const rendered = render(<ProAccessModal isOpen onClose={vi.fn()} {...props} />);
    await waitFor(() => expect(screen.queryByText('Cargando configuración…')).not.toBeInTheDocument());
    return rendered;
  }

  it('saves, replaces, tests and removes keys without activating or closing settings', async () => {
    const onActivated = vi.fn();
    const onClose = vi.fn();
    await ready({ onActivated, onClose });
    fireEvent.change(screen.getByLabelText('Tu API key de Gemini'), { target: { value: 'test-placeholder-key-123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar clave' }));
    await waitFor(() => expect(saveByokApiKey).toHaveBeenCalledWith('test-placeholder-key-123456'));
    expect(onClose).not.toHaveBeenCalled();
    expect(onActivated).toHaveBeenCalledWith();
    fireEvent.change(screen.getByLabelText('Nueva clave para reemplazar la guardada'), { target: { value: 'replacement-placeholder-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar reemplazo' }));
    await waitFor(() => expect(saveByokApiKey).toHaveBeenLastCalledWith('replacement-placeholder-123'));
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    await waitFor(() => expect(testGeminiApiKey).toHaveBeenCalledWith('replacement-placeholder-123', { signal: expect.any(AbortSignal) }));
    await screen.findByText(/Conexión verificada/);
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar clave' }));
    await waitFor(() => expect(removeByokApiKey).toHaveBeenCalledOnce());
    expect(await screen.findByText(/Clave eliminada/)).toBeInTheDocument();
  });

  it('discloses direct Google transfers, reversible storage and unverified legacy licensing', async () => {
    vi.mocked(getProSession).mockResolvedValue({ method: 'license', activatedAt: '2026-01-01' });
    await ready();
    expect(screen.getByText(/ofuscación local, NO cifrado/)).toBeInTheDocument();
    expect(screen.getByText(/se envían directamente a Google/)).toBeInTheDocument();
    expect(screen.getByText(/no equivale a una compra verificada/)).toBeInTheDocument();
    expect(screen.getByText(/Una licencia por sí sola no proporciona una clave/)).toBeInTheDocument();
  });

  it('aborts a live test on Escape and restores focus', async () => {
    vi.mocked(getByokApiKey).mockResolvedValue('test-placeholder-key-123456');
    vi.mocked(testGeminiApiKey).mockReturnValue(new Promise(() => {}));
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const { unmount } = await ready({ onClose });
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    const signal = vi.mocked(testGeminiApiKey).mock.calls[0][1]!.signal!;
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(signal.aborted).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
    unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it('cancels tests on unmount and supports explicit cancel without saving', async () => {
    vi.mocked(getByokApiKey).mockResolvedValue('test-placeholder-key-123456');
    vi.mocked(testGeminiApiKey).mockReturnValue(new Promise(() => {}));
    const { unmount } = await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    const signal = vi.mocked(testGeminiApiKey).mock.calls[0][1]!.signal!;
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar prueba' }));
    expect(signal.aborted).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    const nextSignal = vi.mocked(testGeminiApiKey).mock.calls[1][1]!.signal!;
    unmount();
    expect(nextSignal.aborted).toBe(true);
    expect(saveByokApiKey).not.toHaveBeenCalled();
  });

  it('shows provider errors and allows retry', async () => {
    vi.mocked(getByokApiKey).mockResolvedValue('test-placeholder-key-123456');
    vi.mocked(testGeminiApiKey).mockRejectedValueOnce(new Error('Cuota agotada'));
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Probar conexión' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Cuota agotada');
    expect(screen.getByRole('button', { name: 'Probar conexión' })).toBeEnabled();
  });

  it('keeps local key management available offline', async () => {
    vi.mocked(getByokApiKey).mockResolvedValue('test-placeholder-key-123456');
    await ready();
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByRole('button', { name: 'Probar conexión' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardar reemplazo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Eliminar clave' })).toBeEnabled();
  });
});
