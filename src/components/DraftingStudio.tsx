import { lazy, Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { renderLegalTemplate } from '../lib/template-renderer';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Download,
  FilePenLine,
  FileText,
  FolderOpen,
  Italic,
  List,
  LoaderCircle,
  Lock,
  MoreVertical,
  Plus,
  Redo2,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react';
import logoMark from '../assets/logo-mark.png';
import { loadTemplateRegistry } from '../lib/template-registry';
import { createStudioDocument as createDocument, getStudioSession, isUntouchedStudioDocument, type StudioSession } from '../lib/studio-session';
import { documentExportText } from '../lib/document-export-content';
import { AccessibleDialog } from './ui/AccessibleDialog';
import { downloadTextCopy, exportPreservedDocxCopy, importUserDocument } from '../lib/document-import';
import { exportDocumentDocx } from '../lib/docx-export';
import { exportDocumentPdf } from '../lib/pdf-export';
import { useUiStore } from '../store/useUiStore';
import { TemplateCatalogModal } from './studio/TemplateCatalogModal';
import { StudioWelcomeHub } from './studio/StudioWelcomeHub';
import { EditorBubbleMenu } from './studio/EditorBubbleMenu';
import { MobileEditorToolbar } from './studio/MobileEditorToolbar';
import { FootnotesAppendix } from './studio/FootnotesAppendix';
import { DesktopFeatureLockModal, type LockedFeatureType } from './studio/DesktopFeatureLockModal';
import type {
  LegalArticle,
  LegalTemplate,
  StudioDocument,
} from '../types';

const ClauseAuditorDrawer = lazy(() =>
  import('./studio/ClauseAuditorDrawer').then((m) => ({ default: m.ClauseAuditorDrawer })),
);
const AssistantFundamentadorDrawer = lazy(() =>
  import('./studio/AssistantFundamentadorDrawer').then((m) => ({ default: m.AssistantFundamentadorDrawer })),
);

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const textToHtml = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');

export interface DraftingStudioProps {
  onNavigateToDesktop?: () => void;
  registerBeforeLeave?: (guard: (() => Promise<boolean>) | null) => void;
  session?: StudioSession;
}

export function DraftingStudio({ onNavigateToDesktop, registerBeforeLeave, session = getStudioSession() }: DraftingStudioProps = {}) {
  const { notify } = useUiStore();
  const fileInput = useRef<HTMLInputElement>(null);
  const exportDetailsRef = useRef<HTMLDetailsElement>(null);
  const mobileExportDetailsRef = useRef<HTMLDetailsElement>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  // States
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const sessionState = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const { document: currentDocument, documents, status: saveState } = sessionState;
  const selectedTemplate = templates.find((item) => item.id === currentDocument.templateId) ?? null;
  const setCurrentDocument = session.update;

  // Modals and Drawers
  const [showWelcomeHub, setShowWelcomeHub] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showAuditorDrawer, setShowAuditorDrawer] = useState(false);
  const [showAssistantDrawer, setShowAssistantDrawer] = useState(false);
  const [showVariablesModal, setShowVariablesModal] = useState(false);
  const [showDraftsModal, setShowDraftsModal] = useState(false);
  const [lockedFeatureModal, setLockedFeatureModal] = useState<LockedFeatureType>(null);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [showMobileCatalogPrompt, setShowMobileCatalogPrompt] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: currentDocument.editorHtml,
    editorProps: {
      attributes: {
        class: 'studio-editor min-h-[480px] outline-none leading-relaxed text-slate-800 text-base',
        'aria-label': 'Contenido editable del documento',
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      setCurrentDocument((document) => ({
        ...document,
        editorHtml: activeEditor.getHTML(),
        updatedAt: new Date().toISOString(),
      }));
    },
  });

  useEffect(() => {
    let active = true;
    loadTemplateRegistry().then((registry) => {
      if (!active) return;
      setTemplates(registry);
    });
    session.initialize().then(async (ready) => {
      if (ready) await session.receivePendingCitation();
      if (active) {
        const isUntouched = ready && !session.getSnapshot().error && isUntouchedStudioDocument(session.getSnapshot().document);
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
        if (isUntouched) {
          if (isMobile) {
            setShowMobileCatalogPrompt(true);
          } else {
            setShowCatalogModal(true);
          }
        }
      }
    });
    const checkPendingCitation = () => { void session.receivePendingCitation(); };
    window.addEventListener('focus', checkPendingCitation);
    return () => {
      active = false;
      window.removeEventListener('focus', checkPendingCitation);
    };
  }, [session]);

  useEffect(() => {
    registerBeforeLeave?.(session.prepareToLeave);
    return () => registerBeforeLeave?.(null);
  }, [registerBeforeLeave, session]);

  function openVariables() {
    setFormData(currentDocument.templateValues ?? {});
    setShowVariablesModal(true);
  }

  useEffect(() => {
    if (!editor || editor.isDestroyed || editor.getHTML() === currentDocument.editorHtml) return;
    editor.commands.setContent(currentDocument.editorHtml, { emitUpdate: false });
  }, [currentDocument.editorHtml, currentDocument.id, editor]);

  useEffect(() => {
    editor?.setEditable(!sessionState.transitioning && !sessionState.locked, false);
  }, [editor, sessionState.transitioning, sessionState.locked]);

  useEffect(() => {
    let wakeLock: { release?: () => Promise<void> } | null = null;
    const requestWakeLock = async () => {
      if (
        typeof navigator !== 'undefined' &&
        'wakeLock' in navigator &&
        typeof (navigator as unknown as { wakeLock?: { request?: (type: string) => Promise<{ release?: () => Promise<void> }> } }).wakeLock?.request === 'function' &&
        document.visibilityState === 'visible'
      ) {
        try {
          wakeLock = await (navigator as unknown as { wakeLock: { request: (type: string) => Promise<{ release?: () => Promise<void> }> } }).wakeLock.request('screen');
        } catch {
          // Ignore silently
        }
      }
    };
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock && typeof wakeLock.release === 'function') {
        wakeLock.release().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMac = typeof navigator !== 'undefined' && navigator.platform?.toUpperCase().includes('MAC');
      const isModifier = isMac ? e.metaKey : e.ctrlKey;

      if (isModifier && e.key.toLowerCase() === 's') {
        e.preventDefault();
        session.flush().then((saved) => {
          if (!saved) return;
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(15);
          }
          notify(session.getSnapshot().status === 'saved' ? 'Borrador guardado localmente (Ctrl+S).' : 'No hay cambios pendientes.', 'success');
        });
      } else if (isModifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setLockedFeatureModal('fundamentar');
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(10);
        }
      } else if (isModifier && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setLockedFeatureModal('auditar');
      } else if (isModifier && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setShowCatalogModal((prev) => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, notify]);

  async function applyTemplateVariables(template: LegalTemplate, data: Record<string, string>, copy = false) {
    try {
      const generated = renderLegalTemplate(template.templateHandlebars, {
        ...data,
        ...(template.toggles ?? []).reduce<Record<string, string>>((values, toggle) => {
          values[`toggle_${toggle.id}`] = toggle.defaultActive ? toggle.content : '';
          return values;
        }, {}),
      });
      const editorHtml = textToHtml(generated);
      if (!await session.replace(createDocument({
        title: copy ? `${template.title} — copia` : template.title,
        sourceKind: 'template',
        templateId: template.id,
        templateValues: { ...data },
        editorHtml,
        citations: copy ? [...currentDocument.citations] : [],
      }))) return;
      setShowVariablesModal(false);
      setShowWelcomeHub(false);
      setShowCatalogModal(false);
      notify(copy ? 'Copia generada. El borrador anterior conserva tus ediciones.' : 'Instrumento cargado en el editor con éxito.', 'success');
    } catch {
      notify('La plantilla no pudo compilarse. Revisa los datos capturados.', 'error');
    }
  }

  async function selectTemplate(template: LegalTemplate) {
    const values = Object.fromEntries(
      template.fields.map((field) => [
        field.id,
        field.defaultValue ?? (field.type === 'date' ? '' : `[${field.label.toLocaleUpperCase('es-MX')}]`),
      ]),
    );
    await applyTemplateVariables(template, values);
  }

  async function selectBlank() {
    const blank = createDocument({});
    if (!await session.replace(blank)) return;
    setShowCatalogModal(false);
    setShowVariablesModal(false);
    setShowWelcomeHub(false);
    notify('Lienzo en blanco iniciado.', 'info');
  }

  async function openDocument(document: StudioDocument) {
    if (!await session.replace(document)) return;
    setShowDraftsModal(false);
    setShowVariablesModal(false);
  }

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      const imported = await importUserDocument(file);
      const document = createDocument({
        title: imported.title,
        sourceKind: imported.sourceKind,
        sourceFileName: imported.sourceFileName,
        sourceMimeType: imported.sourceMimeType,
        sourceBuffer: imported.sourceBuffer,
        editorHtml: textToHtml(imported.text),
      });
      if (!await session.replace(document)) return;
      setShowCatalogModal(false);
      notify(
        imported.sourceKind === 'docx'
          ? 'DOCX abierto. El original permanece intacto; exportaremos una copia editada.'
          : imported.sourceKind === 'pdf'
            ? 'PDF extraído a una copia textual editable. El original no se modifica.'
            : 'Archivo de texto abierto en el Estudio.',
        'success',
      );
    } catch (error) {
      notify(error instanceof Error ? error.message : 'No fue posible importar el archivo.', 'error');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function exportDocx() {
    exportDetailsRef.current?.removeAttribute('open');
    mobileExportDetailsRef.current?.removeAttribute('open');
    if (!editor) return;
    try {
      if (currentDocument.sourceKind === 'docx' && currentDocument.sourceBuffer && currentDocument.sourceFileName) {
        await exportPreservedDocxCopy(
          currentDocument.sourceBuffer,
          editor.getText({ blockSeparator: '\n\n' }),
          currentDocument.citations,
          currentDocument.sourceFileName,
        );
      } else {
        await exportDocumentDocx(currentDocument.title, documentExportText(editor.getText({ blockSeparator: '\n\n' }), currentDocument.citations));
      }
      notify('Copia DOCX exportada.', 'success');
    } catch {
      notify('No fue posible exportar la copia DOCX.', 'error');
    }
  }

  async function exportPdf() {
    exportDetailsRef.current?.removeAttribute('open');
    mobileExportDetailsRef.current?.removeAttribute('open');
    if (!editor) return;
    try {
      await exportDocumentPdf(currentDocument.title, documentExportText(editor.getText({ blockSeparator: '\n\n' }), currentDocument.citations));
      notify('Copia PDF exportada.', 'success');
    } catch { notify('No fue posible exportar la copia PDF.', 'error'); }
  }

  async function exportTxt() {
    exportDetailsRef.current?.removeAttribute('open');
    mobileExportDetailsRef.current?.removeAttribute('open');
    if (!editor) return;
    downloadTextCopy(documentExportText(editor.getText({ blockSeparator: '\n\n' }), currentDocument.citations), currentDocument.sourceFileName ?? currentDocument.title);
  }

  async function shareDocument() {
    if (!editor) return;
    const text = documentExportText(editor.getText({ blockSeparator: '\n\n' }), currentDocument.citations);
    const shareData = {
      title: currentDocument.title,
      text: `${currentDocument.title}\n\n${text}\n\n---\nGenerado en Lex Corporativo · Ingeniería Jurídica`,
    };
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        notify('Documento compartido.', 'success');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(shareData.text);
          notify('Texto del documento copiado al portapapeles.', 'success');
        }
      }
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.text);
      notify('Texto del documento copiado al portapapeles.', 'success');
    }
  }

  function addCitation(article: LegalArticle) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    session.addCitation(article);
  }

  function insertFootnote(article: LegalArticle) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    let citationIndex = currentDocument.citations.findIndex((c) => c.articleId === article.id);
    if (citationIndex === -1) {
      citationIndex = currentDocument.citations.length;
      session.addCitation(article);
    }

    const footnoteNumber = citationIndex + 1;
    editor?.chain().focus().insertContent(` <sup>[${footnoteNumber}]</sup> `).run();
    notify(`Nota al pie [${footnoteNumber}] insertada y vinculada al apéndice.`, 'success');
  }

  function insertBlockquote(article: LegalArticle) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
    editor?.chain().focus().insertContent(
      `<blockquote><p><strong>${escapeHtml(article.lawName)}, ${escapeHtml(article.articleNumber)}.</strong> ${escapeHtml(article.content)}</p><p>Fuente oficial: <a href="${escapeHtml(article.sourceUrl)}">${escapeHtml(article.sourceName)}</a></p></blockquote>`,
    ).run();
    addCitation(article);
    notify('Cita textual en bloque insertada.', 'success');
  }

  function removeCitation(citationId: string) {
    setCurrentDocument((doc) => ({
      ...doc,
      citations: doc.citations.filter((c) => c.id !== citationId),
      updatedAt: new Date().toISOString(),
    }));
    notify('Cita retirada de las notas al pie.', 'info');
  }

  const documentPlainText = useMemo(() => {
    if (editor && !editor.isDestroyed) {
      const editorText = editor.getText();
      if (editorText.trim()) return `${currentDocument.title}\n\n${editorText}`;
    }
    const strippedHtml = currentDocument.editorHtml.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').trim();
    return `${currentDocument.title}\n\n${strippedHtml}`;
  }, [editor, currentDocument.editorHtml, currentDocument.title]);

  const { wordCount, readingMinutes } = useMemo(() => {
    const rawText = editor && !editor.isDestroyed ? editor.getText() : currentDocument.editorHtml.replace(/<[^>]+>/g, ' ');
    const trimmed = rawText.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    const reading = Math.max(1, Math.ceil(words / 200));
    return { wordCount: words, readingMinutes: reading };
  }, [editor, currentDocument.editorHtml]);

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col bg-slate-100/70 text-slate-950">
      {/* Top Main Navigation Bar */}
      <section className="sticky top-0 z-40 border-b border-slate-200/90 bg-white shadow-card">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-2 lg:flex-row lg:items-center lg:justify-between">
          {/* Title and Module Brand */}
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-900 text-legal-gold shadow-card shrink-0">
              <FilePenLine size={18} className="sm:w-5 sm:h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-base font-bold tracking-tight text-slate-950 sm:text-lg">
                  Ingeniería Jurídica
                </h1>
                <span
                  role="status"
                  aria-live="polite"
                  aria-label="Estado del borrador"
                  data-status={saveState}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors ${
                    saveState === 'error'
                      ? 'border border-red-200 bg-red-50 text-red-700'
                      : saveState === 'saving' || saveState === 'loading'
                      ? 'border border-amber-200 bg-amber-50 text-amber-800'
                      : 'border border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {saveState === 'saving' || saveState === 'loading' ? (
                    <LoaderCircle size={11} className="animate-spin text-legal-golddark" />
                  ) : saveState === 'error' ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                  ) : (
                    <CheckCircle2 size={11} className="text-emerald-600" />
                  )}
                  <span className="hidden sm:inline">
                    {{ loading: 'Recuperando…', empty: 'Sin cambios', pending: 'Cambios pendientes', saving: 'Guardando…', saved: 'Guardado en este dispositivo', error: 'Requiere atención' }[saveState]}
                  </span>
                  <span className="sm:hidden">
                    {{ loading: 'Cargando…', empty: 'Limpio', pending: 'Pendiente', saving: 'Guardando…', saved: 'Guardado', error: 'Atención' }[saveState]}
                  </span>
                </span>
              </div>
              <p className="hidden sm:block text-[11px] text-slate-500">
                Redacción documental estructurada y aplicación de variables jurídicas
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            {/* Desktop / Tablet Toolbar (sm:flex) */}
            <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 sm:flex-wrap">
              {/* Nuevo Documento Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  setShowCatalogModal(true);
                }}
                className="studio-action gap-1 font-bold text-slate-800 hover:border-legal-gold cursor-pointer inline-flex"
                title="Iniciar nuevo documento desde el catálogo de instrumentos"
              >
                <Plus size={14} className="text-legal-golddark" />
                <span>Nuevo</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  setShowCatalogModal(true);
                }}
                className="studio-primary gap-1 sm:gap-2"
                title="Abrir catálogo de plantillas e instrumentos"
              >
                <BookOpen size={14} />
                <span className="truncate max-w-[120px] sm:max-w-[180px]">
                  {selectedTemplate ? selectedTemplate.title : 'Instrumentos'}
                </span>
                <ChevronDown size={12} className="opacity-75" />
              </button>

              {/* Template Variables Trigger (Contextual when template is active) */}
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                    openVariables();
                  }}
                  className="studio-action text-slate-800 hover:border-legal-gold gap-1.5 shrink-0"
                  title="Configurar variables de la plantilla activa"
                >
                  <SlidersHorizontal size={13} className="text-legal-golddark" />
                  <span>Variables</span>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-700">
                    {selectedTemplate.fields.length}
                  </span>
                </button>
              )}

              <span className="h-5 w-px bg-slate-200 hidden sm:block shrink-0" aria-hidden="true" />

              {/* Document Management Group */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowDraftsModal(true)}
                  className="studio-action gap-1.5"
                  title="Ver borradores locales"
                >
                  <FolderOpen size={14} className="text-slate-500" />
                  <span className="hidden sm:inline">Borradores</span>
                  {documents.length > 0 && (
                    <span className="rounded-full bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                      {documents.length}
                    </span>
                  )}
                </button>

                <input
                  ref={fileInput}
                  className="hidden"
                  type="file"
                  accept=".docx,.txt,.pdf,text/plain,application/pdf"
                  onChange={(event) => handleImport(event.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="studio-action hidden sm:inline-flex gap-1.5"
                  title="Importar DOCX, PDF o TXT"
                >
                  <Upload size={14} className="text-slate-500" />
                  <span className="hidden md:inline">Importar</span>
                </button>

                <button
                  type="button"
                  onClick={shareDocument}
                  className="studio-action inline-flex gap-1.5"
                  title="Compartir documento o copiar texto"
                  aria-label="Compartir documento"
                >
                  <Share2 size={14} className="text-slate-500" />
                  <span className="hidden sm:inline">Compartir</span>
                </button>
              </div>

              <span className="h-5 w-px bg-slate-200 hidden md:block shrink-0" aria-hidden="true" />

              {/* Desktop Tools */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setLockedFeatureModal('auditar')}
                  className="studio-action text-slate-600 hover:text-slate-900 border-slate-200 gap-1.5"
                  title="Auditoría Contractual (Exclusivo de Lex Corporativo Desktop)"
                >
                  <Lock size={12} className="text-slate-400" />
                  <span>Auditar</span>
                  <span className="rounded bg-slate-100 px-1 py-0.5 text-[8px] font-mono font-medium text-slate-500">
                    EXE
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setLockedFeatureModal('fundamentar')}
                  className="studio-action text-slate-600 hover:text-slate-900 border-slate-200 gap-1.5"
                  title="Fundamentación y Citas (Exclusivo de Lex Corporativo Desktop)"
                >
                  <Lock size={12} className="text-slate-400" />
                  <span>Fundamentar</span>
                  <span className="rounded bg-slate-100 px-1 py-0.5 text-[8px] font-mono font-medium text-slate-500">
                    EXE
                  </span>
                </button>
              </div>

              {/* Export Menu */}
              <details ref={exportDetailsRef} className="relative shrink-0">
                <summary className="studio-action cursor-pointer list-none gap-1.5 border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 shadow-card">
                  <Download size={14} className="text-slate-600" />
                  <span>Exportar</span>
                  <ChevronDown size={12} className="text-slate-400" />
                </summary>
                <div className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-dialog">
                  <button type="button" onClick={exportDocx} className="studio-menu-item">
                    Copia Word (.docx)
                  </button>
                  <button type="button" onClick={exportPdf} className="studio-menu-item">
                    Copia PDF Membretada
                  </button>
                  <button type="button" onClick={exportTxt} className="studio-menu-item">
                    Texto plano (.txt)
                  </button>
                </div>
              </details>
            </div>

            {/* Mobile Compact Toolbar (sm:hidden) */}
            <div className="flex sm:hidden items-center justify-between w-full gap-1.5">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  setShowCatalogModal(true);
                }}
                className="studio-primary gap-1 py-1.5 px-3 text-xs shrink-0 active:scale-95 transition"
                title="Abrir catálogo de plantillas e instrumentos"
              >
                <BookOpen size={14} />
                <span className="truncate max-w-[130px]">
                  {selectedTemplate ? selectedTemplate.title : 'Instrumentos'}
                </span>
                <ChevronDown size={12} className="opacity-75" />
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={shareDocument}
                  className="studio-action p-2 min-h-8 min-w-8 text-slate-700 active:scale-95"
                  title="Compartir documento"
                  aria-label="Compartir documento"
                >
                  <Share2 size={15} />
                </button>

                <details ref={mobileExportDetailsRef} className="relative shrink-0">
                  <summary
                    role="button"
                    className="studio-action cursor-pointer list-none p-1.5 min-h-8 min-w-8 text-slate-700 active:scale-95 rounded-xl border border-slate-200 bg-white flex items-center justify-center"
                    aria-label="Exportar"
                    title="Exportar documento"
                  >
                    <Download size={15} />
                  </summary>
                  <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-dialog text-xs">
                    <button type="button" onClick={exportDocx} className="studio-menu-item">
                      Copia Word (.docx)
                    </button>
                    <button type="button" onClick={exportPdf} className="studio-menu-item">
                      Copia PDF Membretada
                    </button>
                    <button type="button" onClick={exportTxt} className="studio-menu-item">
                      Texto plano (.txt)
                    </button>
                  </div>
                </details>

                {/* Mobile 3-Dots Menu (...) */}
                <details ref={mobileMenuRef} className="relative shrink-0">
                  <summary
                    role="button"
                    className="studio-action cursor-pointer list-none p-1.5 min-h-8 min-w-8 text-slate-700 active:scale-95 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center"
                    aria-label="Más opciones"
                    title="Más opciones del estudio"
                  >
                    <MoreVertical size={16} />
                  </summary>
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-dialog text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        mobileMenuRef.current?.removeAttribute('open');
                        setShowDraftsModal(true);
                      }}
                      className="studio-menu-item flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <FolderOpen size={14} className="text-slate-500" />
                        <span>Borradores locales</span>
                      </span>
                      {documents.length > 0 && (
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.2 text-[9px] font-bold text-slate-600">
                          {documents.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        mobileMenuRef.current?.removeAttribute('open');
                        fileInput.current?.click();
                      }}
                      className="studio-menu-item flex items-center gap-2"
                    >
                      <Upload size={14} className="text-slate-500" />
                      <span>Importar archivo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        mobileMenuRef.current?.removeAttribute('open');
                        setShowCatalogModal(true);
                      }}
                      className="studio-menu-item flex items-center gap-2"
                    >
                      <Plus size={14} className="text-legal-gold" />
                      <span>Nuevo instrumento</span>
                    </button>

                    {selectedTemplate && (
                      <button
                        type="button"
                        onClick={() => {
                          mobileMenuRef.current?.removeAttribute('open');
                          openVariables();
                        }}
                        className="studio-menu-item flex items-center justify-between text-amber-900 font-bold"
                      >
                        <span className="flex items-center gap-2">
                          <SlidersHorizontal size={14} className="text-amber-600" />
                          <span>Variables</span>
                        </span>
                        <span className="rounded-full bg-amber-200/80 px-1.5 py-0.2 text-[9px] font-black text-amber-900">
                          {selectedTemplate.fields.length}
                        </span>
                      </button>
                    )}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        mobileMenuRef.current?.removeAttribute('open');
                        setLockedFeatureModal('auditar');
                      }}
                      className="studio-menu-item flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Lock size={13} className="text-amber-500" />
                        <span>Auditoría legal</span>
                      </span>
                      <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[8px] font-extrabold text-amber-900 uppercase">
                        Desktop
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        mobileMenuRef.current?.removeAttribute('open');
                        setLockedFeatureModal('fundamentar');
                      }}
                      className="studio-menu-item flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Lock size={13} className="text-slate-400" />
                        <span>Fundamentación</span>
                      </span>
                      <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[8px] font-extrabold text-slate-600 uppercase">
                        Desktop
                      </span>
                    </button>
                  </div>
                </details>
              </div>
            </div>

            {/* Hidden File Input for Import */}
            <input
              ref={fileInput}
              className="hidden"
              type="file"
              accept=".docx,.txt,.pdf,text/plain,application/pdf"
              onChange={(event) => handleImport(event.target.files?.[0])}
            />
          </div>
        </div>
      </section>

      {sessionState.error && (
        <div role="alert" className="mx-auto mt-4 flex w-full max-w-4xl flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="min-w-0 flex-1">{sessionState.error}</p>
          <button type="button" className="studio-action" onClick={() => { void session.retry(); }}>Reintentar</button>
          {!sessionState.locked && <button type="button" className="studio-action" onClick={exportTxt}>Descargar copia TXT</button>}
        </div>
      )}

      {/* Main Workspace: Clean Centered Canvas */}
      <main className="mx-auto w-full max-w-4xl flex-1 px-3 py-2 sm:px-6 sm:py-8 pb-36 sm:pb-12">
        {/* Mobile Subtle Catalog Suggestion Banner */}
        {showMobileCatalogPrompt && isUntouchedStudioDocument(currentDocument) && (
          <div
            role="status"
            aria-label="Sugerencia de catálogo"
            className="sm:hidden mb-2.5 flex items-center justify-between gap-2 rounded-xl border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-xs text-amber-950 shadow-card"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Sparkles size={14} className="text-amber-700 shrink-0" />
              <span className="truncate font-semibold text-[11px]">¿Iniciar con una plantilla legal?</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  setShowCatalogModal(true);
                  setShowMobileCatalogPrompt(false);
                }}
                className="rounded-lg bg-slate-900 px-2.5 py-1 text-[10px] font-extrabold text-amber-300 active:scale-95 transition cursor-pointer"
              >
                Explorar
              </button>
              <button
                type="button"
                onClick={() => setShowMobileCatalogPrompt(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md active:scale-95 transition cursor-pointer"
                aria-label="Cerrar sugerencia"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Paper Sheet */}
        <article className="legal-letterhead mx-auto flex w-full flex-col justify-between rounded-xl sm:rounded-2xl bg-white px-4 py-4 sm:px-12 sm:py-10 shadow-card sm:shadow-card transition-all border border-slate-200/90">
          {/* Institutional Letterhead Header */}
          <header className="border-t-2 border-legal-gold border-b border-slate-200 pb-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="hidden sm:flex items-center gap-2 sm:gap-3">
                <div className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-900 p-1 sm:p-1.5 shadow-card">
                  <img src={logoMark} alt="Lex Corporativo" className="h-full w-full object-contain" />
                </div>
                <div>
                  <span className="font-serif text-xs sm:text-sm font-bold tracking-[0.16em] sm:tracking-[0.2em] text-slate-950 block">
                    LEX CORPORATIVO
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Estudio de Ingeniería y Redacción Jurídica
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-left sm:text-right text-[10px] font-medium text-slate-400 w-full sm:w-auto justify-between sm:justify-end">
                <span className="font-mono text-slate-700 font-bold tracking-tight">
                  FOLIO · {currentDocument.id.slice(0, 8).toUpperCase()}
                </span>
                <span className="text-slate-300">·</span>
                <span className="uppercase text-slate-500">
                  {new Date(currentDocument.updatedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
                <span className="inline-block rounded-md bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-medium text-slate-600 uppercase tracking-wide">
                  Borrador
                </span>
              </div>
            </div>
          </header>

          {/* Active Template Banner (Harmonized Institutional Style) */}
          {selectedTemplate && (
            <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl border border-slate-200/90 bg-slate-50/90 p-3 sm:px-4 sm:py-2.5 text-xs text-slate-700 shadow-card">
              <div className="flex items-center gap-2 min-w-0">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-legal-gold/15 text-legal-golddark shrink-0">
                  <Sparkles size={13} />
                </span>
                <div className="truncate">
                  <span className="text-slate-500 font-medium">Instrumento activo: </span>
                  <strong className="text-slate-950 font-bold">{selectedTemplate.title}</strong>
                  <span className="text-slate-400 ml-2 font-mono text-[11px]">
                    ({selectedTemplate.fields.length} variables disponibles)
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={openVariables}
                  aria-label="Rellenar variables en lote"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 transition active:scale-95 shadow-card cursor-pointer"
                >
                  <SlidersHorizontal size={12} className="text-legal-golddark" />
                  <span>Rellenar variables en lote</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowCatalogModal(true)}
                  className="text-xs font-medium text-slate-500 hover:text-slate-900 underline px-1 py-1 cursor-pointer"
                >
                  Cambiar
                </button>
              </div>
            </div>
          )}

          {/* Quick Format & Title Header */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-4 border-b border-slate-100 pb-3 mb-4">
            {/* Document Title Input */}
            <div className="flex-1 min-w-0">
              <input
                type="text"
                aria-label="Título del documento"
                disabled={sessionState.transitioning || sessionState.locked}
                value={currentDocument.title}
                onChange={(event) =>
                  setCurrentDocument((doc) => ({ ...doc, title: event.target.value, updatedAt: new Date().toISOString() }))
                }
                className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 font-serif text-lg sm:text-xl font-bold text-slate-900 outline-none transition focus:border-legal-gold focus:bg-slate-50 placeholder:font-sans placeholder:text-sm placeholder:font-normal placeholder:text-slate-400"
                placeholder="Título del documento o contrato…"
                enterKeyHint="done"
                autoCapitalize="sentences"
              />
            </div>

            {/* In-Editor Quick Toolbar */}
            <div
              role="toolbar"
              aria-label="Herramientas rápidas de edición"
              className="hidden sm:flex items-center gap-0.5 rounded-xl bg-slate-50 border border-slate-200/80 p-1 self-end sm:self-auto shadow-card"
            >
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  editor?.chain().focus().undo().run();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-card transition cursor-pointer"
                title="Deshacer"
                aria-label="Deshacer"
              >
                <Undo2 size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  editor?.chain().focus().redo().run();
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-card transition cursor-pointer"
                title="Rehacer"
                aria-label="Rehacer"
              >
                <Redo2 size={13} />
              </button>
              <div className="h-4 w-px bg-slate-200 mx-1" />
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  editor?.chain().focus().toggleBold().run();
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                  editor?.isActive('bold')
                    ? 'bg-slate-900 text-white font-bold shadow-card'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                title="Negrita"
                aria-label="Negrita"
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  editor?.chain().focus().toggleItalic().run();
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                  editor?.isActive('italic')
                    ? 'bg-slate-900 text-white font-bold shadow-card'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                title="Cursiva"
                aria-label="Cursiva"
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  editor?.chain().focus().toggleBulletList().run();
                }}
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition cursor-pointer ${
                  editor?.isActive('bulletList')
                    ? 'bg-slate-900 text-white font-bold shadow-card'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
                title="Lista con viñetas"
                aria-label="Lista con viñetas"
              >
                <List size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(10);
                  setAssistantQuery(editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to, ' ').trim() || '');
                  setShowAssistantDrawer(true);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-card transition cursor-pointer"
                title="Fundamentar cita legal"
                aria-label="Fundamentar cita legal"
              >
                <BookOpen size={13} />
              </button>
            </div>
          </div>

          {/* Opción A: TipTap Bubble Menu for Selection */}
          <EditorBubbleMenu
            editor={editor}
            onFundamentar={(query) => {
              setAssistantQuery(query);
              setLockedFeatureModal('fundamentar');
            }}
          />

          {/* TipTap Document Content */}
          <div className="py-1 sm:py-2">
            <EditorContent editor={editor} />
          </div>

          {/* Opción C: Footnotes & Appendix Component at Bottom */}
          <FootnotesAppendix citations={currentDocument.citations} onRemoveCitation={removeCitation} />

          {/* Institutional Letterhead Footer */}
          <footer className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-slate-200 pt-3 sm:pt-4 text-[9px] sm:text-[10px] text-slate-400">
            <div className="flex items-center gap-2 flex-wrap">
              <span>Lex Corporativo PWA · Borradores locales</span>
              <span className="hidden sm:inline">·</span>
              <span className="font-mono text-slate-500 font-medium">
                {wordCount} palabras · ~{readingMinutes} min de lectura
              </span>
            </div>
            <span className="font-bold uppercase text-slate-500 text-[8px] sm:text-[9px]">
              Vista de edición · Paginación al exportar
            </span>
          </footer>
        </article>
      </main>

      {/* Mobile Floating Action & Formatting Bar (Thumb Zone) */}
      <MobileEditorToolbar
        editor={editor}
        onOpenAssistant={() => setShowAssistantDrawer(true)}
        onShare={shareDocument}
        hasVariables={Boolean(selectedTemplate && selectedTemplate.fields.length > 0)}
        variableCount={selectedTemplate?.fields.length ?? 0}
        onOpenVariables={openVariables}
        wordCount={wordCount}
        readingMinutes={readingMinutes}
      />

      {/* Opción A & C: Assistant Drawer for Foundation Search & Insertion */}
      {showAssistantDrawer && (
        <Suspense fallback={null}>
          <AssistantFundamentadorDrawer
            isOpen={showAssistantDrawer}
            onClose={() => setShowAssistantDrawer(false)}
            initialQuery={assistantQuery}
            citations={currentDocument.citations}
            onInsertFootnote={insertFootnote}
            onInsertBlockquote={insertBlockquote}
            onAddCitation={addCitation}
          />
        </Suspense>
      )}

      {/* Studio Welcome / Launcher Hub */}
      <StudioWelcomeHub
        isOpen={showWelcomeHub}
        onClose={() => setShowWelcomeHub(false)}
        onOpenCatalog={() => setShowCatalogModal(true)}
        onSelectBlank={selectBlank}
        onTriggerImport={() => fileInput.current?.click()}
        recentDraft={documents[0] ?? null}
        onOpenDraft={openDocument}
      />

      {/* Catalog Modal */}
      <TemplateCatalogModal
        isOpen={showCatalogModal}
        onClose={() => setShowCatalogModal(false)}
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelectTemplate={selectTemplate}
        onSelectBlank={selectBlank}
      />

      {/* Desktop Feature Lock Modal (Exclusivo Desktop) */}
      <DesktopFeatureLockModal
        isOpen={lockedFeatureModal !== null}
        onClose={() => setLockedFeatureModal(null)}
        feature={lockedFeatureModal}
        onNavigateToDesktop={onNavigateToDesktop}
      />

      {/* Opción D: Clause Auditor Drawer */}
      {showAuditorDrawer && (
        <Suspense fallback={null}>
          <ClauseAuditorDrawer
            isOpen={showAuditorDrawer}
            onClose={() => setShowAuditorDrawer(false)}
            documentText={documentPlainText}
            citations={currentDocument.citations}
            onQuickSearch={(query) => {
              setAssistantQuery(query);
              setShowAssistantDrawer(true);
            }}
          />
        </Suspense>
      )}

      {/* Template Variables Modal */}
      {showVariablesModal && selectedTemplate && (
        <AccessibleDialog
          isOpen={showVariablesModal}
          onClose={() => setShowVariablesModal(false)}
          label="Variables de la plantilla"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-dialog sm:rounded-2xl">
            <div className="flex justify-center pb-0 pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="font-serif text-base font-bold text-slate-950">Variables del Instrumento</h2>
                <p className="text-xs text-slate-500">{selectedTemplate.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowVariablesModal(false)}
                className="studio-icon-button"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-3">
              <p className="text-sm text-slate-600">Generaremos una copia con estos valores. El borrador anterior conservará tus ediciones y notas.</p>
              {selectedTemplate.fields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label htmlFor={`template-field-${field.id}`} className="block text-xs font-bold text-slate-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`template-field-${field.id}`}
                      aria-required={field.required || undefined}
                      rows={3}
                      value={formData[field.id] ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="studio-input p-3 text-base sm:text-xs"
                    />
                  ) : (
                    <input
                      id={`template-field-${field.id}`}
                      aria-required={field.required || undefined}
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={formData[field.id] ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, [field.id]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="studio-input text-base sm:text-xs"
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 p-4 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowVariablesModal(false)}
                className="studio-action text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={sessionState.transitioning || sessionState.locked}
                onClick={() => { void applyTemplateVariables(selectedTemplate, formData, true); }}
                className="studio-primary px-5 py-2 text-xs font-bold"
              >
                Generar copia con variables
              </button>
            </div>
          </div>
        </AccessibleDialog>
      )}

      {/* Local Drafts Modal */}
      {showDraftsModal && (
        <AccessibleDialog
          isOpen={showDraftsModal}
          onClose={() => setShowDraftsModal(false)}
          label="Borradores locales"
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4 backdrop-blur-xs"
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-dialog sm:rounded-2xl">
            <div className="flex justify-center pb-0 pt-3 sm:hidden">
              <div className="h-1 w-10 rounded-full bg-slate-300" />
            </div>
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <div>
                <h2 className="font-serif text-lg font-medium text-slate-950">Borradores locales</h2>
                <p className="text-xs text-slate-500">Guardados en IndexedDB en este dispositivo.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftsModal(false)}
                className="studio-icon-button"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-4">
              {documents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                  Todavía no hay borradores guardados.
                </p>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition">
                      <FileText size={18} className="text-slate-400 shrink-0" />
                      <button type="button" onClick={() => openDocument(doc)} className="min-w-0 flex-1 text-left">
                        <strong className="block truncate text-sm text-slate-950">{doc.title}</strong>
                        <span className="text-[10px] text-slate-500">
                          {doc.sourceKind.toUpperCase()} · {new Date(doc.updatedAt).toLocaleString('es-MX')} · {doc.citations?.length ?? 0} notas
                        </span>
                      </button>
                      <button
                        type="button"
                        disabled={sessionState.transitioning || sessionState.locked}
                        onClick={() => { void session.remove(doc.id); }}
                        className="studio-icon-button text-red-600"
                        aria-label={`Eliminar ${doc.title}`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
}
