import { AnalyticsSettings } from '../types';

const SETTINGS_KEY = 'gaeta_analytics_settings_v1';

const defaultSettings: AnalyticsSettings = {
  atualizacaoAutomatica: true,
  atualizacaoEmSegundoPlano: true,
  intervaloAtualizacaoSegundos: 30,
  temaGraficos: 'DEFAULT',
  cacheInteligente: true,
  cardsVisibleOrder: [
    { id: 'kpis', title: 'Indicadores Principais (KPIs)', visible: true, order: 1, width: 'FULL' },
    { id: 'fluxoCaixa', title: 'Fluxo de Caixa Mensal', visible: true, order: 2, width: 'HALF' },
    { id: 'categorias', title: 'Distribuição por Categoria', visible: true, order: 3, width: 'HALF' },
    { id: 'alertas', title: 'Central de Alertas e Inteligência', visible: true, order: 4, width: 'FULL' },
    { id: 'paineisEspecializados', title: 'Painéis Especializados (Veículos, PIX, OCR, Metas)', visible: true, order: 5, width: 'FULL' },
    { id: 'previsao', title: 'Previsão e Evolução Patrimonial', visible: true, order: 6, width: 'FULL' },
  ],
};

class AnalyticsSettingsService {
  public getSettings(): AnalyticsSettings {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch {
      // fallback
    }
    return defaultSettings;
  }

  public saveSettings(settings: AnalyticsSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  public restoreDefault(): AnalyticsSettings {
    this.saveSettings(defaultSettings);
    return defaultSettings;
  }
}

export const analyticsSettingsService = new AnalyticsSettingsService();
