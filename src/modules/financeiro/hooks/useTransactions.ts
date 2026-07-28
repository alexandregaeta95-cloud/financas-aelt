import { useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction } from '../types';
import { transactionService } from '../services/transactionService';

export interface UseTransactionsOptions {
  autoLoad?: boolean;
}

export function useTransactions(options: UseTransactionsOptions = { autoLoad: true }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('TODAS');
  const [typeFilter, setTypeFilter] = useState<string>('TODOS');
  const [sortField, setSortField] = useState<keyof Transaction>('data');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await transactionService.listarTransacoes();
      setTransactions(data);
    } catch (e) {
      console.error('Erro ao carregar transações:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const recarregar = useCallback(async () => {
    await carregar();
  }, [carregar]);

  useEffect(() => {
    if (options.autoLoad) {
      carregar();
    }
  }, [options.autoLoad, carregar]);

  const atualizar = useCallback(async (novaLista: Transaction[]) => {
    setTransactions(novaLista);
  }, []);

  const pesquisar = useCallback((termo: string) => {
    setSearchTerm(termo);
  }, []);

  const filtrar = useCallback((categoria: string, tipo: string) => {
    setCategoryFilter(categoria);
    setTypeFilter(tipo);
  }, []);

  const ordenar = useCallback((field: keyof Transaction, order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  const filteredAndSortedTransactions = useMemo(() => {
    return (transactions || [])
      .filter(t => {
        if (!t) return false;
        // Busca por termo
        if (searchTerm) {
          const lower = String(searchTerm || '').toLowerCase();
          const matchDesc = String(t.descricao || '').toLowerCase().includes(lower);
          const matchCat = String(t.categoria || '').toLowerCase().includes(lower);
          const matchBanco = String(t.bancoNome || '').toLowerCase().includes(lower);
          const matchPosto = String(t.nomePosto || t.localizacaoPosto || '').toLowerCase().includes(lower);
          const matchMotorista = String(t.motorista || '').toLowerCase().includes(lower);
          const matchVeiculo = String(t.veiculo || t.descricaoVeiculo || '').toLowerCase().includes(lower);
          if (!matchDesc && !matchCat && !matchBanco && !matchPosto && !matchMotorista && !matchVeiculo) return false;
        }
        // Filtro por categoria
        if (categoryFilter !== 'TODAS' && String(t.categoria || '').toUpperCase() !== String(categoryFilter || '').toUpperCase()) {
          return false;
        }
        // Filtro por tipo
        if (typeFilter !== 'TODOS' && String(t.tipo || '').toUpperCase() !== String(typeFilter || '').toUpperCase()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const valA = a[sortField];
        const valB = b[sortField];

        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA);
        const strB = String(valB);
        return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      });
  }, [transactions, searchTerm, categoryFilter, typeFilter, sortField, sortOrder]);

  return {
    transactions,
    filteredTransactions: filteredAndSortedTransactions,
    loading,
    searchTerm,
    categoryFilter,
    typeFilter,
    sortField,
    sortOrder,
    carregar,
    recarregar,
    atualizar,
    pesquisar,
    filtrar,
    ordenar,
    setCategoryFilter,
    setTypeFilter
  };
}
