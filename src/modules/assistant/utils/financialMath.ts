import { Transaction } from '../../../types';

export function parseTxDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? new Date() : d;
}

export function isSameMonthYear(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
}

export function isSameYear(d1: Date, d2: Date): boolean {
  return d1.getFullYear() === d2.getFullYear();
}

export function isIncomeTx(tx: Transaction): boolean {
  const t = (tx.tipo || '').toUpperCase();
  return t === 'RECEITA' || t === 'ENTRADA' || t === 'GANHO' || t === 'SALÁRIO';
}

export function isExpenseTx(tx: Transaction): boolean {
  return !isIncomeTx(tx);
}

export function calculateCurrentMonthTotals(transactions: Transaction[]): { receitas: number; despesas: number; saldoMes: number } {
  const now = new Date();
  let receitas = 0;
  let despesas = 0;

  for (const tx of transactions) {
    const dt = parseTxDate(tx.data);
    if (isSameMonthYear(dt, now)) {
      const val = Math.abs(tx.valor || 0);
      if (isIncomeTx(tx)) {
        receitas += val;
      } else {
        despesas += val;
      }
    }
  }

  return {
    receitas,
    despesas,
    saldoMes: receitas - despesas
  };
}

export function calculateTotalBalance(transactions: Transaction[], initialAccountsTotal: number = 0): number {
  let balance = initialAccountsTotal;
  for (const tx of transactions) {
    const val = Math.abs(tx.valor || 0);
    if (isIncomeTx(tx)) {
      balance += val;
    } else {
      balance -= val;
    }
  }
  return balance;
}

export function groupByCategory(transactions: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const tx of transactions) {
    if (isExpenseTx(tx)) {
      const cat = tx.categoria || 'Outros';
      const val = Math.abs(tx.valor || 0);
      map[cat] = (map[cat] || 0) + val;
    }
  }
  return map;
}

export function groupByIncomeSource(transactions: Transaction[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const tx of transactions) {
    if (isIncomeTx(tx)) {
      const cat = tx.categoria || tx.descricao || 'Outros';
      const val = Math.abs(tx.valor || 0);
      map[cat] = (map[cat] || 0) + val;
    }
  }
  return map;
}
