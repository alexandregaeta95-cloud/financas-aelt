import { PixHistory, PixTransaction, PixTipo } from '../types';

export function normalizarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function formatarPix(valor: number): string {
  if (isNaN(valor)) return 'R$ 0,00';
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

export function extrairValor(texto: string): number {
  if (!texto) return 0;
  // Match patterns like R$ 100,00 or R$100.00 or 100,50
  const match = texto.match(/r\$\s*([\d.,]+)|(?:valor|pix)\s*de\s*r\$\s*([\d.,]+)|([\d.]+,\d{2})/i);
  if (match) {
    const rawVal = match[1] || match[2] || match[3];
    if (rawVal) {
      // Normalize brazilian currency format: "1.250,50" -> 1250.50
      let cleaned = rawVal.replace(/\./g, '').replace(',', '.');
      const num = parseFloat(cleaned);
      return isNaN(num) ? 0 : num;
    }
  }
  return 0;
}

export function identificarTipo(texto: string): PixTipo {
  const norm = normalizarTexto(texto);
  if (
    norm.includes('recebido') ||
    norm.includes('recebeu') ||
    norm.includes('credito') ||
    norm.includes('deposito') ||
    norm.includes('transferencia recebida') ||
    norm.includes('voce recebeu')
  ) {
    return 'RECEBIDO';
  }
  if (
    norm.includes('enviado') ||
    norm.includes('enviou') ||
    norm.includes('pago') ||
    norm.includes('pagamento') ||
    norm.includes('transferencia realizada') ||
    norm.includes('voce pagou') ||
    norm.includes('debito')
  ) {
    return 'ENVIADO';
  }
  return 'INDEFINIDO';
}

export function identificarBanco(texto: string, pacote?: string): string {
  const norm = normalizarTexto(texto + ' ' + (pacote || ''));
  if (norm.includes('nubank') || norm.includes('nu pagamentos')) return 'Nubank';
  if (norm.includes('itau') || norm.includes('iti')) return 'Itaú';
  if (norm.includes('bradesco') || norm.includes('next')) return 'Bradesco';
  if (norm.includes('santander')) return 'Santander';
  if (norm.includes('banco do brasil') || norm.includes('bb')) return 'Banco do Brasil';
  if (norm.includes('inter') || norm.includes('banco inter')) return 'Banco Inter';
  if (norm.includes('caixa')) return 'Caixa Econômica';
  if (norm.includes('c6') || norm.includes('c6bank')) return 'C6 Bank';
  if (norm.includes('picpay')) return 'PicPay';
  if (norm.includes('pagbank') || norm.includes('pagseguro')) return 'PagBank';
  if (norm.includes('mercado pago')) return 'Mercado Pago';
  return 'Outro Banco';
}

export function validarDuplicidade(pix: PixTransaction, historico: PixHistory[]): boolean {
  if (!historico || historico.length === 0) return false;
  
  // Checks if a transaction with same value, bank, and date/time or same text already exists within last 5 minutes
  return historico.some(h => {
    if (h.status === 'ERRO' || h.status === 'IGNORADO') return false;
    const mesmoValor = Math.abs(h.valor - pix.valor) < 0.01;
    const mesmoBanco = h.banco.toLowerCase() === pix.banco.toLowerCase();
    const mesmoTexto = normalizarTexto(h.textoRecebido) === normalizarTexto(pix.textoOriginal);
    return mesmoValor && mesmoBanco && mesmoTexto;
  });
}
