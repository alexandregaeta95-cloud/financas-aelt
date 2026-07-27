import { AssistantSettings, AssistantLogEntry } from '../types';
import { financialAssistant, FullAssistantAnalysis } from '../engine/financialAssistant';
import { Transaction } from '../../../types';
import { assistantLogger } from './assistantLogger';

const SETTINGS_STORAGE_KEY = 'wealthflow_assistant_settings';

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  ativarAssistente: true,
  ativarAlertas: true,
  ativarPrevisoes: true,
  ativarRecomendacoes: true,
  atualizarAutomaticamente: true,
  atualizarAoAbrir: true,
  atualizarDiariamente: true
};

export class AssistantService {
  private static instance: AssistantService;
  private settings: AssistantSettings = DEFAULT_ASSISTANT_SETTINGS;

  private constructor() {
    this.loadSettings();
    financialAssistant.inicializar();
  }

  public static getInstance(): AssistantService {
    if (!AssistantService.instance) {
      AssistantService.instance = new AssistantService();
    }
    return AssistantService.instance;
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_ASSISTANT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Erro ao carregar configurações do assistente', e);
    }
  }

  public getSettings(): AssistantSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<AssistantSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      assistantLogger.log('INFO' as any, 'Configurações do Assistente Inteligente atualizadas.');
    } catch (e) {
      console.error('Erro ao salvar configurações do assistente', e);
    }
  }

  public executarAnalise(transactions: Transaction[], initialAccountsTotal: number = 0): FullAssistantAnalysis {
    return financialAssistant.analisar(transactions, initialAccountsTotal);
  }

  public getLogs(): AssistantLogEntry[] {
    return assistantLogger.getLogs();
  }

  public clearLogs(): void {
    assistantLogger.clearLogs();
  }
}

export const assistantService = AssistantService.getInstance();
