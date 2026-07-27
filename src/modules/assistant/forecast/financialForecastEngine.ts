import { Transaction } from '../../../types';
import { FinancialForecast, FinancialForecastPeriod } from '../types';
import { parseTxDate, isIncomeTx, isExpenseTx, calculateTotalBalance } from '../utils/financialMath';

export class FinancialForecastEngine {
  public static prever(transactions: Transaction[], initialBalance: number = 0): FinancialForecast {
    const currentBalance = calculateTotalBalance(transactions, initialBalance);
    const now = new Date();

    // Estimate daily averages from the last 90 days
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    let recentIncomes = 0;
    let recentExpenses = 0;
    let daysCount = 90;

    for (const tx of transactions) {
      const dt = parseTxDate(tx.data);
      if (dt >= ninetyDaysAgo && dt <= now) {
        const val = Math.abs(tx.valor || 0);
        if (isIncomeTx(tx)) {
          recentIncomes += val;
        } else {
          recentExpenses += val;
        }
      }
    }

    const avgDailyIncome = recentIncomes / daysCount;
    const avgDailyExpense = recentExpenses / daysCount;

    const periodsToCalculate: Array<{ days: 7 | 15 | 30 | 90 | 365; label: string }> = [
      { days: 7, label: 'Próximos 7 Dias' },
      { days: 15, label: 'Próximos 15 Dias' },
      { days: 30, label: 'Próximos 30 Dias' },
      { days: 90, label: 'Próximos 90 Dias' },
      { days: 365, label: 'Próximos 12 Meses' }
    ];

    const periods: FinancialForecastPeriod[] = periodsToCalculate.map((p) => {
      const receitasPrevistas = Math.round(avgDailyIncome * p.days);
      const despesasPrevistas = Math.round(avgDailyExpense * p.days);
      const saldoPrevisto = Math.round(currentBalance + receitasPrevistas - despesasPrevistas);
      const variacaoPercentual = currentBalance !== 0
        ? Math.round(((saldoPrevisto - currentBalance) / Math.abs(currentBalance)) * 100)
        : 0;

      return {
        days: p.days,
        periodLabel: p.label,
        receitasPrevistas,
        despesasPrevistas,
        saldoPrevisto,
        variacaoPercentual
      };
    });

    // Generate 30 daily projections for detailed chart/table
    const dailyProjections: Array<{ date: string; saldo: number; entrada: number; saida: number }> = [];
    let runningBalance = currentBalance;

    for (let i = 1; i <= 30; i++) {
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + i);
      const dateStr = futureDate.toISOString().split('T')[0];

      // Add slight variance/randomness based on weekday to mimic realistic cash flow
      const dayOfWeek = futureDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const entrada = isWeekend ? 0 : Math.round(avgDailyIncome * (0.8 + Math.random() * 0.4));
      const saida = Math.round(avgDailyExpense * (0.7 + Math.random() * 0.6));

      runningBalance = runningBalance + entrada - saida;

      dailyProjections.push({
        date: dateStr,
        saldo: Math.round(runningBalance),
        entrada,
        saida
      });
    }

    return {
      currentBalance,
      periods,
      dailyProjections
    };
  }
}
