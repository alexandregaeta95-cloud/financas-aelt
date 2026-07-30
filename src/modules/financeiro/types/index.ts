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
  cartaoid?: string | number;
  cartaoId?: string | number;
  obs?: string;
  comprovanteUrl?: string;
  formaPagamento?: string;
  temJuros?: boolean;
  valorJuros?: number;
  updatedAt?: number;
  // Campos com nomes exatos das 24 colunas da planilha
  Id?: number;
  Data?: string;
  Descrição?: string;
  Valor?: number;
  Valor_PG?: number;
  Banco_Id?: number | string;
  Cartão_Id?: string | number;
  Forma_Pagamento?: string;
  Tipo?: string;
  Categoria?: string;
  Status?: string;
  KM?: number | string;
  Litros?: number | string;
  Preço_Litro?: number | string;
  Completou_O_Tanque?: string | boolean;
  KM_Percorrido?: number | string;
  'Média_(Km/L)'?: number | string;
  Veiculo?: string;
  Descrição_Do_Veículo?: string;
  Motorista?: string;
  Nome_Posto?: string;
  Localização_Do_Posto?: string;
  Comprovante_Url?: string;
  OBS?: string;
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
