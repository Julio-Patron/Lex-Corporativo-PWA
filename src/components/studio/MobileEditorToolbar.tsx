import type { Editor } from '@tiptap/react';
import {
  Bold,
  Heading2,
  Italic,
  List,
  Quote,
  Redo2,
  Search,
  Share2,
  SlidersHorizontal,
  Undo2,
} from 'lucide-react';

interface MobileEditorToolbarProps {
  editor: Editor | null;
  onOpenAssistant: () => void;
  onShare: () => void;
  onOpenVariables?: () => void;
  hasVariables?: boolean;
  variableCount?: number;
  wordCount?: number;
  readingMinutes?: number;
}

export function MobileEditorToolbar({
  editor,
  onOpenAssistant,
  onShare,
  onOpenVariables,
  hasVariables,
  variableCount = 0,
}: MobileEditorToolbarProps) {
  if (!editor) return null;

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  };

  const isBold = editor.isActive('bold');
  const isItalic = editor.isActive('italic');
  const isH2 = editor.isActive('heading', { level: 2 });
  const isBulletList = editor.isActive('bulletList');
  const isBlockquote = editor.isActive('blockquote');

  const canUndo = editor.can().undo();
  const canRedo = editor.can().redo();

  return (
    <aside
      aria-label="Barra de herramientas móvil"
      className="sm:hidden fixed left-0 right-0 z-20 border-t border-slate-200/90 bg-white/95 px-2 py-1.5 backdrop-blur-md shadow-card transition-all"
      style={{ bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex items-center justify-between gap-1">
        {/* Scrollable Action Strip */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-0">
          {/* History Group */}
          <button
            type="button"
            disabled={!canUndo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate();
              editor.chain().focus().undo().run();
            }}
            className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl text-slate-700 transition active:scale-90 cursor-pointer ${
              !canUndo ? 'opacity-35 cursor-not-allowed' : 'hover:bg-slate-100 hover:text-slate-950'
            }`}
            title="Deshacer"
            aria-label="Deshacer edición"
          >
            <Undo2 size={16} />
          </button>

          <button
            type="button"
            disabled={!canRedo}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate();
              editor.chain().focus().redo().run();
            }}
            className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl text-slate-700 transition active:scale-90 cursor-pointer ${
              !canRedo ? 'opacity-35 cursor-not-allowed' : 'hover:bg-slate-100 hover:text-slate-950'
            }`}
            title="Rehacer"
            aria-label="Rehacer edición"
          >
            <Redo2 size={16} />
          </button>

          <span className="h-5 w-px bg-slate-200 shrink-0 mx-0.5" aria-hidden="true" />

          {/* Typography Formatting */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate();
              editor.chain().focus().toggleBold().run();
            }}
            className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl transition active:scale-90 cursor-pointer ${
              isBold
                ? 'bg-slate-900 text-legal-gold shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title="Negrita"
            aria-label="Negrita"
            aria-pressed={isBold}
          >
            <Bold size={16} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate();
              editor.chain().focus().toggleItalic().run();
            }}
            className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl transition active:scale-90 cursor-pointer ${
              isItalic
                ? 'bg-slate-900 text-legal-gold shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title="Cursiva"
            aria-label="Cursiva"
            aria-pressed={isItalic}
          >
            <Italic size={16} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate();
              editor.chain().focus().toggleHeading({ level: 2 }).run();
            }}
            className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl transition active:scale-90 cursor-pointer ${
              isH2
                ? 'bg-slate-900 text-legal-gold shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title="Encabezado de sección (H2)"
            aria-label="Encabezado H2"
            aria-pressed={isH2}
          >
            <Heading2 size={16} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate();
              editor.chain().focus().toggleBulletList().run();
            }}
            className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl transition active:scale-90 cursor-pointer ${
              isBulletList
                ? 'bg-slate-900 text-legal-gold shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title="Lista con viñetas"
            aria-label="Lista con viñetas"
            aria-pressed={isBulletList}
          >
            <List size={16} />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              vibrate();
              editor.chain().focus().toggleBlockquote().run();
            }}
            className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl transition active:scale-90 cursor-pointer ${
              isBlockquote
                ? 'bg-slate-900 text-legal-gold shadow-xs font-bold'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
            }`}
            title="Cita textual en bloque"
            aria-label="Cita en bloque"
            aria-pressed={isBlockquote}
          >
            <Quote size={15} />
          </button>

          <span className="h-5 w-px bg-slate-200 shrink-0 mx-0.5" aria-hidden="true" />

          {/* Legal Actions */}
          <button
            type="button"
            onClick={() => {
              vibrate();
              onOpenAssistant();
            }}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-100 px-3 text-xs font-bold text-amber-950 transition active:scale-90 shrink-0 hover:bg-amber-200 cursor-pointer shadow-sm"
            title="Consultar corpus legal para fundamentar"
            aria-label="Asistente de fundamentación legal"
          >
            <Search size={14} className="text-amber-700" />
            <span>Fundamentar</span>
          </button>

          {hasVariables && onOpenVariables && (
            <button
              type="button"
              onClick={() => {
                vibrate();
                onOpenVariables();
              }}
              className="flex h-9 items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 px-2.5 text-xs font-bold text-slate-800 transition active:scale-90 shrink-0 hover:bg-slate-200 cursor-pointer"
              title="Configurar variables de la plantilla"
              aria-label="Variables de plantilla"
            >
              <SlidersHorizontal size={13} className="text-legal-golddark" />
              <span>Variables</span>
              {variableCount > 0 && (
                <span className="rounded-full bg-white px-1.5 py-0.2 text-[9px] font-bold text-slate-700">
                  {variableCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              vibrate();
              onShare();
            }}
            className="flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition active:scale-90 shrink-0 cursor-pointer"
            title="Compartir documento vía WhatsApp, Slack o portapapeles"
            aria-label="Compartir documento"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
