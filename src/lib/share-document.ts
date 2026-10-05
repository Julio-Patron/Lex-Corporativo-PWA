import { downloadTextCopy } from './document-import';

export async function shareDocumentCopy(title: string, text: string): Promise<'shared' | 'copied' | 'downloaded' | 'cancelled'> {
  const content = `${title}\n\n${text}`;
  const filename = `${Array.from(title.replace(/[\\/:*?"<>|]/g, '-')).filter((char) => char.charCodeAt(0) >= 32).join('').slice(0, 100) || 'documento'}.txt`;
  const file = new File([content], filename, { type: 'text/plain;charset=utf-8' });
  if (navigator.share) {
    try {
      const data: ShareData = navigator.canShare?.({ files: [file] })
        ? { title, files: [file] }
        : { title, text: content };
      await navigator.share(data);
      return 'shared';
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return 'cancelled';
    }
  }
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(content);
      return 'copied';
    } catch { /* Descarga si el navegador deniega el portapapeles. */ }
  }
  downloadTextCopy(content, filename);
  return 'downloaded';
}
