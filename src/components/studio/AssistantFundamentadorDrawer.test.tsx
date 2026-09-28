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
    expect(screen.getByText(/Las personas físicas y las morales/i)).toBeInTheDocument();

    // Botón de nota al pie
    const footnoteBtn = screen.getByRole('button', { name: /Nota al Pie/i });
    await act(async () => {
      fireEvent.click(footnoteBtn);
    });

    expect(onInsertFootnote).toHaveBeenCalledWith(mockArticles[0]);
  });
});
