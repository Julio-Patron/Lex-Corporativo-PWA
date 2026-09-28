import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppShell } from './components/AppShell';
import { BuscadorLegal } from './components/BuscadorLegal';
import { BuscadorLicitaciones } from './components/BuscadorLicitaciones';
import { Introduction } from './components/Introduction';
import { ErrorBoundary } from './components/ErrorBoundary';
import { trackEvent, sanitizeAnalyticsUrl } from './lib/analytics';
import { updateSeoMeta } from './lib/seo';
import type { AppModuleTab } from './types';

const DesktopPresentation = lazy(() =>
  import('./components/DesktopPresentation').then((m) => ({ default: m.DesktopPresentation })),
);

const DraftingStudio = lazy(() =>
  import('./components/DraftingStudio').then((module) => ({ default: module.DraftingStudio })),
);

const tenderParams = ['lq', 'materia', 'caracter', 'convocante', 'entidad', 'estatus', 'orden'];
const stationParams = ['q', 'tab', 'law', 'scope', ...tenderParams];

function readNavigation() {
  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');
  const activeTab: AppModuleTab = tab === 'licitaciones' || tab === 'normativa' || tab === 'estudio' || tab === 'desktop'
    ? tab : tenderParams.some((key) => params.has(key)) ? 'licitaciones' : 'normativa';
  let remembered = false;
  try { remembered = localStorage.getItem('lex_pwa_station_opened') === '1'; } catch { /* Storage can be unavailable. */ }
  return { activeTab, stationOpened: stationParams.some((key) => params.has(key)) || remembered };
}

export function App() {
  const [initialNavigation] = useState(readNavigation);
  const [stationOpened, setStationOpened] = useState(initialNavigation.stationOpened);
  const [activeTab, setActiveTab] = useState<AppModuleTab>(initialNavigation.activeTab);
  const beforeLeave = useRef<(() => Promise<boolean>) | null>(null);
  const acceptedUrl = useRef(window.location.href);
  const navigationRevision = useRef(0);
  const registerBeforeLeave = useCallback((guard: (() => Promise<boolean>) | null) => { beforeLeave.current = guard; }, []);
  const canNavigate = useCallback(async (nextTab: AppModuleTab | 'home') => {
    const revision = ++navigationRevision.current;
    if (stationOpened && activeTab === 'estudio' && nextTab !== 'estudio' && beforeLeave.current) {
      try { if (!(await beforeLeave.current())) return false; } catch { return false; }
    }
    return revision === navigationRevision.current;
  }, [activeTab, stationOpened]);

  const handleOpenStation = (targetTab?: AppModuleTab) => {
    try {
      localStorage.setItem('lex_pwa_station_opened', '1');
    } catch {
      /* noop */
    }
    trackEvent('station_enter', { target_tab: targetTab || 'normativa' });
    if (targetTab) {
      setActiveTab(targetTab);
      const url = new URL(window.location.href);
      if (targetTab === 'licitaciones') url.searchParams.set('tab', 'licitaciones');
      else if (targetTab === 'desktop') url.searchParams.set('tab', 'desktop');
      else if (targetTab === 'estudio') url.searchParams.set('tab', 'estudio');
      else url.searchParams.delete('tab');
      window.history.replaceState(null, '', url);
    }
    setStationOpened(true);
    acceptedUrl.current = window.location.href;
  };

  const handleTabChange = async (nextTab: AppModuleTab) => {
    if (!(await canNavigate(nextTab))) return;
    setActiveTab(nextTab);
    trackEvent('tab_change', { tab: nextTab });
    const url = new URL(window.location.href);
    if (nextTab === 'normativa') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', nextTab);
    }
    window.history.replaceState(null, '', url);
    acceptedUrl.current = window.location.href;
  };

  const handleGoHome = async () => {
    if (!(await canNavigate('home'))) return;
    try {
      localStorage.removeItem('lex_pwa_station_opened');
    } catch {
      /* noop */
    }
    trackEvent('home_return_click');
    const url = new URL(window.location.href);
    url.search = '';
    window.history.pushState(null, '', url);
    setStationOpened(false);
    acceptedUrl.current = window.location.href;
  };

  useEffect(() => {
    const onPopState = async () => {
      const requestedUrl = window.location.href;
      const next = readNavigation();
      if (!(await canNavigate(next.stationOpened ? next.activeTab : 'home'))) {
        // Keep the attempted entry available for Back after a successful retry.
        if (window.location.href === requestedUrl) window.history.pushState(null, '', acceptedUrl.current);
        return;
      }
      setActiveTab(next.activeTab);
      setStationOpened(next.stationOpened);
      acceptedUrl.current = requestedUrl;
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [canNavigate]);

  useEffect(() => {
    if (!stationOpened) {
      updateSeoMeta('home');
    } else {
      updateSeoMeta(activeTab);
    }
  }, [stationOpened, activeTab]);

  return (
    <ErrorBoundary>
      {!stationOpened ? (
        <Introduction onOpenStation={handleOpenStation} />
      ) : (
        <AppShell activeTab={activeTab} onTabChange={handleTabChange} onGoHome={handleGoHome}>
          {activeTab === 'normativa' ? (
            <BuscadorLegal />
          ) : activeTab === 'licitaciones' ? (
            <BuscadorLicitaciones />
          ) : activeTab === 'estudio' ? (
            <Suspense
              fallback={
                <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 p-8 text-slate-500">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-legal-gold border-t-transparent" />
                    <span>Preparando Ingeniería Jurídica…</span>
                  </div>
                </div>
              }
            >
              <DraftingStudio registerBeforeLeave={registerBeforeLeave} onNavigateToDesktop={() => handleTabChange('desktop')} />
            </Suspense>
          ) : (
            <Suspense
              fallback={
                <div className="flex min-h-[50vh] items-center justify-center p-8 text-slate-400">
                  <div className="flex items-center gap-2 text-xs font-medium">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-legal-gold border-t-transparent" />
                    <span>Cargando Estación Desktop...</span>
                  </div>
                </div>
              }
            >
              <DesktopPresentation />
            </Suspense>
          )}
        </AppShell>
      )}
      <Analytics
        beforeSend={(event) => {
          if (event && event.url) {
            return {
              ...event,
              url: sanitizeAnalyticsUrl(event.url),
            };
          }
          return event;
        }}
      />
      <SpeedInsights
        beforeSend={(data) => {
          if (data && data.url) {
            return {
              ...data,
              url: sanitizeAnalyticsUrl(data.url),
            };
          }
          return data;
        }}
      />
    </ErrorBoundary>
  );
}

export default App;
