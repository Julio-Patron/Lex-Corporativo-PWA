import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePwaInstall } from './use-pwa-install';

describe('usePwaInstall', () => {
  it('retiene el evento al ocultar el aviso para instalar desde ajustes', async () => {
    const { result } = renderHook(() => usePwaInstall());
    const prompt = vi.fn().mockResolvedValue(undefined);
    const event = Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
      prompt, userChoice: Promise.resolve({ outcome: 'accepted' }),
    });
    act(() => { window.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(result.current.available).toBe(true);
    act(() => result.current.dismiss());
    expect(result.current.available).toBe(true);
    expect(result.current.dismissed).toBe(true);
    await act(async () => { await result.current.install(); });
    expect(prompt).toHaveBeenCalledOnce();
    expect(result.current.available).toBe(false);
    expect(result.current.installed).toBe(false);
    act(() => { window.dispatchEvent(new Event('appinstalled')); });
    expect(result.current.installed).toBe(true);
  });

  it('maneja fallo del prompt sin anunciar instalación', async () => {
    const { result } = renderHook(() => usePwaInstall());
    act(() => {
      window.dispatchEvent(Object.assign(new Event('beforeinstallprompt'), {
        prompt: vi.fn().mockRejectedValue(new Error('Unavailable')),
        userChoice: Promise.resolve({ outcome: 'dismissed' }),
      }));
    });
    await act(async () => { await result.current.install(); });
    expect(result.current.error).toContain('menú del navegador');
    expect(result.current.busy).toBe(false);
    expect(result.current.installed).toBe(false);
  });
});
