import { useState, useEffect } from 'react';
import { BankAccount, CreditCard } from '../../../types';
import { bankAccounts, creditCards } from '../../../data/transactions';

export function useBanksAndCardsState() {
  const [bankAccountsState, setBankAccountsState] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_bank_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse bank accounts state:", e);
    }
    return bankAccounts;
  });

  const [creditCardsState, setCreditCardsState] = useState<CreditCard[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_credit_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse credit cards state:", e);
    }
    return creditCards;
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_bank_accounts', JSON.stringify(bankAccountsState));
    } catch (e) {
      console.warn("Failed to save bank accounts to localStorage:", e);
    }
  }, [bankAccountsState]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_credit_cards', JSON.stringify(creditCardsState));
    } catch (e) {
      console.warn("Failed to save credit cards to localStorage:", e);
    }
  }, [creditCardsState]);

  return {
    bankAccountsState,
    setBankAccountsState,
    creditCardsState,
    setCreditCardsState,
  };
}
