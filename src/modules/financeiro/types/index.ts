export type OrigemTransacao = 'MANUAL' | 'PIX' | 'CARTAO' | 'BOLETO' | 'IMPORTACAO';
export type StatusProcessamento = 'PENDENTE' | 'CONFIRMADO' | 'IGNORADO';

export interface Transaction {
  id: number;
  data: string;
  valor: number;
  dataPagamento?: string;
  valorPg?: number;
  tipo: string; // 'RECEITA' | 'DESPESA' | 'PAGO' | 'ETANOL' | 'GAS. COMUM' | etc.
  descricao: string;
  categoria: string; // 'TRABALHO' | 'ABASTECIMENTO' | 'CASA' | 'CONSUMO' | 'PESSOAL' | etc.
  status: string; // 'PAGO' | 'PENDENTE' | 'ATRASADO'
  bancoId?: number;
  bancoNome?: string;
  destBancoId?: number;
  destBancoNome?: string;
  origemAbastecimentoId?: number;
  km?: number;
  litros?: number;
  precoLitro?: number;
  veiculo?: string;
  descricaoVeiculo?: string;
  completouTanque?: boolean;
  mediaKmL?: number;
  kmPercorrido?: number;
  nomePosto?: string;
  localizacaoPosto?: string;
  motorista?: string;
  obs?: string;
  comprovanteUrl?: string;
  formaPagamento?: string;
  temJuros?: boolean;
  valorJuros?: number;
  updatedAt?: number;
  // Campos do Assistente Pix / Importações
  origem?: OrigemTransacao;
  statusProcessamento?: StatusProcessamento;
}

export interface Account {
  id: number;
  nome: string;
  tipo: 'BANCO' | 'PESSOAL' | 'CARTÃO';
  agencia?: string;
  conta?: string;
  saldoInicial: number;
  limite?: number;
  gasto?: number;
}

export interface Category {
  id: string;
  nome: string;
  cor?: string;
  icone?: string;
  tipo?: 'RECEITA' | 'DESPESA' | 'AMBOS';
}

export interface Transfer {
  id: string;
  origemBancoId: number;
  origemBancoNome: string;
  destinoBancoId: number;
  destinoBancoNome: string;
  valor: number;
  data: string;
  descricao?: string;
}

export interface PixTransaction {
  id: string;
  chavePix?: string;
  qrCode?: string;
  payloadText?: string;
  comprovanteTexto?: string;
  valor: number;
  pagador?: string;
  recebedor?: string;
  dataHora: string;
  status: StatusProcessamento;
  transactionId?: number;
}
