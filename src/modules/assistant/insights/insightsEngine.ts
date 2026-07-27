import { Transaction } from '../../../types';
import { FinancialInsight } from '../types';
import { parseTxDate, isExpenseTx, isIncomeTx, groupByCategory, isSameMonthYear } from '../utils/financialMath';

export class InsightsEngine {
  public static gerarInsights(transactions: Transaction[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];
    const now = new Date();

    const currentMonthTxs = transactions.filter((tx) => isSameMonthYear(parseTxDate(tx.data), now));

    // 1. Highest Expense of the Month
    const expenseTxs = currentMonthTxs.filter(isExpenseTx);
    if (expenseTxs.length > 0) {
      const highestExp = expenseTxs.reduce((prev, curr) => (Math.abs(curr.valor) > Math.abs(prev.valor) ? curr : prev));
      insights.push({
        id: 'ins-highest-exp',
        type: 'HIGHEST_EXPENSE',
        title: 'Maior Gasto do Mês',
        description: `O maior lançamento de despesa no mês foi "${highestExp.descricao}" na categoria ${highestExp.categoria}.`,
        value: Math.abs(highestExp.valor),
        category: highestExp.categoria,
        date: highestExp.data,
        icon: 'trending_down',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
      });
    }

    // 2. Highest Income of the Month
    const incomeTxs = currentMonthTxs.filter(isIncomeTx);
    if (incomeTxs.length > 0) {
      const highestInc = incomeTxs.reduce((prev, curr) => (Math.abs(curr.valor) > Math.abs(prev.valor) ? curr : prev));
      insights.push({
        id: 'ins-highest-inc',
        type: 'HIGHEST_INCOME',
        title: 'Maior Receita do Mês',
        description: `A maior entrada do mês foi "${highestInc.descricao}" no valor de R$ ${Math.abs(highestInc.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`,
        value: Math.abs(highestInc.valor),
        category: highestInc.categoria,
        date: highestInc.data,
        icon: 'trending_up',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      });
    }

    // 3. Month Comparison (Current vs Previous Month)
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthTxs = transactions.filter((tx) => isSameMonthYear(parseTxDate(tx.data), prevMonth));

    const currentExpTotal = expenseTxs.reduce((sum, t) => sum + Math.abs(t.valor || 0), 0);
    const prevExpTotal = prevMonthTxs.filter(isExpenseTx).reduce((sum, t) => sum + Math.abs(t.valor || 0), 0);

    if (prevExpTotal > 0) {
      const diff = currentExpTotal - prevExpTotal;
      const pct = Math.round((diff / prevExpTotal) * 100);
      const isIncrease = pct > 0;

      insights.push({
        id: 'ins-month-comp',
        type: 'MONTH_COMPARISON',
        title: 'Comparativo Mensal',
        description: isIncrease
          ? `Suas despesas aumentaram ${pct}% em relação ao mês anterior.`
          : `Parabéns! Suas despesas reduziram ${Math.abs(pct)}% em relação ao mês anterior.`,
        value: Math.abs(diff),
        percentage: pct,
        icon: isIncrease ? 'arrow_upward' : 'arrow_downward',
        badgeColor: isIncrease ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      });
    }

    // 4. Category Growth / Reduction
    const currentCatMap = groupByCategory(currentMonthTxs);
    const prevCatMap = groupByCategory(prevMonthTxs);

    let maxGrowthCat = '';
    let maxGrowthPct = 0;

    for (const cat of Object.keys(currentCatMap)) {
      const currVal = currentCatMap[cat];
      const prevVal = prevCatMap[cat] || 0;
      if (prevVal > 0) {
        const growth = ((currVal - prevVal) / prevVal) * 100;
        if (growth > maxGrowthPct) {
          maxGrowthPct = growth;
          maxGrowthCat = cat;
        }
      }
    }

    if (maxGrowthCat && maxGrowthPct > 15) {
      insights.push({
        id: 'ins-cat-growth',
        type: 'CATEGORY_GROWTH',
        title: `Aumento em ${maxGrowthCat}`,
        description: `A categoria ${maxGrowthCat} teve um crescimento de ${Math.round(maxGrowthPct)}% comparado ao mês passado.`,
        percentage: Math.round(maxGrowthPct),
        category: maxGrowthCat,
        icon: 'show_chart',
        badgeColor: 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      });
    }

    // 5. Peak Expense Day
    const dayExpenseMap: Record<number, number> = {};
    for (const tx of expenseTxs) {
      const dt = parseTxDate(tx.data);
      const day = dt.getDate();
      dayExpenseMap[day] = (dayExpenseMap[day] || 0) + Math.abs(tx.valor || 0);
    }

    let peakDay = 0;
    let peakDayVal = 0;
    for (const dayStr of Object.keys(dayExpenseMap)) {
      const d = parseInt(dayStr, 10);
      if (dayExpenseMap[d] > peakDayVal) {
        peakDayVal = dayExpenseMap[d];
        peakDay = d;
      }
    }

    if (peakDay > 0) {
      insights.push({
        id: 'ins-peak-day',
        type: 'PEAK_EXPENSE_DAY',
        title: 'Dia de Maior Concentração de Gastos',
        description: `O dia ${peakDay} concentrou R$ ${peakDayVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em saídas no mês.`,
        value: peakDayVal,
        icon: 'calendar_today',
        badgeColor: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      });
    }

    return insights;
  }
}
