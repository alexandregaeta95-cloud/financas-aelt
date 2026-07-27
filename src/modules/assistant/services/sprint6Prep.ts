import {
  VoiceAssistant,
  OCRProcessor,
  DocumentReader,
  InvoiceReader,
  ReceiptScanner,
  CreditCardAnalyzer,
  InvestmentAdvisor,
  OpenFinanceConnector,
  BankSyncEngine
} from '../types';

export class DefaultVoiceAssistant implements VoiceAssistant {
  public async processarComandoVoz(audioBlobBase64: string): Promise<{ comando: string; acaoExecutada: string }> {
    console.log('[Sprint 6 VoiceAssistant Prep]', audioBlobBase64.substring(0, 30));
    return {
      comando: 'Adicionar despesa de R$ 50 no iFood',
      acaoExecutada: 'Lançamento de despesa registrado com sucesso.'
    };
  }
}

export class DefaultOCRProcessor implements OCRProcessor {
  public async processarImagem(imagemBase64: string): Promise<{ textoExtraido: string; confianca: number }> {
    console.log('[Sprint 6 OCRProcessor Prep]', imagemBase64.substring(0, 30));
    return {
      textoExtraido: 'COMPROVANTE DE PAGAMENTO PIX R$ 120,00 MERCADO SILVA',
      confianca: 94
    };
  }
}

export class DefaultDocumentReader implements DocumentReader {
  public async lerDocumento(pdfBase64: string): Promise<{ dadosFinanceiros: any }> {
    console.log('[Sprint 6 DocumentReader Prep]', pdfBase64.substring(0, 30));
    return {
      dadosFinanceiros: {
        tipo: 'BOLETO',
        cedente: 'ENEL DISTRIBUIÇÃO',
        valor: 185.4,
        vencimento: '2026-08-10'
      }
    };
  }
}

export class DefaultInvoiceReader implements InvoiceReader {
  public async lerFaturaCartao(faturaBase64: string): Promise<{ total: number; vencimento: string; itens: any[] }> {
    console.log('[Sprint 6 InvoiceReader Prep]', faturaBase64.substring(0, 30));
    return {
      total: 2450.8,
      vencimento: '2026-08-05',
      itens: [
        { descricao: 'UBER *TRIP', valor: 32.5, categoria: 'Transporte' },
        { descricao: 'IFOOD *RESTAURANTE', valor: 68.9, categoria: 'Alimentação' }
      ]
    };
  }
}

export class DefaultReceiptScanner implements ReceiptScanner {
  public async escanearComprovante(comprovanteBase64: string): Promise<{ valor: number; estabelecimento: string; data: string }> {
    console.log('[Sprint 6 ReceiptScanner Prep]', comprovanteBase64.substring(0, 30));
    return {
      valor: 45.9,
      estabelecimento: 'FARMACIA DROGASIL',
      data: new Date().toISOString().split('T')[0]
    };
  }
}

export class DefaultCreditCardAnalyzer implements CreditCardAnalyzer {
  public async analisarGastosCartao(faturas: any[]): Promise<{ limiteRecomendado: number; riscoEndividamento: string }> {
    console.log('[Sprint 6 CreditCardAnalyzer Prep]', faturas.length);
    return {
      limiteRecomendado: 5000,
      riscoEndividamento: 'BAIXO'
    };
  }
}

export class DefaultInvestmentAdvisor implements InvestmentAdvisor {
  public async gerarSugestaoInvestimento(perfil: string, reservaLiquida: number): Promise<{ sugestoes: any[] }> {
    console.log('[Sprint 6 InvestmentAdvisor Prep]', perfil, reservaLiquida);
    return {
      sugestoes: [
        { produto: 'CDB 110% CDI', alocacao: '60%', risco: 'Baixo' },
        { produto: 'Tesouro IPCA+ 2035', alocacao: '40%', risco: 'Baixo' }
      ]
    };
  }
}

export class DefaultOpenFinanceConnector implements OpenFinanceConnector {
  public async conectarBanco(provedor: string): Promise<{ statusConexao: string; contasImportadas: number }> {
    console.log('[Sprint 6 OpenFinanceConnector Prep]', provedor);
    return {
      statusConexao: 'CONECTADO',
      contasImportadas: 2
    };
  }
}

export class DefaultBankSyncEngine implements BankSyncEngine {
  public async sincronizarExtrato(contaId: string): Promise<{ transacoesNovas: number }> {
    console.log('[Sprint 6 BankSyncEngine Prep]', contaId);
    return {
      transacoesNovas: 5
    };
  }
}

export const defaultVoiceAssistant = new DefaultVoiceAssistant();
export const defaultOCRProcessor = new DefaultOCRProcessor();
export const defaultDocumentReader = new DefaultDocumentReader();
export const defaultInvoiceReader = new DefaultInvoiceReader();
export const defaultReceiptScanner = new DefaultReceiptScanner();
export const defaultCreditCardAnalyzer = new DefaultCreditCardAnalyzer();
export const defaultInvestmentAdvisor = new DefaultInvestmentAdvisor();
export const defaultOpenFinanceConnector = new DefaultOpenFinanceConnector();
export const defaultBankSyncEngine = new DefaultBankSyncEngine();
