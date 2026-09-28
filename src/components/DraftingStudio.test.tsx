import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftingStudio } from './DraftingStudio';

describe('DraftingStudio Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renderiza la cabecera y acciones principales de Ingeniería Jurídica', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    expect(screen.getByRole('heading', { name: 'Ingeniería Jurídica', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/Redacción documental/i)).toBeInTheDocument();
    expect(screen.getByTitle('Iniciar nuevo documento desde el catálogo de instrumentos')).toBeInTheDocument();
    expect(screen.getByTitle('Ver borradores locales')).toBeInTheDocument();
    expect(screen.getByTitle('Importar DOCX, PDF o TXT')).toBeInTheDocument();
    expect(screen.getByTitle('Auditoría Contractual (Exclusivo de Lex Corporativo Desktop)')).toBeInTheDocument();
    expect(screen.getByTitle('Fundamentación y Citas (Exclusivo de Lex Corporativo Desktop)')).toBeInTheDocument();
  });

  it('abre automáticamente el catálogo de instrumentos al ingresar y permite filtrar por materia', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    // Catálogo modal se abre de inicio para reducir clics
    const dialog = await screen.findByRole('dialog', { name: 'Catálogo de instrumentos y plantillas' });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Biblioteca de Instrumentos' })).toBeInTheDocument();
    expect(within(dialog).getByPlaceholderText(/Buscar por contrato, pagaré/i)).toBeInTheDocument();

    const mercantilTabs = within(dialog).getAllByRole('button', { name: /Mercantil/i });
    expect(mercantilTabs.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.click(mercantilTabs[0]);
    });

    expect(within(dialog).getByPlaceholderText(/Buscar por contrato, pagaré/i)).toBeInTheDocument();
  });

  it('bloquea el modo Fundamentar y muestra el modal exclusivo de Desktop', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    const fundBtn = screen.getByTitle('Fundamentación y Citas (Exclusivo de Lex Corporativo Desktop)');
    await act(async () => {
      fireEvent.click(fundBtn);
    });

    expect(screen.getByRole('heading', { name: /Motor de Fundamentación y Citas en Vivo/i })).toBeInTheDocument();
    expect(screen.getByText(/Exclusivo de Lex Desktop/i)).toBeInTheDocument();
  });

  it('bloquea el modo Auditar y muestra el modal exclusivo de Desktop', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    const auditBtn = screen.getByTitle('Auditoría Contractual (Exclusivo de Lex Corporativo Desktop)');
    await act(async () => {
      fireEvent.click(auditBtn);
    });

    expect(screen.getByRole('heading', { name: /Auditoría Contractual y Semántica/i })).toBeInTheDocument();
    expect(screen.getByText(/Exclusivo de Lex Desktop/i)).toBeInTheDocument();
  });

  it('abre el modal de borradores locales al hacer clic en Borradores', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    const draftsBtn = screen.getByTitle('Ver borradores locales');
    await act(async () => {
      fireEvent.click(draftsBtn);
    });

    expect(screen.getByRole('dialog', { name: 'Borradores locales' })).toBeInTheDocument();
  });

  it('renderiza directamente el instrumento en el lienzo sin modal bloqueante y permite abrir variables bajo demanda', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    // Modal de catálogo abierto de inicio
    const dialog = await screen.findByRole('dialog', { name: 'Catálogo de instrumentos y plantillas' });
    expect(dialog).toBeInTheDocument();

    // Seleccionar el primer instrumento disponible
    const instrumentCards = within(dialog).getAllByText(/variables dinámicas/i);
    expect(instrumentCards.length).toBeGreaterThan(0);
    const firstCard = instrumentCards[0].closest('button');
    expect(firstCard).not.toBeNull();

    await act(async () => {
      fireEvent.click(firstCard!);
    });

    // Changing documents now waits for the previous revision to be persisted.
    expect(await screen.findByText(/Instrumento activo:/i)).toBeInTheDocument();

    // El catálogo se cierra y el modal de variables NO bloquea la pantalla
    expect(screen.queryByRole('dialog', { name: 'Catálogo de instrumentos y plantillas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Variables de la plantilla' })).not.toBeInTheDocument();

    // El banner de instrumento activo aparece en el lienzo
    expect(screen.getByText(/Instrumento activo:/i)).toBeInTheDocument();
    const batchVariablesBtn = screen.getByRole('button', { name: /Rellenar variables en lote/i });
    expect(batchVariablesBtn).toBeInTheDocument();

    // Al presionar el botón de variables, se abre bajo demanda
    await act(async () => {
      fireEvent.click(batchVariablesBtn);
    });

    expect(screen.getByRole('dialog', { name: 'Variables de la plantilla' })).toBeInTheDocument();
  });

  it('renderiza la barra de herramientas móvil con métricas de palabras y lectura', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    expect(screen.getByLabelText('Barra de herramientas móvil')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Compartir documento').length).toBeGreaterThan(0);
    expect(screen.getByText(/palabras · ~/i)).toBeInTheDocument();
  });
});
