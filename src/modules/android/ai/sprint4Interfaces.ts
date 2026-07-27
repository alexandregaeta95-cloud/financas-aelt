import {
  AiLearningEngine,
  CategoryPredictor,
  BankPatternAnalyzer,
  NotificationClassifier,
  SmartRules
} from '../types';

export class DefaultAiLearningEngine implements AiLearningEngine {
  public async treinarModelo(transacao: any, categoriaConfirmada: string): Promise<void> {
    console.log('[Sprint 4 AI Stub] Treinando modelo com:', transacao, categoriaConfirmada);
  }
}

export class DefaultCategoryPredictor implements CategoryPredictor {
  public async preverCategoria(texto: string, valor: number, banco: string): Promise<{ categoria: string; confianca: number }> {
    const t = texto.toLowerCase();
    if (t.includes('mercado') || t.includes('supermercado')) return { categoria: 'Alimentação', confianca: 92 };
    if (t.includes('uber') || t.includes('99') || t.includes('posto')) return { categoria: 'Transporte', confianca: 89 };
    if (t.includes('farmacia') || t.includes('drogaria')) return { categoria: 'Saúde', confianca: 90 };
    return { categoria: 'Outros', confianca: 70 };
  }
}

export class DefaultBankPatternAnalyzer implements BankPatternAnalyzer {
  public analisarPadrao(banco: string, texto: string): { padraoEncontrado: boolean; tipoOperacao: string } {
    const t = texto.toLowerCase();
    if (t.includes('recebeu') || t.includes('recebido')) return { padraoEncontrado: true, tipoOperacao: 'RECEITA' };
    if (t.includes('pago') || t.includes('enviado') || t.includes('transferiu')) return { padraoEncontrado: true, tipoOperacao: 'DESPESA' };
    return { padraoEncontrado: false, tipoOperacao: 'DESPESA' };
  }
}

export class DefaultNotificationClassifier implements NotificationClassifier {
  public async classificarNotificacao(texto: string): Promise<{ ehPix: boolean; confianca: number }> {
    const ehPix = texto.toLowerCase().includes('pix') || texto.toLowerCase().includes('r$');
    return { ehPix, confianca: ehPix ? 95 : 30 };
  }
}

export class DefaultSmartRules implements SmartRules {
  public async obterRegrasDinamicas(): Promise<any[]> {
    return [
      { id: 'rule-1', condicao: 'texto contem uber', categoria: 'Transporte' },
      { id: 'rule-2', condicao: 'texto contem iFood', categoria: 'Alimentação' }
    ];
  }
}

export const aiLearningEngine = new DefaultAiLearningEngine();
export const categoryPredictor = new DefaultCategoryPredictor();
export const bankPatternAnalyzer = new DefaultBankPatternAnalyzer();
export const notificationClassifier = new DefaultNotificationClassifier();
export const smartRules = new DefaultSmartRules();
