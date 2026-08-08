import { useState } from 'react';
import { Transaction } from '../types';
import { initialTransactions } from '../../../data/transactions';
import { cleanDuplicateTransactions } from '../utils/transactionUtils';

export function useTransactionsState() {
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_transactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return cleanDuplicateTransactions(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse transactions state:", e);
    }
    return cleanDuplicateTransactions(initialTransactions);
  });

  return {
    transactions,
    setTransactions,
  };
}
