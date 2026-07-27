import { DocumentSettings } from '../types';

const SETTINGS_KEY = 'wealthflow_document_settings';

export const defaultDocumentSettings: DocumentSettings = {
  ativarOCR: true,
  importacaoAutomatica: false,
  melhoriaAutomaticaImagem: true,
  conciliacaoAutomatica: true,
  prepararOpenFinance: true,
  salvarHistoricoOCR: true
};

export class DocumentSettingsService {
  private static instance: DocumentSettingsService;
  private settings: DocumentSettings = { ...defaultDocumentSettings };

  private constructor() {
    this.loadSettings();
  }

  public static getInstance(): DocumentSettingsService {
    if (!DocumentSettingsService.instance) {
      DocumentSettingsService.instance = new DocumentSettingsService();
    }
    return DocumentSettingsService.instance;
  }

  public getSettings(): DocumentSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<DocumentSettings>): DocumentSettings {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    return this.getSettings();
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        this.settings = { ...defaultDocumentSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Erro ao carregar configurações de documentos/OCR:', e);
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.error('Erro ao salvar configurações de documentos/OCR:', e);
    }
  }
}

export const documentSettingsService = DocumentSettingsService.getInstance();
