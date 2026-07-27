export type PixErrorType =
  | 'ERRO_LEITURA'
  | 'ERRO_INTERPRETACAO'
  | 'ERRO_GRAVACAO'
  | 'ERRO_ABERTURA_TELA';

export interface PixLogEntry {
  id: string;
  timestamp: string;
  tipo: PixErrorType | 'INFO';
  mensagem: string;
  detalhes?: any;
}

export class PixLoggerService {
  private static STORAGE_KEY = 'wealthflow_pix_logs';

  static logError(tipo: PixErrorType, mensagem: string, detalhes?: any) {
    const entry: PixLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      tipo,
      mensagem,
      detalhes
    };
    console.error(`[PixAssistant - ${tipo}] ${mensagem}`, detalhes || '');
    this.salvarLog(entry);
  }

  static logInfo(mensagem: string, detalhes?: any) {
    const entry: PixLogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
      timestamp: new Date().toISOString(),
      tipo: 'INFO',
      mensagem,
      detalhes
    };
    console.log(`[PixAssistant - INFO] ${mensagem}`, detalhes || '');
    this.salvarLog(entry);
  }

  private static salvarLog(entry: PixLogEntry) {
    try {
      const logs = this.obterLogs();
      logs.unshift(entry);
      // Keep last 100 logs
      const trimmed = logs.slice(0, 100);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Falha ao salvar log do PIX no localStorage:', e);
    }
  }

  static obterLogs(): PixLogEntry[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  static limparLogs() {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const pixLogger = PixLoggerService;
