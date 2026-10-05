import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
      setError('');
      setDismissed(false);
    };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!prompt || busy) return;
    setBusy(true);
    setError('');
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setError('No fue posible abrir la instalación. Usa el menú del navegador.');
    } finally {
      setPrompt(null);
      setBusy(false);
    }
  };

  return { available: !!prompt && !installed, installed, busy, error, dismissed, install, dismiss: () => setDismissed(true) };
}

export type PwaInstallation = ReturnType<typeof usePwaInstall>;
