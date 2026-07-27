export type DocumentType =
  | 'COMPROVANTE_PIX'
  | 'TED'
  | 'DOC'
  | 'BOLETO'
  | 'NOTA_FISCAL'
  | 'CUPOM_FISCAL'
  | 'FATURA_CARTAO'
  | 'EXTRATO_BANCARIO'
  | 'DARF'
  | 'GPS'
  | 'DESCONHECIDO';

export type PaymentMethodType = 'PIX' | 'BOLETO' | 'CARTAO_CREDITO' | 'TED' | 'DOC' | 'DINHEIRO' | 'OUTROS';

export interface OCRResult {
  id: string;
  rawText: string;
  confidence: number;
  processingTimeMs: number;
  documentType: DocumentType;
  enhancedImageUrl?: string;
  timestamp: string;
}

export interface ExtractionResult<T> {
  data: T;
  confidenceFields: Record<keyof T, number>;
  lowConfidenceAlerts: string[];
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PixReceipt {
  tipoPix: 'RECEBIDO' | 'ENVIADO' | 'QR_CODE' | 'COPIA_E_COLA';
  valor: number;
  favorecidoOuRemetente: string;
  cpfCnpj?: string;
  institucaoBancaria: string;
  txidOrAutenticacao: string;
  dataHora: string;
  chavePix?: string;
  descricao?: string;
}

export interface BoletoData {
  linhaDigitavel: string;
  codigoBarras: string;
  beneficiario: string;
  cpfCnpjBeneficiario?: string;
  valor: number;
  dataVencimento: string;
  dataEmissao?: string;
  bancoEmissor: string;
  multaJurosEstimado?: number;
}

export interface InvoiceData {
  numeroNota?: string;
  estabelecimento: string;
  cnpj?: string;
  valorTotal: number;
  dataEmissao: string;
  formaPagamento: PaymentMethodType;
  itens: Array<{
    descricao: string;
    quantidade: number;
    valorUnitario: number;
    valorTotal: number;
    categoriaSugerida?: string;
  }>;
}

export interface CreditCardInvoiceItem {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  categoriaSugerida: string;
  parcelaInfo?: string; // e.g. "02/10"
}

export interface CreditCardInvoice {
  bancoOuEmissor: string;
  cartaoFinal?: string;
  valorTotal: number;
  dataVencimento: string;
  dataFechamento?: string;
  itens: CreditCardInvoiceItem[];
}

export interface BankStatementItem {
  id: string;
  data: string;
  descricao: string;
  tipo: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
  subtipo: 'PIX' | 'TED' | 'DOC' | 'TARIFA' | 'OUTRO';
  valor: number;
  documentoRef?: string;
  categoriaSugerida?: string;
}

export interface BankStatement {
  banco: string;
  agenciaConta?: string;
  periodoInicio: string;
  periodoFim: string;
  saldoInicial: number;
  saldoFinal: number;
  totalEntradas: number;
  totalSaidas: number;
  itens: BankStatementItem[];
}

export interface ReceiptData {
  tipo: DocumentType;
  pix?: PixReceipt;
  boleto?: BoletoData;
  invoice?: InvoiceData;
  cardInvoice?: CreditCardInvoice;
  statement?: BankStatement;
  dataGeral?: {
    valor: number;
    estabelecimentoOuPessoa: string;
    data: string;
    categoriaSugerida: string;
    formaPagamento: PaymentMethodType;
  };
}

export interface DocumentHistory {
  id: string;
  fileName: string;
  documentType: DocumentType;
  timestamp: string;
  confidence: number;
  statusImportacao: 'CONFIRMADO' | 'EDITADO' | 'CANCELADO' | 'PENDENTE';
  extractedValue?: number;
  rawTextPreview: string;
}

export interface ReconciliationResult {
  transacaoExtrato: BankStatementItem;
  transacaoExistenteId?: string | number;
  statusConciliacao: 'EXATA' | 'DUPLICADA' | 'PENDENTE' | 'DIVERGENTE';
  divergenciaMensagem?: string;
}

export interface DocumentSettings {
  ativarOCR: boolean;
  importacaoAutomatica: boolean;
  melhoriaAutomaticaImagem: boolean;
  conciliacaoAutomatica: boolean;
  prepararOpenFinance: boolean;
  salvarHistoricoOCR: boolean;
}

// OPEN FINANCE ARCHITECTURE MODELS
export interface OpenFinanceConsent {
  id: string;
  instituicao: string;
  status: 'ATIVO' | 'EXPIRADO' | 'REVOGADO' | 'PENDENTE';
  dataInicio: string;
  dataExpiracao: string;
  escopos: string[];
}

export interface OpenFinanceInstitution {
  id: string;
  nome: string;
  codigoCompe: string;
  logoUrl?: string;
  suportaContas: boolean;
  suportaCartoes: boolean;
  suportaInvestimentos: boolean;
  suportaEmprestimos: boolean;
}

export interface OpenFinanceAccount {
  id: string;
  instituicaoId: string;
  tipoConta: 'CORRENTE' | 'POUPANCA' | 'PAGAMENTO' | 'INVESTIMENTO';
  agencia: string;
  numeroConta: string;
  saldoDisponivel: number;
  saldoBloqueado: number;
  moeda: string;
}

export interface OpenFinanceCard {
  id: string;
  instituicaoId: string;
  nomeCartao: string;
  finalCartao: string;
  limiteTotal: number;
  limiteDisponivel: number;
  faturaAtualValor: number;
  faturaVencimento: string;
}

export interface OpenFinanceSyncResult {
  timestamp: string;
  contasSincronizadas: number;
  cartoesSincronizados: number;
  transacoesImportadas: number;
  status: 'SUCESSO' | 'PARCIAL' | 'ERRO';
}
