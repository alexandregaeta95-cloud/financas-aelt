import { NotificationFilterResult } from '../types';

export interface BankConfig {
  name: string;
  packageNames: string[];
  keywords: string[];
}

export const MONITORED_BANKS: BankConfig[] = [
  { name: 'Nubank', packageNames: ['com.nu.production'], keywords: ['nubank', 'nu bank'] },
  { name: 'Banco do Brasil', packageNames: ['br.com.bb.android'], keywords: ['banco do brasil', 'bb'] },
  { name: 'Caixa', packageNames: ['br.gov.caixa.tem', 'br.com.gft.mobi.caixa'], keywords: ['caixa', 'caixatem'] },
  { name: 'Itaú', packageNames: ['com.itau'], keywords: ['itaú', 'itau'] },
  { name: 'Bradesco', packageNames: ['com.bradesco'], keywords: ['bradesco'] },
  { name: 'Santander', packageNames: ['com.santander.app'], keywords: ['santander'] },
  { name: 'Inter', packageNames: ['br.com.intermedium'], keywords: ['inter', 'banco inter'] },
  { name: 'C6 Bank', packageNames: ['com.c6bank.app'], keywords: ['c6', 'c6bank', 'c6 bank'] },
  { name: 'Sicredi', packageNames: ['br.com.sicredi.mobile'], keywords: ['sicredi'] },
  { name: 'Sicoob', packageNames: ['br.com.sicoob.mobile'], keywords: ['sicoob'] },
  { name: 'Mercado Pago', packageNames: ['com.mercadopago.wallet'], keywords: ['mercado pago', 'mercadopago'] },
  { name: 'PicPay', packageNames: ['com.picpay'], keywords: ['picpay'] },
  { name: 'PagBank', packageNames: ['br.com.uol.ps.myaccount'], keywords: ['pagbank', 'pagseguro'] },
  { name: 'Neon', packageNames: ['br.com.neon'], keywords: ['neon', 'banco neon'] },
  { name: 'Banco PAN', packageNames: ['br.com.pan.bancopan'], keywords: ['pan', 'banco pan'] }
];

export const FINANCIAL_KEYWORDS = [
  'pix',
  'recebido',
  'enviado',
  'transferência',
  'transferencia',
  'pagamento',
  'recebimento',
  'valor',
  'r$'
];

export function filterFinancialNotification(packageName: string, title: string, text: string): NotificationFilterResult {
  const fullContent = `${title} ${text}`.toLowerCase();
  
  // Check financial keywords
  const matchedKeyword = FINANCIAL_KEYWORDS.find(kw => fullContent.includes(kw));
  if (!matchedKeyword) {
    return { isFinancial: false };
  }

  // Detect Bank
  let detectedBank: string | undefined;
  
  // Try package name first
  const bankByPackage = MONITORED_BANKS.find(b => b.packageNames.includes(packageName));
  if (bankByPackage) {
    detectedBank = bankByPackage.name;
  } else {
    // Try keywords in text
    const bankByKeyword = MONITORED_BANKS.find(b => b.keywords.some(kw => fullContent.includes(kw)));
    if (bankByKeyword) {
      detectedBank = bankByKeyword.name;
    }
  }

  return {
    isFinancial: true,
    keywordMatch: matchedKeyword,
    bankDetected: detectedBank || 'Banco Desconhecido'
  };
}
