export type PixTipo = 'RECEBIDO' | 'ENVIADO' | 'INDEFINIDO';
export type StatusProcessamento = 'PENDENTE' | 'CONFIRMADO' | 'IGNORADO' | 'DUPLICADO' | 'ERRO';

export interface PixNotification {
  id: string;
  appPacote?: string;
  bancoNome?: string;
  titulo: string;
  texto: string;
  dataHora: string;
}

export interface PixTransaction {
  id: string;
  valor: number;
  banco: string;
  nomePessoa?: string;
  cpfCnpj?: string;
  data: string;
  hora: string;
  tipo: PixTipo;
  textoOriginal: string;
  chavePix?: string;
  categoriaSugerida?: string;
  status: StatusProcessamento;
  transactionId?: number;
}

export interface PixHistory {
  id: string;
  dataHora: string;
  banco: string;
  valor: number;
  textoRecebido: string;
  resultadoInterpretacao: Partial<PixTransaction>;
  status: 'IGNORADO' | 'CONFIRMADO' | 'DUPLICADO' | 'ERRO';
  observacoes?: string;
}

export interface PixRule {
  id: string;
  termoChave: string;
  tipoTransacao?: PixTipo;
  categoriaSugerida: string;
  descricaoSugerida?: string;
  ativo: boolean;
}

export interface PixBank {
  id: string;
  nome: string;
  pacoteAndroid?: string;
  palavrasChave: string[];
}

export interface PixDetection {
  sucesso: boolean;
  dados?: PixTransaction;
  mensagemErro?: string;
  duplicado?: boolean;
}

export interface PixSettings {
  ativarMonitoramento: boolean;
  mostrarConfirmacao: boolean;
  registrarHistorico: boolean;
  detectarDuplicados: boolean;
  ativarSugestoesInteligentes: boolean;
}

// Sprint 3 Interfaces Preparation
export interface NotificationListener {
  iniciar(): void;
  parar(): void;
  onNotificacao(callback: (notif: PixNotification) => void): void;
}

export interface BankDetector {
  identificarBanco(texto: string, pacote?: string): string;
}

export interface RuleEngine {
  aplicarRegras(pix: PixTransaction, regras: PixRule[]): { categoria?: string; descricao?: string };
}

export interface CategorySuggestion {
  sugerirCategoria(pix: PixTransaction): string;
}

export interface AiClassifier {
  classificarTransacao(texto: string): Promise<Partial<PixTransaction>>;
}
