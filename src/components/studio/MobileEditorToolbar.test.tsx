import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MobileEditorToolbar } from './MobileEditorToolbar';
import type { Editor } from '@tiptap/react';

describe('MobileEditorToolbar Component', () => {
  const createMockEditor = (activeMarks: string[] = [], canUndo = true, canRedo = true) => {
    const chainMock = {
      focus: vi.fn().mockReturnThis(),
      undo: vi.fn().mockReturnThis(),
      redo: vi.fn().mockReturnThis(),
      toggleBold: vi.fn().mockReturnThis(),
      toggleItalic: vi.fn().mockReturnThis(),
      toggleHeading: vi.fn().mockReturnThis(),
      toggleBulletList: vi.fn().mockReturnThis(),
      toggleBlockquote: vi.fn().mockReturnThis(),
      run: vi.fn(),
    };

    return {
      isActive: vi.fn((name: string, attrs?: Record<string, unknown>) => {
        if (name === 'heading' && attrs?.level === 2) {
          return activeMarks.includes('heading2');
        }
        return activeMarks.includes(name);
      }),
      can: vi.fn(() => ({
        undo: () => canUndo,
        redo: () => canRedo,
      })),
      chain: vi.fn(() => chainMock),
    } as unknown as Editor;
  };

  it('renderiza la barra de herramientas móvil con botones de formato principales', () => {
    const editor = createMockEditor();
    render(
      <MobileEditorToolbar
        editor={editor}
        onOpenAssistant={vi.fn()}
        onShare={vi.fn()}
        wordCount={150}
        readingMinutes={1}
      />
    );

    expect(screen.getByLabelText('Barra de herramientas móvil')).toBeInTheDocument();
    expect(screen.getByLabelText('Deshacer edición')).toBeInTheDocument();
    expect(screen.getByLabelText('Rehacer edición')).toBeInTheDocument();
    expect(screen.getByLabelText('Negrita')).toBeInTheDocument();
    expect(screen.getByLabelText('Cursiva')).toBeInTheDocument();
    expect(screen.getByLabelText('Encabezado H2')).toBeInTheDocument();
    expect(screen.getByLabelText('Lista con viñetas')).toBeInTheDocument();
    expect(screen.getByLabelText('Cita en bloque')).toBeInTheDocument();
    expect(screen.getByLabelText('Asistente de fundamentación legal')).toBeInTheDocument();
    expect(screen.getByLabelText('Compartir documento')).toBeInTheDocument();
  });

  it('ejecuta los comandos de formato al pulsar los botones', () => {
    const editor = createMockEditor();
    const chainSpy = editor.chain();
    render(
      <MobileEditorToolbar
        editor={editor}
        onOpenAssistant={vi.fn()}
        onShare={vi.fn()}
        wordCount={150}
        readingMinutes={1}
      />
    );

    fireEvent.click(screen.getByLabelText('Negrita'));
    expect(chainSpy.toggleBold).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Cursiva'));
    expect(chainSpy.toggleItalic).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Encabezado H2'));
    expect(chainSpy.toggleHeading).toHaveBeenCalledWith({ level: 2 });

    fireEvent.click(screen.getByLabelText('Lista con viñetas'));
    expect(chainSpy.toggleBulletList).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Cita en bloque'));
    expect(chainSpy.toggleBlockquote).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Deshacer edición'));
    expect(chainSpy.undo).toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Rehacer edición'));
    expect(chainSpy.redo).toHaveBeenCalled();
  });

  it('activa el estado aria-pressed cuando los formatos están activos en el editor', () => {
    const editor = createMockEditor(['bold', 'heading2']);
    render(
      <MobileEditorToolbar
        editor={editor}
        onOpenAssistant={vi.fn()}
        onShare={vi.fn()}
        wordCount={42}
        readingMinutes={1}
      />
    );

    expect(screen.getByLabelText('Negrita')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Encabezado H2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByLabelText('Cursiva')).toHaveAttribute('aria-pressed', 'false');
  });

  it('llama a onOpenAssistant y onShare al interactuar con las acciones legales', () => {
    const onOpenAssistant = vi.fn();
    const onShare = vi.fn();
    const onOpenVariables = vi.fn();
    const editor = createMockEditor();

    render(
      <MobileEditorToolbar
        editor={editor}
        onOpenAssistant={onOpenAssistant}
        onShare={onShare}
        hasVariables={true}
        variableCount={5}
        onOpenVariables={onOpenVariables}
        wordCount={99}
        readingMinutes={1}
      />
    );

    fireEvent.click(screen.getByLabelText('Asistente de fundamentación legal'));
    expect(onOpenAssistant).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Compartir documento'));
    expect(onShare).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Variables de plantilla'));
    expect(onOpenVariables).toHaveBeenCalledTimes(1);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('deshabilita Deshacer y Rehacer cuando can().undo() o can().redo() son false', () => {
    const editor = createMockEditor([], false, false);
    render(
      <MobileEditorToolbar
        editor={editor}
        onOpenAssistant={vi.fn()}
        onShare={vi.fn()}
        wordCount={0}
        readingMinutes={1}
      />
    );

    expect(screen.getByLabelText('Deshacer edición')).toBeDisabled();
    expect(screen.getByLabelText('Rehacer edición')).toBeDisabled();
  });
});
