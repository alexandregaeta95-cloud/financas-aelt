import { Transaction } from '../../../types';
import { FinancialAlert, GoalProgress, BudgetAnalysis, FinancialForecast } from '../types';
import { parseTxDate, isExpenseTx, isIncomeTx, calculateCurrentMonthTotals } from '../utils/financialMath';

export class AlertEngine {
  public static gerarAlertas(
    transactions: Transaction[],
    forecast: FinancialForecast,
    budget: BudgetAnalysis,
    goals: GoalProgress[]
  ): FinancialAlert[] {
    const alerts: FinancialAlert[] = [];
    const now = new Date();

    // 1. Forecast Negative Balance Check
    if (forecast.periods.some((p) => p.saldoPrevisto < 0)) {
      alerts.push({
        id: `alt-neg-bal-${Date.now()}`,
        type: 'NEGATIVE_BALANCE_FORECAST',
        severity: 'HIGH',
        title: '⚠️ Risco de Saldo Negativo Previsto',
        message: 'A projeção indica que seu saldo poderá ficar negativo nos próximos 30-90 dias com o padrão de gastos atual.',
        actionableText: 'Reduzir despesas variáveis ou renegociar despesas fixas.',
        timestamp: new Date().toISOString()
      });
    }

    // 2. Category Overspend Check
    const overspentCats = budget.categories.filter((c) => c.status === 'EXCEDIDO');
    if (overspentCats.length > 0) {
      const catNames = overspentCats.map((c) => c.categoria).join(', ');
      alerts.push({
        id: `alt-overspend-${Date.now()}`,
        type: 'CATEGORY_OVERSPEND',
        severity: 'HIGH',
        title: '🚨 Excesso de Orçamento Detectado',
        message: `Você ultrapassou o orçamento nas seguintes categorias: ${catNames}.`,
        actionableText: 'Verifique os lançamentos recentes nestas categorias para contensão.',
        timestamp: new Date().toISOString()
      });
    }

    // 3. Goal At Risk Check
    const riskyGoals = goals.filter((g) => g.statusGoal === 'RISCO' || g.statusGoal === 'ATRASADA');
    if (riskyGoals.length > 0) {
      alerts.push({
        id: `alt-goal-risk-${Date.now()}`,
        type: 'GOAL_AT_RISK',
        severity: 'MEDIUM',
        title: '🎯 Meta Financeira em Risco',
        message: `A meta "${riskyGoals[0].titulo}" necessita de aportes adicionais de R$ ${riskyGoals[0].depositoMensalSugerido}/mês para ser concluída no prazo.`,
        actionableText: 'Ajustar meta ou aumentar economia mensal.',
        timestamp: new Date().toISOString()
      });
    }

    // 4. Pending / Near Due Transactions
    const pendingTxs = transactions.filter((tx) => {
      const isPending = (tx.status || '').toUpperCase() === 'PENDENTE';
      if (!isPending) return false;
      const dt = parseTxDate(tx.data);
      const diffDays = Math.ceil((dt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 5;
    });

    if (pendingTxs.length > 0) {
      alerts.push({
        id: `alt-due-soon-${Date.now()}`,
        type: 'DUE_DATE_SOON',
        severity: 'MEDIUM',
        title: '📅 Contas Próximas do Vencimento',
        message: `Você tem ${pendingTxs.length} conta(s) ou compromisso(s) pendente(s) vencendo nos próximos 5 dias.`,
        actionableText: 'Realizar pagamento ou agendamento bancário.',
        timestamp: new Date().toISOString()
      });
    }

    // 5. Income vs Expense Ratio Check
    const currentTotals = calculateCurrentMonthTotals(transactions);
    if (currentTotals.receitas > 0 && currentTotals.despesas > currentTotals.receitas * 0.9) {
      alerts.push({
        id: `alt-income-ratio-${Date.now()}`,
        type: 'EXPENSE_ABOVE_AVG',
        severity: 'HIGH',
        title: '📊 Elevado Comprometimento da Renda',
        message: `Suas despesas do mês já comprometem ${Math.round((currentTotals.despesas / currentTotals.receitas) * 100)}% das suas receitas recebidas.`,
        actionableText: 'Evitar novas compras não essenciais este mês.',
        timestamp: new Date().toISOString()
      });
    }

    return alerts;
  }
}
