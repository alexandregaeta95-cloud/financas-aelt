export type TimePeriodFilter = 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'QUARTER' | 'SEMESTER' | 'YEAR' | 'PREVIOUS_YEAR' | 'CUSTOM';

export interface AnalyticsFilter {
  period: TimePeriodFilter;
  startDate?: string;
  endDate?: string;
  account?: string;
  category?: string;
  bank?: string;
  vehicleId?: string;
  paymentMethod?: string;
  costCenter?: string;
  status?: string;
  type?: 'RECEITA' | 'DESPESA' | 'TODOS';
}

export interface KPI {
  id: string;
  title: string;
  value: number;
  formattedValue: string;
  previousValue?: number;
  changePercentage?: number;
  trend: 'UP' | 'DOWN' | 'STABLE';
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  icon: string;
  description?: string;
}

export interface FinancialMetrics {
  receitaMensal: number;
  despesaMensal: number;
  lucroLiquido: number;
  economiaMensal: number;
  saldoTotal: number;
  reservaFinanceira: number;
  comprometimentoRendaPct: number;
  despesasFixas: number;
  despesasVariaveis: number;
  indiceFinanceiro: number;
  saudeFinanceiraScore: number;
  taxaEconomiaPct: number;
  valorInvestido: number;
  quantidadeLancamentos: number;
  maiorDespesa: { descricao: string; valor: number; categoria: string };
  maiorReceita: { descricao: string; valor: number; origem: string };
  categoriaMaisGasta: { categoria: string; valor: number; pct: number };
  bancoMaisUtilizado: { banco: string; qtd: number };
  mediaDiariaGastos: number;
  mediaSemanalGastos: number;
  mediaMensalGastos: number;
}

export interface VehicleMetrics {
  totalVeiculos: number;
  custoTotalAbastecimento: number;
  custoTotalManutencao: number;
  custoTotalImpostosSeguro: number;
  consumoMedioKmL: number;
  custoMedioPorKm: number;
  veiculoMaisCustoso?: { nome: string; placa: string; totalGasto: number };
}

export interface OCRMetrics {
  totalProcessados: number;
  comprovantesPixCount: number;
  boletosCount: number;
  faturasCount: number;
  extratosCount: number;
  precisaoMediaPct: number;
  conciliacoesExatas: number;
  errosOcrCount: number;
}

export interface PixMetrics {
  totalPixEnviados: number;
  totalPixRecebidos: number;
  valorTotalPixEnviados: number;
  valorTotalPixRecebidos: number;
  bancoPixMaisUsado: string;
}

export interface GoalMetrics {
  totalMetas: number;
  metasConcluidas: number;
  metasEmAndamento: number;
  valorTotalAlvo: number;
  valorTotalAcumulado: number;
  percentualGeralConclusao: number;
}

export interface RiskMetrics {
  totalZonasRisco: number;
  alertasAtivos: number;
  ocorrenciasMes: number;
  nivelRiscoAtual: 'BAIXO' | 'MEDIO' | 'ALTO';
}

export interface PerformanceMetrics {
  tempoCarregamentoMs: number;
  statusCache: 'HIT' | 'MISS';
  registrosProcessados: number;
}

export interface ComparisonMetrics {
  periodoAtualDesc: string;
  periodoAnteriorDesc: string;
  receitaVariacaoPct: number;
  despesaVariacaoPct: number;
  saldoVariacaoPct: number;
}

export interface ChartDataPoint {
  label: string;
  valor: number;
  valorSecundario?: number;
  categoria?: string;
  color?: string;
}

export interface ChartData {
  chartType: 'LINE' | 'BAR' | 'PIE' | 'AREA' | 'DONUT' | 'RADAR' | 'HEATMAP';
  title: string;
  seriesName: string;
  data: ChartDataPoint[];
}

export interface ExecutiveReport {
  id: string;
  dataGeracao: string;
  periodo: string;
  metricasFinanceiras: FinancialMetrics;
  metricasVeiculos: VehicleMetrics;
  metricasOcr: OCRMetrics;
  metricasPix: PixMetrics;
  metricasMetas: GoalMetrics;
  metricasRisco: RiskMetrics;
  resumoExecutivoText: string;
  recomendacoesPrincipais: string[];
}

export interface Insight {
  id: string;
  tipo: 'FINANCEIRO' | 'VEICULO' | 'METAS' | 'COMPORTAMENTO' | 'ALERT';
  titulo: string;
  descricao: string;
  severidade: 'INFO' | 'ATENCAO' | 'CRITICO' | 'POSITIVO';
  data: string;
}

export interface Recommendation {
  id: string;
  categoria: string;
  acaoSugerida: string;
  impactoEstimadoEmReais: number;
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA';
}

export interface Alert {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: 'CONTA_VENCENDO' | 'SALDO_BAIXO' | 'EXCESSO_GASTOS' | 'MANUTENCAO_VEICULO' | 'RISCO' | 'META_ATRASADA';
  data: string;
  resolvido: boolean;
}

export interface DashboardCard {
  id: string;
  title: string;
  visible: boolean;
  order: number;
  width: 'FULL' | 'HALF' | 'THIRD';
}

export interface DashboardData {
  timestamp: string;
  kpis: KPI[];
  financialMetrics: FinancialMetrics;
  vehicleMetrics: VehicleMetrics;
  ocrMetrics: OCRMetrics;
  pixMetrics: PixMetrics;
  goalMetrics: GoalMetrics;
  riskMetrics: RiskMetrics;
  comparison: ComparisonMetrics;
  charts: {
    fluxoCaixaMensal: ChartDataPoint[];
    gastosPorCategoria: ChartDataPoint[];
    despesasPorBanco: ChartDataPoint[];
    previsaoEvolucao: ChartDataPoint[];
  };
  insights: Insight[];
  alerts: Alert[];
  recommendations: Recommendation[];
}

export interface AnalyticsSettings {
  atualizacaoAutomatica: boolean;
  atualizacaoEmSegundoPlano: boolean;
  intervaloAtualizacaoSegundos: number;
  temaGraficos: 'DEFAULT' | 'DARK' | 'NEON' | 'EMERALD';
  cacheInteligente: boolean;
  cardsVisibleOrder: DashboardCard[];
}
