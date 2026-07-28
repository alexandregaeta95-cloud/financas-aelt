import { DocumentType } from '../types';

export class DocumentIdentifier {
  public static identificar(text: string): { type: DocumentType; confidence: number } {
    const txt = (text || '').toUpperCase();

    // Check PIX
    if (
      txt.includes('COMPROVANTE DE PAGAMENTO PIX') ||
      txt.includes('PIX RECEBIDO') ||
      txt.includes('COMPROVANTE PIX') ||
      txt.includes('CHAVE PIX') ||
      txt.includes('TRANSF.PIX') ||
      txt.includes('PAGAMENTO PIX')
    ) {
      return { type: 'COMPROVANTE_PIX', confidence: 96 };
    }

    // Check Boleto
    if (
      txt.includes('COMPROVANTE DE PAGAMENTO DE BOLETO') ||
      txt.includes('LINHA DIGITÁVEL') ||
      txt.includes('CÓDIGO DE BARRAS') ||
      txt.includes('CEDENTE') ||
      txt.includes('BENEFICIÁRIO') ||
      /\d{5}\.\d{5}\s\d{5}\.\d{6}/.test(text)
    ) {
      return { type: 'BOLETO', confidence: 94 };
    }

    // Check Credit Card Invoice
    if (
      txt.includes('FATURA DO CARTÃO') ||
      txt.includes('FATURA CARTAO') ||
      txt.includes('RESUMO DA FATURA') ||
      txt.includes('TOTAL DA FATURA') ||
      txt.includes('VENCIMENTO DA FATURA')
    ) {
      return { type: 'FATURA_CARTAO', confidence: 92 };
    }

    // Check Bank Statement
    if (
      txt.includes('EXTRATO BANCÁRIO') ||
      txt.includes('EXTRATO BANCARIO') ||
      txt.includes('EXTRATO CONTA CORRENTE') ||
      txt.includes('SALDO ANTERIOR') ||
      txt.includes('SALDO ATUAL') ||
      txt.includes('SALDO FINAL')
    ) {
      return { type: 'EXTRATO_BANCARIO', confidence: 90 };
    }

    // Check Tax Invoice / Receipt
    if (
      txt.includes('DANFE') ||
      txt.includes('NOTA FISCAL') ||
      txt.includes('NFC-E') ||
      txt.includes('CUPOM FISCAL') ||
      txt.includes('CHAVE DE ACESSO')
    ) {
      return { type: txt.includes('CUPOM') ? 'CUPOM_FISCAL' : 'NOTA_FISCAL', confidence: 93 };
    }

    // Check TED / DOC
    if (txt.includes('COMPROVANTE DE TED') || txt.includes('TRANSFERENCIA TED')) {
      return { type: 'TED', confidence: 95 };
    }
    if (txt.includes('COMPROVANTE DE DOC') || txt.includes('TRANSFERENCIA DOC')) {
      return { type: 'DOC', confidence: 95 };
    }

    // Check DARF / GPS
    if (txt.includes('DARF') || txt.includes('RECEITA FEDERAL')) {
      return { type: 'DARF', confidence: 92 };
    }
    if (txt.includes('GPS') || txt.includes('INSS')) {
      return { type: 'GPS', confidence: 92 };
    }

    return { type: 'DESCONHECIDO', confidence: 45 };
  }
}
