import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssistantFundamentadorDrawer } from './AssistantFundamentadorDrawer';
import * as corpusService from '../../services/corpus-search';

vi.mock('../../services/corpus-search', () => ({
  executeCorpusSearch: vi.fn(),
}));

describe('AssistantFundamentadorDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const { container } = render(
      <AssistantFundamentadorDrawer
        isOpen={false}
        onClose={vi.fn()}
        citations={[]}
        onInsertFootnote={vi.fn()}
        onInsertBlockquote={vi.fn()}
        onAddCitation={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renderiza el drawer, ejecuta una búsqueda y permite insertar nota al pie', async () => {
    const mockArticles = [
      {
        id: 'cff_art_1',
        lawCode: 'CFF',
        lawName: 'Código Fiscal de la Federación',
        articleNumber: 'Art. 1',
        title: 'Obligación de contribuir',
        content: 'Las personas físicas y las morales están obligadas a contribuir para los gastos públicos.',
        sourceName: 'Diario Oficial de la Federación',
        sourceUrl: 'https://dof.gob.mx',
      },
    ];

    vi.mocked(corpusService.executeCorpusSearch).mockResolvedValueOnce({
      articles: mockArticles,
      query: 'contribuir',
      scope: 'todos',
      durationMs: 5,
    });

    const onInsertFootnote = vi.fn();
    const onClose = vi.fn();

    render(
      <AssistantFundamentadorDrawer
        isOpen={true}
        onClose={onClose}
        initialQuery="contribuir"
        citations={[]}
        onInsertFootnote={onInsertFootnote}
        onInsertBlockquote={vi.fn()}
        onAddCitation={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog', { name: 'Asistente de Fundamentación Legal' })).toBeInTheDocument();

    // El resultado debe mostrarse
    const articleTitle = await screen.findByText('Art. 1');
    expect(articleTitle).toBeInTheDocument();
    expect(screen.getAllByText(/Las personas físicas y las morales/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Fuente oficial' })).toHaveAttribute('href', 'https://dof.gob.mx');

    // Botón de nota al pie
    const footnoteBtn = screen.getByRole('button', { name: /Nota al Pie/i });
    await act(async () => {
      fireEvent.click(footnoteBtn);
    });

    expect(onInsertFootnote).toHaveBeenCalledWith(mockArticles[0]);
  });

  it('la generación IA es explícita y conserva la consulta; Escape cierra', () => {
    const onGenerateAi = vi.fn();
    const onClose = vi.fn();
    render(<AssistantFundamentadorDrawer isOpen onClose={onClose} citations={[]}
      onInsertFootnote={vi.fn()} onInsertBlockquote={vi.fn()} onAddCitation={vi.fn()} onGenerateAi={onGenerateAi} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'despido' } });
    expect(onGenerateAi).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Fundamentar con IA BYOK' }));
    expect(onGenerateAi).toHaveBeenCalledWith('despido');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('informa cómo recuperar la consulta cuando falta la descarga offline', async () => {
    vi.mocked(corpusService.executeCorpusSearch).mockRejectedValueOnce(new Error('offline'));
    render(<AssistantFundamentadorDrawer isOpen onClose={vi.fn()} citations={[]}
      onInsertFootnote={vi.fn()} onInsertBlockquote={vi.fn()} onAddCitation={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'despido' } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('descarga las leyes desde Ajustes');
    expect(screen.queryByRole('link', { name: 'Fuente oficial' })).not.toBeInTheDocument();
  });
});
