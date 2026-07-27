import { ExtractionResult, PixReceipt } from '../types';

export class PixReceiptParser {
  public static parse(rawText: string): ExtractionResult<PixReceipt> {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const textUpper = rawText.toUpperCase();

    // Determine type
    let tipoPix: PixReceipt['tipoPix'] = 'ENVIADO';
    if (textUpper.includes('RECEBIDO') || textUpper.includes('PIX RECEBIDO')) {
      tipoPix = 'RECEBIDO';
    } else if (textUpper.includes('QR CODE') || textUpper.includes('PIX QR')) {
      tipoPix = 'QR_CODE';
    } else if (textUpper.includes('COPIA E COLA') || textUpper.includes('COPIABIL')) {
      tipoPix = 'COPIA_E_COLA';
    }

    // Extract Amount (Valor)
    let valor = 0;
    const valorMatch = rawText.match(/R\$\s*([\d\.,]+)/i) || rawText.match(/VALOR[:\s]*([\d\.,]+)/i);
    if (valorMatch) {
      const vStr = valorMatch[1].replace(/\./g, '').replace(',', '.');
      valor = parseFloat(vStr) || 0;
    }

    // Extract Favorecido / Remetente
    let favorecidoOuRemetente = 'Não identificado';
    const favMatch =
      rawText.match(/(?:DESTINATÁRIO|FAVORECIDO|NOME|RECEBEDOR|NOME DO FAVORECIDO)[:\s]+([^\n]+)/i) ||
      rawText.match(/(?:PAGO PARA|PARA)[:\s]+([^\n]+)/i);
    if (favMatch) {
      favorecidoOuRemetente = favMatch[1].trim();
    }

    // Extract CPF/CNPJ
    let cpfCnpj: string | undefined;
    const cpfMatch = rawText.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/) || rawText.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    if (cpfMatch) {
      cpfCnpj = cpfMatch[0];
    }

    // Extract Bank / Institution
    let institucaoBancaria = 'Instituição Financeira';
    const bankMatch = rawText.match(/(?:INSTITUIÇÃO|BANCO|INSTITUIÇÃO FINANCEIRA)[:\s]+([^\n]+)/i);
    if (bankMatch) {
      institucaoBancaria = bankMatch[1].trim();
    } else if (textUpper.includes('NUBANK')) institucaoBancaria = 'Nu Pagamentos S.A.';
    else if (textUpper.includes('ITAÚ') || textUpper.includes('ITAU')) institucaoBancaria = 'Itaú Unibanco';
    else if (textUpper.includes('BRADESCO')) institucaoBancaria = 'Banco Bradesco S.A.';
    else if (textUpper.includes('SANTANDER')) institucaoBancaria = 'Banco Santander Brasil';
    else if (textUpper.includes('INTER')) institucaoBancaria = 'Banco Inter S.A.';
    else if (textUpper.includes('BANCO DO BRASIL') || textUpper.includes('BB S.A.')) institucaoBancaria = 'Banco do Brasil S.A.';
    else if (textUpper.includes('CAIXA')) institucaoBancaria = 'Caixa Econômica Federal';
    else if (textUpper.includes('MERCADO PAGO')) institucaoBancaria = 'Mercado Pago IP Ltda';

    // Extract TXID / Authentication
    let txidOrAutenticacao = 'TXID-' + Date.now().toString(36).toUpperCase();
    const txidMatch = rawText.match(/(?:ID|AUTENTICAÇÃO|TXID|CÓDIGO DA TRANSAÇÃO)[:\s]+([A-Za-z0-9\.-]+)/i);
    if (txidMatch) {
      txidOrAutenticacao = txidMatch[1].trim();
    }

    // Extract Date / Time
    let dataHora = new Date().toISOString().substring(0, 10);
    const dateMatch = rawText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('/');
      dataHora = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const data: PixReceipt = {
      tipoPix,
      valor,
      favorecidoOuRemetente,
      cpfCnpj,
      institucaoBancaria,
      txidOrAutenticacao,
      dataHora,
      descricao: `Pix ${tipoPix === 'RECEBIDO' ? 'Recebido de' : 'Enviado para'} ${favorecidoOuRemetente}`
    };

    return {
      data,
      confidenceFields: {
        tipoPix: 95,
        valor: valor > 0 ? 98 : 40,
        favorecidoOuRemetente: favorecidoOuRemetente !== 'Não identificado' ? 90 : 50,
        cpfCnpj: cpfCnpj ? 95 : 30,
        institucaoBancaria: 88,
        txidOrAutenticacao: 85,
        dataHora: 90,
        chavePix: 50,
        descricao: 90
      },
      lowConfidenceAlerts: valor === 0 ? ['Valor da transação PIX não identificado com certeza.'] : []
    };
  }
}
