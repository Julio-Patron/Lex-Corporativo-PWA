import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Introduction } from './Introduction';

describe('Introduction Component', () => {
  it('renderiza la nueva interfaz estructurada con tarjetas de Ingeniería Jurídica, Fundamentador, Radar y Desktop', () => {
    const handleOpenStation = vi.fn();
    render(<Introduction onOpenStation={handleOpenStation} />);

    expect(screen.getByAltText('Logotipo Lex Corporativo')).toBeInTheDocument();
    expect(screen.getByText(/Plataforma de Consulta e Ingeniería Jurídica/i)).toBeInTheDocument();
    expect(screen.getByText('Ingeniería Jurídica')).toBeInTheDocument();
    expect(screen.getByText('Fundamentador Jurídico')).toBeInTheDocument();
    expect(screen.getByText('Radar de Licitaciones')).toBeInTheDocument();
    expect(screen.getByText('Lex Corporativo Desktop')).toBeInTheDocument();
  });

  it('llama a onOpenStation con "estudio" al hacer clic en Abrir Ingeniería Jurídica', async () => {
    const handleOpenStation = vi.fn();
    render(<Introduction onOpenStation={handleOpenStation} />);

    const estudioBtn = screen.getByRole('button', { name: /Abrir Ingeniería Jurídica/i });
    await act(async () => {
      fireEvent.click(estudioBtn);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(handleOpenStation).toHaveBeenCalledWith('estudio');
  });

  it('llama a onOpenStation con "normativa" al hacer clic en Consultar Fundamentador', async () => {
    const handleOpenStation = vi.fn();
    render(<Introduction onOpenStation={handleOpenStation} />);

    const normativaBtn = screen.getByRole('button', { name: /Consultar Fundamentador/i });
    await act(async () => {
      fireEvent.click(normativaBtn);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(handleOpenStation).toHaveBeenCalledWith('normativa');
  });

  it('llama a onOpenStation con "licitaciones" al hacer clic en Explorar Radar', async () => {
    const handleOpenStation = vi.fn();
    render(<Introduction onOpenStation={handleOpenStation} />);

    const licitacionesBtn = screen.getByRole('button', { name: /Explorar Radar/i });
    await act(async () => {
      fireEvent.click(licitacionesBtn);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(handleOpenStation).toHaveBeenCalledWith('licitaciones');
  });

  it('llama a onOpenStation con "desktop" al hacer clic en la tarjeta Desktop', async () => {
    const handleOpenStation = vi.fn();
    render(<Introduction onOpenStation={handleOpenStation} />);

    const desktopBtn = screen.getByRole('button', { name: /Ficha Técnica Desktop/i });
    await act(async () => {
      fireEvent.click(desktopBtn);
      await new Promise((resolve) => setTimeout(resolve, 250));
    });

    expect(handleOpenStation).toHaveBeenCalledWith('desktop');
  });

  it('muestra las tarjetas compactas sin descripciones excesivas y conserva las métricas clave', () => {
    const handleOpenStation = vi.fn();
    render(<Introduction onOpenStation={handleOpenStation} />);

    // Verifica que la frase redundante previa y las descripciones largas fueron removidas
    expect(
      screen.queryByText(/Redacta instrumentos corporativos, consulta legislación federal/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Sin almacenamiento en la nube, sin rastreo ni telemetría/i),
    ).not.toBeInTheDocument();

    // Verifica métricas en las insignias de las tarjetas
    expect(screen.getByText('25 documentos')).toBeInTheDocument();
    expect(screen.getByText(/leyes federales/i)).toBeInTheDocument();
    expect(screen.getAllByText(/licitaciones/i).length).toBeGreaterThan(0);
  });
});
