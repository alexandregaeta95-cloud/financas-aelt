import { Transaction } from '../types';

export function formatarMoeda(valor: any): string {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  let numVal = 0;
  if (typeof valor === 'number') {
    numVal = isNaN(valor) ? 0 : valor;
  } else if (typeof valor === 'string') {
    let s = valor.trim().replace(/R\$\s?/gi, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(s);
    numVal = isNaN(parsed) ? 0 : parsed;
  } else if (typeof valor === 'object') {
    const raw = valor['Valor (R$)'] ?? valor['Valor (R$) '] ?? valor.Valor ?? valor.valor ?? valor.VALOR ?? valor.valorPg ?? 0;
    return formatarMoeda(raw);
  }
  return numVal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatarData(dataStr: string): string {
  if (!dataStr) return '';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

export function calcularSaldo(transacoes: Transaction[]): number {
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  return safeList.reduce((acc, t) => {
    if (!t || typeof t !== 'object') return acc;
    const tipo = String(t.tipo || '').toUpperCase();
    const isDespesa = tipo === 'DESPESA' || tipo === 'ETANOL' || tipo === 'GAS. COMUM';
    const rawVal = t['Valor (R$)'] ?? t.valorPg ?? t.valor ?? 0;
    const valorNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.')) || 0;
    if (isDespesa) {
      return acc - Math.abs(valorNum);
    } else {
      return acc + Math.abs(valorNum);
    }
  }, 0);
}

export function agruparCategoria(transacoes: Transaction[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  safeList.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const cat = t.categoria || 'Outros';
    const rawVal = t['Valor (R$)'] ?? t.valorPg ?? t.valor ?? 0;
    const valorNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.')) || 0;
    resultado[cat] = (resultado[cat] || 0) + valorNum;
  });
  return resultado;
}

export function agruparConta(transacoes: Transaction[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  safeList.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const conta = t.bancoNome || 'Sem Conta';
    const rawVal = t['Valor (R$)'] ?? t.valorPg ?? t.valor ?? 0;
    const valorNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.')) || 0;
    resultado[conta] = (resultado[conta] || 0) + valorNum;
  });
  return resultado;
}

export function agruparMes(transacoes: Transaction[]): Record<string, Transaction[]> {
  const resultado: Record<string, Transaction[]> = {};
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  safeList.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const dataVal = t.data ? String(t.data) : '';
    const mesAno = dataVal ? dataVal.substring(0, 7) : 'Sem Data'; // YYYY-MM ou DD/MM/YYYY
    if (!resultado[mesAno]) {
      resultado[mesAno] = [];
    }
    resultado[mesAno].push(t);
  });
  return resultado;
}
