import { Transaction } from '../../../types';
import {
  FinancialHealth,
  FinancialForecast,
  BudgetAnalysis,
  CashFlowAnalysis,
  FinancialAlert,
  FinancialInsight,
  Recommendation,
  GoalProgress,
  HealthStatusLevel
} from '../types';
import { calculateCurrentMonthTotals, calculateTotalBalance } from '../utils/financialMath';
import { FinancialForecastEngine } from '../forecast/financialForecastEngine';
import { BudgetAnalyzer } from '../budget/budgetAnalyzer';
import { CashFlowAnalyzer } from '../cashflow/cashFlowAnalyzer';
import { GoalsManager } from '../goals/goalsManager';
import { AlertEngine } from '../alerts/alertEngine';
import { InsightsEngine } from '../insights/insightsEngine';
import { RecommendationEngine } from '../advisor/recommendationEngine';
import { assistantLogger } from '../services/assistantLogger';

export interface FullAssistantAnalysis {
  health: FinancialHealth;
  forecast: FinancialForecast;
  budget: BudgetAnalysis;
  cashFlow: CashFlowAnalysis;
  alerts: FinancialAlert[];
  insights: FinancialInsight[];
  recommendations: Recommendation[];
  goals: GoalProgress[];
  timestamp: string;
}

export class FinancialAssistant {
  private static instance: FinancialAssistant;
  private isInitialized: boolean = false;

  private constructor() {}

  public static getInstance(): FinancialAssistant {
    if (!FinancialAssistant.instance) {
      FinancialAssistant.instance = new FinancialAssistant();
    }
    return FinancialAssistant.instance;
  }

  public inicializar(): void {
    this.isInitialized = true;
    assistantLogger.log('INFO' as any, 'FinancialAssistant inicializado com sucesso.');
  }

