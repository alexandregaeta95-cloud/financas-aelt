export * from './modules/financeiro/types/index';

export interface RiskZone {
  id: number;
  localizacao: string; // "latitude, longitude"
  latitude: number;
  longitude: number;
  latitudi?: number | string;
  dataRegistro: string;
  dataHora?: string;
  status?: string; // '⚠️ EM ÁREA DE RISCO!' | '✅ Seguro'
  nomeLocal: string;
  descricao?: string;
  raioMetros: number;
  raioM?: number;
  nivelRisco: 'ALTO' | 'BAIXO' | 'MEDIO';
  nivelDeRisco?: string;
  statusGeral?: 'DISPARAR' | 'VAZIO' | 'ALERTA';
  ativo: boolean | string;
  mensagemDeAlerta?: string;
  mensagem?: string;
  obs?: string;
  som?: string;
  voz?: string;
  sentido?: string;
}

export interface Infraction {
  id: string;
  protocolo: string;
  titulo: string;
  placa: string;
  veiculo: string;
  dataSubmissao: string;
  dataOcorrencia: string;
  localizacao: string;
  status: 'EM_ANALISE' | 'APROVADO' | 'NEGADO';
  valorMulta: number;
  pontosCnh: number;
  justificativa?: string;
  evidencias: { nome: string; tamanho: string; tipo: 'image' | 'pdf' }[];
}

export interface BankAccount {
  id: number;
  nome: string;
  tipo: 'BANCO' | 'PESSOAL';
  agencia?: string;
  conta?: string;
  saldoInicial: number;
  saldo?: number;
  limite?: number;
}

export interface CreditCard {
  id: number;
  nome: string;
  tipo: 'CARTÃO';
  limite: number;
  gasto: number;
  diaVencimento?: number;
  limiteUtilizado?: number;
}

export interface MedicalAppointment {
  id: string;
  especialidade: string;
  medico: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  horario?: string;
  local: string;
  observacoes?: string;
  status: 'Agendada' | 'Realizada' | 'Cancelada';
  lembreteAtivo: boolean;
  updatedAt?: number;
}

export interface MedicalPrescription {
  id: string;
  medico: string;
  especialidade: string;
  data: string; // YYYY-MM-DD
  medicamentos: string; // Rich text list of medications
  instrucoes?: string; // Instructions for taking
  observacoes?: string;
  dataVencimento?: string; // YYYY-MM-DD expiration date
  arquivoAnexo?: string; // Base64 data of prescription (PDF or Image)
  nomeArquivoAnexo?: string; // original filename
  tipoArquivoAnexo?: string; // mime type (e.g. application/pdf, image/*)
  status?: 'Ativa' | 'Baixada';
  updatedAt?: number;
}

export interface RegisteredVehicle {
  id: string;
  descricao: string; // ex: "FOX PRATA"
  motorista: string; // ex: "ALEXANDRE"
  placa?: string; // ex: "ABC-1234"
  mesFinalPlaca?: number; // Mês final/vencimento (1-12) para o IPVA
  marca?: string;
  modelo?: string;
  kmAtual?: number;
}

export interface Compromisso {
  id: string;
  titulo: string;
  data: string; // YYYY-MM-DD
  hora?: string; // HH:MM
  horario?: string;
  categoria?: string;
  descricao?: string;
  cor: string; // Hex color (e.g., "#22c55e", "#3b82f6", etc.)
  piscando?: boolean; // whether the indicator should flash/pulse
  lembreteAtivo: boolean;
  diasAntecedencia: number; // default is 2 days
  concluido?: boolean;
  updatedAt?: number;
}

export interface CarServicePerformed {
  id: string;
  veiculoDescricao: string;
  descricao: string;
  data: string; // YYYY-MM-DD
  km?: number;
  valor?: number;
  oficina?: string;
  observacoes?: string;
  updatedAt?: number;
}

export interface CarServiceScheduled {
  id: string;
  veiculoDescricao: string;
  descricao: string;
  tipoAgendamento: 'DATA' | 'KM' | 'DATA_E_KM';
  dataAlvo?: string; // YYYY-MM-DD
  kmAlvo?: number;
  recorrente: boolean;
  frequenciaMeses?: number;
  frequenciaKm?: number;
  status: 'PENDENTE' | 'REALIZADO' | 'ATRASADO';
  updatedAt?: number;
}

export interface SecurityConfig {
  enabled: boolean;
  mode: 'SENHA' | 'PIN' | 'BIOMETRIA';
  password?: string;
  pin?: string;
  pinCode?: string;
  biometricsEnabled?: boolean;
  requireAppLock?: boolean;
  biometricType?: 'FACE_ID' | 'TOUCH_ID';
  biometricsType?: 'FACE_ID' | 'TOUCH_ID';
}

export interface SavingsGoal {
  id: string;
  nome: string;
  valorAlvo: number;
  valorAtual: number;
  prazo?: string; // YYYY-MM-DD
  categoria?: string;
  descricao?: string;
  anoAlvo?: number;
  updatedAt?: number;
}

export interface InsuranceReminder {
  id: string;
  veiculoId?: string;
  veiculoDescricao: string;
  placa?: string;
  seguradora: string;
  numeroApolice?: string;
  valorPremio?: number;
  dataVencimento: string; // YYYY-MM-DD
  diasAntecedencia: number; // e.g. 30, 15, 7, 0
  pushEnabled: boolean;
  observacoes?: string;
  createdAt: number;
  updatedAt: number;
}

export type GroceryCategory = 'Hortifrúti' | 'Limpeza' | 'Bebidas' | 'Mercearia' | 'Açougue' | 'Padaria' | 'Higiene' | 'Outros';

export interface GroceryItem {
  id: string;
  nome: string;
  categoria: GroceryCategory;
  quantidade: number;
  valorEstimado: number; // Por unidade ou total estimativa
  comprado: boolean;
  observacao?: string;
  updatedAt?: number;
}
