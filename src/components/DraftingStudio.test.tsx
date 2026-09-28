import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DraftingStudio } from './DraftingStudio';
import { createStudioSession } from '../lib/studio-session';

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

    // Catálogo modal se abre de inicio para reducir clics en desktop
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

  it('renderiza la barra de herramientas rápidas de formato táctil con botones de deshacer, rehacer y citar', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    // Cerrar catálogo si está abierto
    const catalogClose = screen.queryByLabelText('Cerrar catálogo');
    if (catalogClose) {
      await act(async () => {
        fireEvent.click(catalogClose);
      });
    }

    const toolbar = screen.getByRole('toolbar', { name: 'Herramientas rápidas de edición' });
    expect(toolbar).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Deshacer' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Rehacer' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Negrita' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Cursiva' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Lista con viñetas' })).toBeInTheDocument();
    expect(within(toolbar).getByRole('button', { name: 'Fundamentar cita legal' })).toBeInTheDocument();
  });

  it('en móviles muestra el banner sutil de sugerencia de catálogo en lugar de abrir el modal completo automáticamente', async () => {
    const originalWidth = window.innerWidth;
    window.innerWidth = 375;

    const storage = {
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      lastOpened: vi.fn().mockResolvedValue(undefined),
      remember: vi.fn().mockResolvedValue(undefined),
    };
    const session = createStudioSession(storage, { read: () => null, acknowledge: () => {} });

    await act(async () => {
      render(<DraftingStudio session={session} />);
    });

    // En móvil el diálogo no debe abrirse automáticamente
    expect(screen.queryByRole('dialog', { name: 'Catálogo de instrumentos y plantillas' })).not.toBeInTheDocument();

    // Debe mostrarse el banner sutil de sugerencia
    const suggestionBanner = screen.getByRole('status', { name: 'Sugerencia de catálogo' });
    expect(suggestionBanner).toBeInTheDocument();
    expect(within(suggestionBanner).getByText(/¿Iniciar con una plantilla legal\?/i)).toBeInTheDocument();

    // Al hacer clic en Explorar, abre el catálogo
    const exploreBtn = within(suggestionBanner).getByRole('button', { name: 'Explorar' });
    await act(async () => {
      fireEvent.click(exploreBtn);
    });

    expect(screen.getByRole('dialog', { name: 'Catálogo de instrumentos y plantillas' })).toBeInTheDocument();

    window.innerWidth = originalWidth;
  });

  it('renderiza el menú descolgable de 3 puntos para acciones secundarias en móvil', async () => {
    await act(async () => {
      render(<DraftingStudio />);
    });

    const moreButton = screen.getByRole('button', { name: 'Más opciones' });
    expect(moreButton).toBeInTheDocument();

    expect(screen.getByText('Borradores locales')).toBeInTheDocument();
    expect(screen.getByText('Importar archivo')).toBeInTheDocument();
    expect(screen.getByText('Nuevo instrumento')).toBeInTheDocument();
    expect(screen.getByText('Auditoría legal')).toBeInTheDocument();
    expect(screen.getByText('Fundamentación')).toBeInTheDocument();
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
