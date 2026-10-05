import { BubbleMenu } from '@tiptap/react/menus';
import type { Editor } from '@tiptap/react';
import { Bold, BookOpen, Heading2, Italic, List } from 'lucide-react';

interface EditorBubbleMenuProps {
  editor: Editor | null;
  onFundamentar: (selectedText: string) => void;
}

export function EditorBubbleMenu({ editor, onFundamentar }: EditorBubbleMenuProps) {
  if (!editor) return null;

  const vibrate = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(10);
    }
  };

  return (
    <BubbleMenu
      editor={editor}
      shouldShow={({ state, from, to }) => {
        const { doc } = state;
        const isTextSelection = from !== to;
        const text = doc.textBetween(from, to, ' ').trim();
        return isTextSelection && text.length > 1;
      }}
      className="mobile-editor-bubble flex max-w-[calc(100vw-1rem)] items-center gap-1 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/95 p-1.5 text-white shadow-dialog backdrop-blur-md"
    >
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          vibrate();
          const { from, to } = editor.state.selection;
          const selectedText = editor.state.doc.textBetween(from, to, ' ').trim();
          if (selectedText) {
            onFundamentar(selectedText);
          }
        }}
        className="flex min-h-9 items-center gap-1.5 rounded-xl bg-legal-gold/20 px-3 text-xs font-bold text-legal-gold transition hover:bg-legal-gold/30 active:scale-95 cursor-pointer"
        title="Fundamentar texto seleccionado"
      >
        <BookOpen size={12} className="text-legal-gold" />
        <span>Fundamentar</span>
        <span className="rounded bg-legal-gold/20 px-1 py-px text-[9px] font-bold uppercase text-legal-gold">
          Local
        </span>
      </button>

      <div className="mx-1 h-5 w-px bg-slate-800" />

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          vibrate();
          editor.chain().focus().toggleBold().run();
        }}
        className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl text-xs transition active:scale-95 cursor-pointer ${
          editor.isActive('bold') ? 'bg-slate-800 text-legal-gold font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
        aria-label="Negrita"
      >
        <Bold size={15} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          vibrate();
          editor.chain().focus().toggleItalic().run();
        }}
        className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl text-xs transition active:scale-95 cursor-pointer ${
          editor.isActive('italic') ? 'bg-slate-800 text-legal-gold font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
        aria-label="Cursiva"
      >
        <Italic size={15} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          vibrate();
          editor.chain().focus().toggleHeading({ level: 2 }).run();
        }}
        className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl text-xs transition active:scale-95 cursor-pointer ${
          editor.isActive('heading', { level: 2 }) ? 'bg-slate-800 text-legal-gold font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
        aria-label="Encabezado H2"
      >
        <Heading2 size={15} />
      </button>

      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          vibrate();
          editor.chain().focus().toggleBulletList().run();
        }}
        className={`flex h-9 w-9 min-h-9 min-w-9 items-center justify-center rounded-xl text-xs transition active:scale-95 cursor-pointer ${
          editor.isActive('bulletList') ? 'bg-slate-800 text-legal-gold font-bold' : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
        }`}
        aria-label="Lista con viñetas"
      >
        <List size={15} />
      </button>
    </BubbleMenu>
  );
}
