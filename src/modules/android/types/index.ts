export interface NativeNotificationPayload {
  id: string;
  packageName: string;
  bankName: string;
  title: string;
  text: string;
  subText?: string;
  timestamp: string;
}

export interface NotificationFilterResult {
  isFinancial: boolean;
  keywordMatch?: string;
  bankDetected?: string;
}

export interface AndroidServiceStatus {
  isRunning: boolean;
  permissionGranted: boolean;
  backgroundExecutionAllowed: boolean;
  autoStartEnabled: boolean;
  lastNotificationTimestamp?: string;
}

export interface AndroidLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  event: 'INFO' | 'NOTIFICATION_RECEIVED' | 'BANK_IDENTIFIED' | 'VALUE_IDENTIFIED' | 'PARSER_ERROR' | 'DUPLICATE_DETECTED' | 'PERMISSION_DENIED' | 'PROCESSING_TIME';
  message: string;
  processingTimeMs?: number;
  details?: any;
}

export interface AndroidSettings {
  monitoramentoAtivo: boolean;
  mostrarNotificacoes: boolean;
  abrirAutomaticamente: boolean;
  registrarHistorico: boolean;
  registrarLogs: boolean;
  executarSegundoPlano: boolean;
}

// Sprint 4 AI Preparation Interfaces
export interface AiLearningEngine {
  treinarModelo(transacao: any, categoriaConfirmada: string): Promise<void>;
}

export interface CategoryPredictor {
  preverCategoria(texto: string, valor: number, banco: string): Promise<{ categoria: string; confianca: number }>;
}

export interface BankPatternAnalyzer {
  analisarPadrao(banco: string, texto: string): { padraoEncontrado: boolean; tipoOperacao: string };
}

export interface NotificationClassifier {
  classificarNotificacao(texto: string): Promise<{ ehPix: boolean; confianca: number }>;
}

export interface SmartRules {
  obterRegrasDinamicas(): Promise<any[]>;
}
