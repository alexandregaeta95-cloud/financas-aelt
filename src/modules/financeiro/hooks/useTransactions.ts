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
          const lower = (searchTerm || '').toString().toLowerCase();
          const matchDesc = (t.descricao || '').toString().toLowerCase().includes(lower);
          const matchCat = (t.categoria || '').toString().toLowerCase().includes(lower);
          const matchBanco = (t.bancoNome || (t as any).banco || '').toString().toLowerCase().includes(lower);
          const matchPosto = (t.nomePosto || (t as any).Nome_Posto || t.localizacaoPosto || (t as any).Localizacao_do_Posto || '').toString().toLowerCase().includes(lower);
          const matchMotorista = (t.motorista || '').toString().toLowerCase().includes(lower);
          const matchVeiculo = (t.veiculo || t.descricaoVeiculo || '').toString().toLowerCase().includes(lower);
          const matchFormaPag = (t.formaPagamento || (t as any)['Forma de Pagamento'] || '').toString().toLowerCase().includes(lower);
          const matchObs = (t.obs || (t as any).observacao || (t as any).observacoes || '').toString().toLowerCase().includes(lower);
          const matchTipo = (t.tipo || '').toString().toLowerCase().includes(lower);
          if (!matchDesc && !matchCat && !matchBanco && !matchPosto && !matchMotorista && !matchVeiculo && !matchFormaPag && !matchObs && !matchTipo) return false;
        }
        // Filtro por categoria
        if (categoryFilter !== 'TODAS' && (t.categoria || '').toString().toUpperCase() !== (categoryFilter || '').toString().toUpperCase()) {
          return false;
        }
        // Filtro por tipo
        if (typeFilter !== 'TODOS' && (t.tipo || '').toString().toUpperCase() !== (typeFilter || '').toString().toUpperCase()) {
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
