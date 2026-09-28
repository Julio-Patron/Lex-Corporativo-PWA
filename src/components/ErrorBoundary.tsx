import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State;
  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-premium text-center space-y-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-500 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900">No se pudo mostrar esta pantalla</h2>
              <p className="text-sm text-slate-500">
                Recarga la aplicación. Tus consultas pueden retomarse desde los filtros presentes en la URL.
              </p>
              {this.state.error && (
                <details className="text-left mt-4 p-3 rounded-lg bg-slate-50 text-[11px] font-mono text-red-600">
                  <summary className="cursor-pointer font-medium text-slate-700">Detalles técnicos</summary>
                  <pre className="mt-2 whitespace-pre-wrap break-words">{this.state.error.message}</pre>
                  <pre className="mt-2 whitespace-pre-wrap break-words text-[10px] text-slate-500">{this.state.error.stack}</pre>
                </details>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-legal-gold py-2 text-sm font-bold text-slate-950 shadow-card transition hover:bg-legal-goldhover"
              >
                <RefreshCw size={16} />
                <span>Reintentar</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                <Home size={16} />
                <span>Volver al buscador</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400">
              Si el problema persiste, recarga la página (Ctrl+R / Cmd+R).
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
