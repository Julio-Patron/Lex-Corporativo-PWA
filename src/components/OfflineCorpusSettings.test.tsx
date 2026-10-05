import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OfflineCorpusStatus } from '../lib/offline-corpus';

const mock = vi.hoisted(() => ({
  status: {} as OfflineCorpusStatus, listeners: new Set<() => void>(),
  refresh: vi.fn(), download: vi.fn(), cancel: vi.fn(), remove: vi.fn(),
}));
vi.mock('../lib/offline-corpus', () => ({
  offlineCorpus: {
    getSnapshot: () => mock.status,
    subscribe: (listener: () => void) => { mock.listeners.add(listener); return () => mock.listeners.delete(listener); },
    refresh: mock.refresh, download: mock.download, cancel: mock.cancel, remove: mock.remove,
  },
}));
import { OfflineCorpusSettings } from './OfflineCorpusSettings';

function change(next: Partial<OfflineCorpusStatus>) {
  act(() => {
    mock.status = { ...mock.status, ...next };
    mock.listeners.forEach(listener => listener());
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mock.status = { phase: 'absent', completed: 0, total: 6, bytes: 1024 * 1024, persisted: false, hasDownload: false, message: '' };
});
afterEach(cleanup);

describe('OfflineCorpusSettings inline panel', () => {
  it('inspects without downloading, explains limitations and waits for explicit consent', () => {
    render(<OfflineCorpusSettings />);
    expect(mock.refresh).toHaveBeenCalledOnce();
    expect(mock.download).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText(/Google.*necesitando internet/)).toBeInTheDocument();
    expect(screen.getByText(/navegador o el usuario pueden borrar/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar corpus y motor' }));
    expect(mock.download).toHaveBeenCalledOnce();
  });

  it('announces progress, cancels and offers retry after failure', () => {
    render(<OfflineCorpusSettings />);
    change({ phase: 'downloading', completed: 2 });
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '2');
    expect(screen.getByRole('status')).toHaveTextContent('2 de 6');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar descarga' }));
    expect(mock.cancel).toHaveBeenCalledOnce();
    change({ phase: 'error', message: 'No hay espacio' });
    expect(screen.getByRole('status')).toHaveTextContent('No hay espacio');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar descarga' }));
    expect(mock.download).toHaveBeenCalledOnce();
  });

  it('shows ready only for completion and permits removal without deleting documents', () => {
    render(<OfflineCorpusSettings />);
    change({ phase: 'ready', completed: 6, hasDownload: true, persisted: true });
    expect(screen.getByRole('status')).toHaveTextContent('completos');
    expect(screen.queryByRole('button', { name: 'Descargar corpus y motor' })).not.toBeInTheDocument();
    expect(screen.getByText(/persistente concedido/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Eliminar descarga' }));
    expect(mock.remove).toHaveBeenCalledOnce();
    fireEvent.focus(window);
    expect(mock.refresh).toHaveBeenCalledTimes(2);
  });

  it('disables download when browser storage is unavailable', () => {
    render(<OfflineCorpusSettings />);
    change({ phase: 'unavailable', message: 'Navegador incompatible' });
    expect(screen.getByRole('button', { name: 'Descargar corpus y motor' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Navegador incompatible');
  });
});
