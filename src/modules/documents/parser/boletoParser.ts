import { BoletoData, ExtractionResult } from '../types';

export class BoletoParser {
  public static parse(rawText: string): ExtractionResult<BoletoData> {
    const textUpper = (rawText || '').toUpperCase();

    // Extract Linha Digitável (47 or 48 digits)
    let linhaDigitavel = '';
    const linhaMatch = rawText.match(/\b\d{5}\.\d{5}\s\d{5}\.\d{6}\s\d{5}\.\d{6}\s\d\s\d{14}\b/) ||
      rawText.match(/\b\d{47,48}\b/) ||
      rawText.match(/(\d[\d\.\s]{45,55}\d)/);
    if (linhaMatch) {
      linhaDigitavel = linhaMatch[0].replace(/[\.\s]/g, '');
    }

    // Extract Barcode
    const codigoBarras = linhaDigitavel.length >= 44 ? linhaDigitavel.substring(0, 44) : linhaDigitavel;

    // Beneficiário
    let beneficiario = 'Beneficiário não identificado';
    const benMatch = rawText.match(/(?:BENEFICIÁRIO|CEDENTE|NOME DO BENEFICIÁRIO|NOME)[:\s]+([^\n]+)/i);
    if (benMatch) {
      beneficiario = benMatch[1].trim();
    }

    // Valor
    let valor = 0;
    const valorMatch = rawText.match(/(?:VALOR|VALOR DO DOCUMENTO|VALOR COBRADO)[:\s]*R?\$\s*([\d\.,]+)/i) ||
      rawText.match(/R\$\s*([\d\.,]+)/i);
    if (valorMatch) {
      const vStr = valorMatch[1].replace(/\./g, '').replace(',', '.');
      valor = parseFloat(vStr) || 0;
    }

    // Vencimento
    let dataVencimento = new Date().toISOString().substring(0, 10);
    const vencMatch = rawText.match(/(?:VENCIMENTO|DATA DE VENCIMENTO)[:\s]*(\d{2}\/\d{2}\/\d{4})/i) ||
      rawText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (vencMatch) {
      const [d, m, y] = vencMatch[1].split('/');
      dataVencimento = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Banco Emissor
    let bancoEmissor = 'Banco Emissor';
    if (textUpper.includes('BRADESCO') || linhaDigitavel.startsWith('237')) bancoEmissor = 'Banco Bradesco';
    else if (textUpper.includes('ITAÚ') || textUpper.includes('ITAU') || linhaDigitavel.startsWith('341')) bancoEmissor = 'Itaú Unibanco';
    else if (textUpper.includes('SANTANDER') || linhaDigitavel.startsWith('033')) bancoEmissor = 'Banco Santander';
    else if (textUpper.includes('BANCO DO BRASIL') || linhaDigitavel.startsWith('001')) bancoEmissor = 'Banco do Brasil';
    else if (textUpper.includes('CAIXA') || linhaDigitavel.startsWith('104')) bancoEmissor = 'Caixa Econômica Federal';
    else if (textUpper.includes('SICOOB') || linhaDigitavel.startsWith('756')) bancoEmissor = 'Sicoob';

    const data: BoletoData = {
      linhaDigitavel: linhaDigitavel || '34191.79001 01043.510047 91020.150008 8 91230000010000',
      codigoBarras,
      beneficiario,
      valor,
      dataVencimento,
      bancoEmissor
    };

    return {
      data,
      confidenceFields: {
        linhaDigitavel: linhaDigitavel ? 95 : 40,
        codigoBarras: codigoBarras ? 90 : 30,
        beneficiario: beneficiario !== 'Beneficiário não identificado' ? 88 : 45,
        valor: valor > 0 ? 98 : 35,
        dataVencimento: 90,
        bancoEmissor: 85,
        cpfCnpjBeneficiario: 20,
        dataEmissao: 30,
        multaJurosEstimado: 20
      },
      lowConfidenceAlerts: [
        ...(valor === 0 ? ['Valor do boleto não identificado com clareza.'] : []),
        ...(!linhaDigitavel ? ['Linha digitável não identificada. Por favor confirme os números.'] : [])
      ]
    };
  }
}
