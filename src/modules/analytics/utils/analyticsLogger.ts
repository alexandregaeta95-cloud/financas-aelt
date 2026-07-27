export interface AnalyticsLogEntry {
  id: string;
  timestamp: string;
  tipo: 'CARREGAMENTO' | 'ATUALIZACAO' | 'ERRO' | 'EXPORTACAO' | 'FILTRO' | 'RELATORIO';
  detalhes: string;
  duracaoMs?: number;
  sucesso: boolean;
}

const LOGS_STORAGE_KEY = 'gaeta_analytics_logs_v1';

class AnalyticsLogger {
  private logs: AnalyticsLogEntry[] = [];

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch {
      this.logs = [];
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs.slice(-200)));
    } catch {
      // ignore
    }
  }

  public log(
    tipo: AnalyticsLogEntry['tipo'],
    detalhes: string,
    sucesso = true,
    duracaoMs?: number
  ): void {
    const entry: AnalyticsLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      tipo,
      detalhes,
      sucesso,
      duracaoMs,
    };
    this.logs.unshift(entry);
    this.saveLogs();
  }

  public getLogs(): AnalyticsLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    localStorage.removeItem(LOGS_STORAGE_KEY);
  }
}

export const analyticsLogger = new AnalyticsLogger();
