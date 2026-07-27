import { Transaction } from '../../../types';
import { BudgetAnalysis, CategoryBudget } from '../types';
import { groupByCategory, parseTxDate, isSameMonthYear, isExpenseTx } from '../utils/financialMath';

export class BudgetAnalyzer {
  public static analisar(transactions: Transaction[], customBudgets?: Record<string, number>): BudgetAnalysis {
    const now = new Date();
    const currentMonthExpenses = groupByCategory(
      transactions.filter((tx) => isSameMonthYear(parseTxDate(tx.data), now))
    );

    // Calculate historical baseline per category for default budgets if custom ones are omitted
    const historicalMap: Record<string, { total: number; countMonths: Set<string> }> = {};
    for (const tx of transactions) {
      if (isExpenseTx(tx)) {
        const cat = tx.categoria || 'Outros';
        const dt = parseTxDate(tx.data);
        const monthKey = `${dt.getFullYear()}-${dt.getMonth()}`;
        if (!historicalMap[cat]) {
          historicalMap[cat] = { total: 0, countMonths: new Set() };
        }
        historicalMap[cat].total += Math.abs(tx.valor || 0);
        historicalMap[cat].countMonths.add(monthKey);
      }
    }

    const categories: CategoryBudget[] = [];
    let totalPlanejado = 0;
    let totalRealizado = 0;
    let economiaTotal = 0;
    let excessoTotal = 0;

    const allCategories = Array.from(
      new Set([...Object.keys(currentMonthExpenses), ...Object.keys(customBudgets || {}), ...Object.keys(historicalMap)])
    );

    for (const cat of allCategories) {
      const realizado = currentMonthExpenses[cat] || 0;
      
      let planejado = customBudgets?.[cat];
      if (planejado === undefined) {
        const hist = historicalMap[cat];
        const monthCount = hist ? Math.max(1, hist.countMonths.size) : 1;
        const avg = hist ? hist.total / monthCount : 500;
        planejado = Math.round(avg * 1.05); // 5% margin buffer
      }

      const diferenca = planejado - realizado;
      const percentualGasto = planejado > 0 ? (realizado / planejado) * 100 : 100;

      let status: CategoryBudget['status'] = 'DENTRO';
      if (percentualGasto >= 100) {
        status = 'EXCEDIDO';
        excessoTotal += Math.abs(diferenca);
      } else if (percentualGasto >= 85) {
        status = 'ALERTA';
        economiaTotal += diferenca;
      } else {
        economiaTotal += diferenca;
      }

      totalPlanejado += planejado;
      totalRealizado += realizado;

      categories.push({
        categoria: cat,
        planejado,
        realizado,
        diferenca,
        percentualGasto,
        status
      });
    }

    // Sort categories by highest spend
    categories.sort((a, b) => b.realizado - a.realizado);

    return {
      totalPlanejado,
      totalRealizado,
      economiaTotal,
      excessoTotal,
      categories
    };
  }
}
