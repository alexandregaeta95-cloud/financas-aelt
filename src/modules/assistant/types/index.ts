export type HealthStatusLevel = 'EXCELENTE' | 'BOA' | 'REGULAR' | 'ATENÇÃO' | 'CRÍTICA';

export interface FinancialHealth {
  score: number; // 0 to 100
  classification: HealthStatusLevel;
  details: {
    saldoScore: number;
    reservaScore: number;
    comprometimentoScore: number;
    despesasFixasScore: number;
    receitasRecorrentesScore: number;
    pontualidadeScore: number;
    fluxoCaixaScore: number;
  };
  summaryText: string;
}

export interface FinancialInsight {
  id: string;
  type: 'HIGHEST_EXPENSE' | 'HIGHEST_INCOME' | 'CATEGORY_GROWTH' | 'CATEGORY_REDUCTION' | 'MONTH_COMPARISON' | 'YEAR_COMPARISON' | 'PEAK_EXPENSE_DAY' | 'PEAK_INCOME_DAY';
  title: string;
  description: string;
  value?: number;
  percentage?: number;
  category?: string;
  date?: string;
  icon?: string;
  badgeColor?: string;
}

export interface FinancialAlert {
  id: string;
  type: 'EXPENSE_ABOVE_AVG' | 'INCOME_BELOW_AVG' | 'BALANCE_DROP' | 'NEGATIVE_BALANCE_FORECAST' | 'CATEGORY_OVERSPEND' | 'DUE_DATE_SOON' | 'FUTURE_INSTALLMENTS' | 'GOAL_AT_RISK';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  actionableText?: string;
  timestamp: string;
  read?: boolean;
}

export interface FinancialForecastPeriod {
  days: 7 | 15 | 30 | 90 | 365;
  periodLabel: string;
  receitasPrevistas: number;
  despesasPrevistas: number;
  saldoPrevisto: number;
  variacaoPercentual: number;
}

export interface FinancialForecast {
  currentBalance: number;
  periods: FinancialForecastPeriod[];
  dailyProjections: Array<{ date: string; saldo: number; entrada: number; saida: number }>;
}

export interface CategoryBudget {
  categoria: string;
  planejado: number;
  realizado: number;
  diferenca: number;
  percentualGasto: number;
  status: 'DENTRO' | 'ALERTA' | 'EXCEDIDO';
}

export interface BudgetAnalysis {
  totalPlanejado: number;
  totalRealizado: number;
  economiaTotal: number;
  excessoTotal: number;
  categories: CategoryBudget[];
}

export interface CashFlowDaily {
  data: string;
  entradasPrevistas: number;
  saidasPrevistas: number;
  saldoDiario: number;
  saldoAcumulado: number;
}

export interface CashFlowAnalysis {
  saldoAtual: number;
  saldoProjetado30d: number;
  entradasMes: number;
  saidasMes: number;
  fluxoLiquidoMes: number;
  diario: CashFlowDaily[];
  semanal: Array<{ semana: string; entradas: number; saidas: number; saldo: number }>;
  mensal: Array<{ mes: string; entradas: number; saidas: number; saldo: number }>;
}

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  explicacaoLogica: string;
  impactoEstimado: number; // ex: economizar R$ 150/mês
  categoriaAcao: 'REDUZIR_GASTO' | 'ANTECIPAR_PAGAMENTO' | 'CRIAR_RESERVA' | 'RENEGOCIAR' | 'AUMENTAR_INVESTIMENTO' | 'PRIORIZAR_PAGAMENTO';
  prioridade: 'ALTA' | 'MÉDIA' | 'BAIXA';
  executada?: boolean;
}

export interface GoalProgress {
  id: string;
  titulo: string;
  valorAlvo: number;
  valorAtual: number;
  percentualConcluido: number;
  dataLimite: string;
  dataEstimadaConclusao: string;
  statusGoal: 'EM_DIA' | 'ATRASADA' | 'RISCO' | 'CONCLUÍDA';
  diasRestantes: number;
  depositoMensalSugerido: number;
}

export interface ExpensePattern {
  categoria: string;
  mediaMensal: number;
  frequenciaMensal: number;
  diaPicoMes: number;
  tendencia: 'CRESCENTE' | 'ESTAVEL' | 'DECRESCENTE';
}

export interface IncomePattern {
  origem: string;
  mediaMensal: number;
  diaRecorrencia: number;
  regularidadePercentual: number;
}

export interface AssistantSettings {
  ativarAssistente: boolean;
  ativarAlertas: boolean;
  ativarPrevisoes: boolean;
  ativarRecomendacoes: boolean;
  atualizarAutomaticamente: boolean;
  atualizarAoAbrir: boolean;
  atualizarDiariamente: boolean;
}

export interface AssistantLogEntry {
  id: string;
  timestamp: string;
  event: 'ANALYSIS_EXECUTED' | 'ALERT_GENERATED' | 'FORECAST_CALCULATED' | 'RECOMMENDATION_GENERATED' | 'ANALYSIS_ERROR' | 'PROCESSING_TIME';
  message: string;
  processingTimeMs?: number;
  details?: any;
}

// Sprint 6 Future Interfaces
export interface VoiceAssistant {
  processarComandoVoz(audioBlobBase64: string): Promise<{ comando: string; acaoExecutada: string }>;
}

export interface OCRProcessor {
  processarImagem(imagemBase64: string): Promise<{ textoExtraido: string; confianca: number }>;
}

export interface DocumentReader {
  lerDocumento(pdfBase64: string): Promise<{ dadosFinanceiros: any }>;
}

export interface InvoiceReader {
  lerFaturaCartao(faturaBase64: string): Promise<{ total: number; vencimento: string; itens: any[] }>;
}

export interface ReceiptScanner {
  escanearComprovante(comprovanteBase64: string): Promise<{ valor: number; estabelecimento: string; data: string }>;
}

export interface CreditCardAnalyzer {
  analisarGastosCartao(faturas: any[]): Promise<{ limiteRecomendado: number; riscoEndividamento: string }>;
}

export interface InvestmentAdvisor {
  gerarSugestaoInvestimento(perfil: string, reservaLiquida: number): Promise<{ sugestoes: any[] }>;
}

export interface OpenFinanceConnector {
  conectarBanco(provedor: string): Promise<{ statusConexao: string; contasImportadas: number }>;
}

export interface BankSyncEngine {
  sincronizarExtrato(contaId: string): Promise<{ transacoesNovas: number }>;
}
