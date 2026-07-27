export interface OCRLogEntry {
  id: string;
  timestamp: string;
  event: 'OCR_EXECUTED' | 'DOCUMENT_IDENTIFIED' | 'IMPORT_CONFIRMED' | 'IMPORT_CANCELLED' | 'OCR_ERROR' | 'RECONCILIATION_RUN';
  message: string;
  documentType?: string;
  processingTimeMs?: number;
  details?: any;
}

const OCR_LOGS_KEY = 'wealthflow_ocr_logs';
const MAX_LOGS = 200;

export class OCRLogger {
  private static instance: OCRLogger;
  private logs: OCRLogEntry[] = [];

  private constructor() {
    this.loadLogs();
  }

  public static getInstance(): OCRLogger {
    if (!OCRLogger.instance) {
      OCRLogger.instance = new OCRLogger();
    }
    return OCRLogger.instance;
  }

  private loadLogs(): void {
    try {
      const stored = localStorage.getItem(OCR_LOGS_KEY);
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar logs do OCR', e);
      this.logs = [];
    }
  }

  private saveLogs(): void {
    try {
      localStorage.setItem(OCR_LOGS_KEY, JSON.stringify(this.logs));
    } catch (e) {
      console.error('Erro ao salvar logs do OCR', e);
    }
  }

  public log(
    event: OCRLogEntry['event'],
    message: string,
    documentType?: string,
    processingTimeMs?: number,
    details?: any
  ): OCRLogEntry {
    const entry: OCRLogEntry = {
      id: `ocr-log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      event,
      message,
      documentType,
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

  public getLogs(): OCRLogEntry[] {
    return [...this.logs];
  }

  public clearLogs(): void {
    this.logs = [];
    this.saveLogs();
  }
}

export const ocrLogger = OCRLogger.getInstance();
