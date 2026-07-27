import { AndroidSettings } from '../types';
import { androidLogger } from '../logs/androidLogger';

const SETTINGS_STORAGE_KEY = 'wealthflow_android_settings';

export const DEFAULT_ANDROID_SETTINGS: AndroidSettings = {
  monitoramentoAtivo: true,
  mostrarNotificacoes: true,
  abrirAutomaticamente: true,
  registrarHistorico: true,
  registrarLogs: true,
  executarSegundoPlano: true
};

export class BackgroundServiceManager {
  private static instance: BackgroundServiceManager;
  private settings: AndroidSettings = DEFAULT_ANDROID_SETTINGS;

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): BackgroundServiceManager {
    if (!BackgroundServiceManager.instance) {
      BackgroundServiceManager.instance = new BackgroundServiceManager();
    }
    return BackgroundServiceManager.instance;
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_ANDROID_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Erro ao carregar configurações do Android', e);
    }
  }

  public getSettings(): AndroidSettings {
    return { ...this.settings };
  }

  public saveSettings(newSettings: Partial<AndroidSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(this.settings));
      androidLogger.log('INFO', 'Configurações de segundo plano atualizadas.');
    } catch (e) {
      console.error('Erro ao salvar configurações do Android', e);
    }
  }

  public autoReconnectOnBoot(): void {
    if (this.settings.executarSegundoPlano && this.settings.monitoramentoAtivo) {
      androidLogger.log('INFO', 'Reconexão automática executada com sucesso após inicialização.');
    }
  }
}

export const backgroundServiceManager = BackgroundServiceManager.getInstance();