  public analisar(transactions: Transaction[], initialAccountsTotal: number = 0): FullAssistantAnalysis {
    const startTime = performance.now();

    try {
      // 1. Calculate Budget Analysis
      const budget = BudgetAnalyzer.analisar(transactions);

      // 2. Calculate Goals
      const goals = GoalsManager.obterMetas();

      // 3. Calculate Cash Flow
      const cashFlow = CashFlowAnalyzer.analisar(transactions, initialAccountsTotal);

      // 4. Calculate Forecast
      const forecast = FinancialForecastEngine.prever(transactions, initialAccountsTotal);

      // 5. Calculate Health Index
      const health = this.calcularSaudeFinanceira(transactions, initialAccountsTotal, budget, cashFlow);

      // 6. Generate Alerts
      const alerts = this.gerarAlertas(transactions, forecast, budget, goals);

      // 7. Generate Insights
      const insights = this.gerarInsights(transactions);

      // 8. Generate Recommendations
      const recommendations = this.gerarRecomendacoes(transactions, budget, health);

      const processingTime = Math.round(performance.now() - startTime);
      assistantLogger.log(
        'ANALYSIS_EXECUTED',
        `Análise financeira concluída com sucesso em ${processingTime}ms.`,
        processingTime
      );

      return {
        health,
        forecast,
        budget,
        cashFlow,
        alerts,
        insights,
        recommendations,
        goals,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      assistantLogger.log(
        'ANALYSIS_ERROR',
        `Erro durante execução da análise financeira: ${error?.message || error}`
      );
      throw error;
    }
  }

  public calcularSaudeFinanceira(
    transactions: Transaction[],
    initialAccountsTotal: number,
    budget: BudgetAnalysis,
    cashFlow: CashFlowAnalysis
  ): FinancialHealth {
    const currentTotals = calculateCurrentMonthTotals(transactions);
    const totalBalance = calculateTotalBalance(transactions, initialAccountsTotal);

    // Score components (0 to 100 each)
    // 1. Saldo Score: positive balance
    const saldoScore = totalBalance > 5000 ? 100 : totalBalance > 1000 ? 80 : totalBalance > 0 ? 60 : 20;

    // 2. Reserva Score: reserve vs monthly expense
    const monthlyExpense = currentTotals.despesas || 1;
    const reserveMonths = totalBalance / monthlyExpense;
    const reservaScore = reserveMonths >= 6 ? 100 : reserveMonths >= 3 ? 80 : reserveMonths >= 1 ? 60 : 30;

    // 3. Comprometimento Score: expenses vs income
    const income = currentTotals.receitas || 1;
    const expRatio = currentTotals.despesas / income;
    const comprometimentoScore = expRatio <= 0.5 ? 100 : expRatio <= 0.75 ? 80 : expRatio <= 0.9 ? 60 : 25;

    // 4. Despesas Fixas Score
    const despesasFixasScore = budget.excessoTotal === 0 ? 100 : Math.max(20, 100 - Math.round((budget.excessoTotal / (budget.totalPlanejado || 1)) * 100));

    // 5. Receitas Recorrentes Score
    const receitasRecorrentesScore = currentTotals.receitas > 0 ? 85 : 40;

    // 6. Pontualidade Score
    const pendingCount = transactions.filter((t) => (t.status || '').toUpperCase() === 'PENDENTE').length;
    const pontualidadeScore = pendingCount === 0 ? 100 : pendingCount <= 2 ? 80 : 50;

    // 7. Fluxo Caixa Score
    const fluxoCaixaScore = cashFlow.fluxoLiquidoMes >= 0 ? 95 : 35;

    const weights = {
      saldoScore: 0.15,
      reservaScore: 0.2,
      comprometimentoScore: 0.2,
      despesasFixasScore: 0.15,
      receitasRecorrentesScore: 0.1,
      pontualidadeScore: 0.1,
      fluxoCaixaScore: 0.1
    };

    const overallScore = Math.round(
      saldoScore * weights.saldoScore +
        reservaScore * weights.reservaScore +
        comprometimentoScore * weights.comprometimentoScore +
        despesasFixasScore * weights.despesasFixasScore +
        receitasRecorrentesScore * weights.receitasRecorrentesScore +
        pontualidadeScore * weights.pontualidadeScore +
        fluxoCaixaScore * weights.fluxoCaixaScore
    );

    let classification: HealthStatusLevel = 'BOA';
    if (overallScore >= 85) classification = 'EXCELENTE';
    else if (overallScore >= 70) classification = 'BOA';
    else if (overallScore >= 55) classification = 'REGULAR';
    else if (overallScore >= 40) classification = 'ATENÇÃO';
    else classification = 'CRÍTICA';

    let summaryText = 'Sua saúde financeira está sólida com bom equilíbrio entre receitas e saídas.';
    if (classification === 'EXCELENTE') summaryText = 'Excelente gestão financeira! Suas reservas e caixa estão altamente sustentáveis.';
    if (classification === 'REGULAR') summaryText = 'Atenção moderada: considere reduzir gastos variáveis e reforçar sua reserva de emergência.';
    if (classification === 'ATENÇÃO' || classification === 'CRÍTICA') summaryText = 'Alerta financeiro: despesas elevadas em relação às receitas. Ações corretivas recomendadas.';

    return {
      score: overallScore,
      classification,
      details: {
        saldoScore,
        reservaScore,
        comprometimentoScore,
        despesasFixasScore,
        receitasRecorrentesScore,
        pontualidadeScore,
        fluxoCaixaScore
      },
      summaryText
    };
  }

  public preverFluxoCaixa(transactions: Transaction[], initialBalance: number = 0): CashFlowAnalysis {
    return CashFlowAnalyzer.analisar(transactions, initialBalance);
  }

  public gerarInsights(transactions: Transaction[]): FinancialInsight[] {
    return InsightsEngine.gerarInsights(transactions);
  }

  public gerarAlertas(
    transactions: Transaction[],
    forecast: FinancialForecast,
    budget: BudgetAnalysis,
    goals: GoalProgress[]
  ): FinancialAlert[] {
    return AlertEngine.gerarAlertas(transactions, forecast, budget, goals);
  }

  public gerarRecomendacoes(
    transactions: Transaction[],
    budget: BudgetAnalysis,
    health: FinancialHealth
  ): Recommendation[] {
    return RecommendationEngine.gerarRecomendacoes(transactions, budget, health);
  }
}

export const financialAssistant = FinancialAssistant.getInstance();
