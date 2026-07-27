import React from 'react';

interface Props {
  children: React.ReactNode;
  moduleName?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleResetStorage = () => {
    if (window.confirm("Deseja redefinir o cache de dados local do aplicativo para corrigir o erro? Seus dados sincronizados na nuvem permanecem seguros.")) {
      try {
        localStorage.removeItem('wealthflow_transactions');
        localStorage.removeItem('wealthflow_registered_vehicles');
      } catch (e) {
        console.error("Erro ao limpar localStorage:", e);
      }
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      const moduleName = this.props.moduleName || 'Abastecimento';

      return (
        <div className="min-h-[400px] w-full flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-lg w-full text-center space-y-6 shadow-2xl animate-fade-in">
            <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto text-rose-400 shadow-inner">
              <span className="material-symbols-outlined text-3xl">warning</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white font-display">
                Aviso no Módulo {moduleName}
              </h3>
              <p className="text-xs text-slate-400 font-sans leading-relaxed">
                Ocorreu um erro inesperado ao renderizar esta tela no seu dispositivo. Nenhuma informação foi perdida.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleRetry}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-3 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                Tentar Novamente
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-3 px-4 rounded-xl transition-all border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">cleaning_services</span>
                Resetar Cache Local
              </button>
            </div>

            {/* Collapsible Error Info for Debugging */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-400 underline transition-colors cursor-pointer"
              >
                {this.state.showDetails ? 'Ocultar Detalhes Técnicos' : 'Ver Detalhes Técnicos'}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 text-left bg-slate-950 border border-slate-800 p-3 rounded-xl overflow-x-auto text-[10px] font-mono text-rose-300 max-h-40 leading-tight">
                  <p className="font-bold mb-1">{this.state.error?.toString()}</p>
                  <pre className="text-slate-500 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
