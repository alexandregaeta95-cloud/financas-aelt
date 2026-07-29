import { Transaction } from '../../../types';

export function parseTxDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const raw = String(dateStr).trim().replace(/^["']|["']$/g, '');
  const clean = raw.split(' ')[0].split('T')[0].trim();
  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) year += 2000;
      const d = new Date(year, month, day);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        d.setHours(0, 0, 0, 0);
        return d;
      } else {
        const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        d.setHours(0, 0, 0, 0);
        return d;
      }
    }
  }
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date();
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
