import { useState, useEffect, useMemo, useCallback } from 'react';
import { Transaction } from '../../../types';
import { FullAssistantAnalysis } from '../engine/financialAssistant';
import { assistantService } from '../services/assistantService';
import { AssistantSettings } from '../types';

export function useAssistant(transactions: Transaction[], initialAccountsTotal: number = 0) {
  const [settings, setSettings] = useState<AssistantSettings>(() => assistantService.getSettings());
  const [simulatedTransactions, setSimulatedTransactions] = useState<Transaction[] | null>(null);

  const activeTransactions = useMemo(() => {
    return simulatedTransactions !== null ? simulatedTransactions : transactions;
  }, [simulatedTransactions, transactions]);

  const analysis: FullAssistantAnalysis | null = useMemo(() => {
    if (!settings.ativarAssistente) return null;
    try {
      return assistantService.executarAnalise(activeTransactions, initialAccountsTotal);
    } catch (e) {
      console.error('Erro no hook useAssistant', e);
      return null;
    }
  }, [activeTransactions, initialAccountsTotal, settings.ativarAssistente]);

  // Simulation helpers
  const adicionarSimulacaoReceita = useCallback((valor: number, descricao: string, categoria: string = 'Trabalho') => {
    const currentList = simulatedTransactions !== null ? [...simulatedTransactions] : [...transactions];
    const newTx: Transaction = {
      id: Date.now(),
      valor: Math.abs(valor),
      tipo: 'RECEITA',
      descricao: `[SIMULAÇÃO] ${descricao}`,
      categoria,
      status: 'PAGO',
      data: new Date().toISOString().split('T')[0]
    };
    setSimulatedTransactions([newTx, ...currentList]);
  }, [simulatedTransactions, transactions]);

  const adicionarSimulacaoDespesa = useCallback((valor: number, descricao: string, categoria: string = 'Outros') => {
    const currentList = simulatedTransactions !== null ? [...simulatedTransactions] : [...transactions];
    const newTx: Transaction = {
      id: Date.now(),
      valor: Math.abs(valor),
      tipo: 'DESPESA',
      descricao: `[SIMULAÇÃO] ${descricao}`,
      categoria,
      status: 'PAGO',
      data: new Date().toISOString().split('T')[0]
    };
    setSimulatedTransactions([newTx, ...currentList]);
  }, [simulatedTransactions, transactions]);

  const limparSimulacao = useCallback(() => {
    setSimulatedTransactions(null);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AssistantSettings>) => {
    assistantService.saveSettings(newSettings);
    setSettings(assistantService.getSettings());
  }, []);

  return {
    analysis,
    settings,
    updateSettings,
    isSimulating: simulatedTransactions !== null,
    adicionarSimulacaoReceita,
    adicionarSimulacaoDespesa,
    limparSimulacao
  };
}
