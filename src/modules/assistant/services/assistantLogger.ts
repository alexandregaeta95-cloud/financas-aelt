import { AssistantLogEntry } from '../types';

const ASSISTANT_LOGS_KEY = 'wealthflow_assistant_logs';
const MAX_LOGS = 200;

export class AssistantLogger {
  private static instance: AssistantLogger;
  private logs: AssistantLogEntry[] = [];

  private constructor() {
    this.loadLogs();
  }

  public static getInstance(): AssistantLogger {
    if (!AssistantLogger.instance) {
      AssistantLogger.instance = new AssistantLogger();
    }
    return AssistantLogger.instance;
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(ASSISTANT_LOGS_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar logs do Assistente', e);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      localStorage.setItem(ASSISTANT_LOGS_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Erro ao salvar logs do Assistente', e);
    }
  }

  public log(
    event: AssistantLogEntry['event'],
    message: string,
    processingTimeMs?: number,
    details?: any
  ): AssistantLogEntry {
    const entry: AssistantLogEntry = {
      id: `ast-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event,
      message,
      processingTimeMs,
      details
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveLogs();
    return entry;
  }

  public getLogs(): AssistantLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
}

export const assistantLogger = AssistantLogger.getInstance();
