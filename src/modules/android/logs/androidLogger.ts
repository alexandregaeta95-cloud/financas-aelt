import { AndroidLogEntry } from '../types';

const LOGS_STORAGE_KEY = 'wealthflow_android_logs';
const MAX_LOGS = 200;

export class AndroidLogger {
  private static instance: AndroidLogger;
  private logs: AndroidLogEntry[] = [];

  private constructor() {
    this.loadLogs();
  }

  public static getInstance(): AndroidLogger {
    if (!AndroidLogger.instance) {
      AndroidLogger.instance = new AndroidLogger();
    }
    return AndroidLogger.instance;
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar logs do Android', e);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Erro ao salvar logs do Android', e);
    }
  }

  public log(
    event: AndroidLogEntry['event'],
    message: string,
    level: AndroidLogEntry['level'] = 'INFO',
    details?: any,
    processingTimeMs?: number
  ): AndroidLogEntry {
    const entry: AndroidLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      level,
      event,
      message,
      details,
      processingTimeMs
    };

    this.logs.unshift(entry);
    if (this.logs.length > MAX_LOGS) {
      this.logs = this.logs.slice(0, MAX_LOGS);
    }

    this.saveLogs();
    return entry;
  }

  public getLogs(): AndroidLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
}

export const androidLogger = AndroidLogger.getInstance();
