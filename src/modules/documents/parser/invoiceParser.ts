import { ExtractionResult, InvoiceData } from '../types';

export class InvoiceParser {
  public static parse(rawText: string): ExtractionResult<InvoiceData> {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

    let estabelecimento = 'Estabelecimento Comercial';
    if (lines.length > 0) {
      estabelecimento = lines[0].substring(0, 50);
    }

    // CNPJ
    let cnpj: string | undefined;
    const cnpjMatch = rawText.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
    if (cnpjMatch) {
      cnpj = cnpjMatch[0];
    }

    // Total Amount
    let valorTotal = 0;
    const totalMatch = rawText.match(/(?:TOTAL|VALOR TOTAL|TOTAL R\$|VALOR PAGO)[:\s]*R?\$\s*([\d\.,]+)/i) ||
      rawText.match(/R\$\s*([\d\.,]+)/i);
    if (totalMatch) {
      const vStr = totalMatch[1].replace(/\./g, '').replace(',', '.');
      valorTotal = parseFloat(vStr) || 0;
    }

    // Date
    let dataEmissao = new Date().toISOString().substring(0, 10);
    const dateMatch = rawText.match(/\b(\d{2}\/\d{2}\/\d{4})\b/);
    if (dateMatch) {
      const [d, m, y] = dateMatch[1].split('/');
      dataEmissao = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    // Items line extraction
    const itens: InvoiceData['itens'] = [];
    lines.forEach((line) => {
      const itemMatch = line.match(/^(.+?)\s+(\d+)\s*x\s*([\d\.,]+)\s+([\d\.,]+)$/i) ||
        line.match(/^(.+?)\s+R?\$\s*([\d\.,]+)$/i);
      if (itemMatch && !line.toUpperCase().includes('TOTAL') && !line.toUpperCase().includes('SUBTOTAL')) {
        const desc = itemMatch[1].trim();
        const valStr = (itemMatch[4] || itemMatch[2] || '0').replace(/\./g, '').replace(',', '.');
        const val = parseFloat(valStr);
        if (val > 0 && desc.length > 2) {
          itens.push({
            descricao: desc,
            quantidade: 1,
            valorUnitario: val,
            valorTotal: val,
            categoriaSugerida: 'Alimentação / Compras'
          });
        }
      }
    });

    if (itens.length === 0 && valorTotal > 0) {
      itens.push({
        descricao: `Compra em ${estabelecimento}`,
        quantidade: 1,
        valorUnitario: valorTotal,
        valorTotal: valorTotal,
        categoriaSugerida: 'Outros'
      });
    }

    const data: InvoiceData = {
      estabelecimento,
      cnpj,
      valorTotal,
      dataEmissao,
      formaPagamento: 'CARTAO_CREDITO',
      itens
    };

    return {
      data,
      confidenceFields: {
        numeroNota: 50,
        estabelecimento: 85,
        cnpj: cnpj ? 95 : 30,
        valorTotal: valorTotal > 0 ? 95 : 40,
        dataEmissao: 90,
        formaPagamento: 80,
        itens: itens.length > 0 ? 85 : 40
      },
      lowConfidenceAlerts: valorTotal === 0 ? ['Valor total da nota/cupom fiscal não reconhecido.'] : []
    };
  }
}
