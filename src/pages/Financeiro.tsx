import React from 'react';
import TransactionsTab from '../modules/financeiro/components/TransactionsTab';
import { BankAccount, CreditCard, Transaction, RegisteredVehicle, Compromisso } from '../types';

interface FinanceiroPageProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  creditCards?: CreditCard[];
  setCreditCards?: React.Dispatch<React.SetStateAction<CreditCard[]>>;
  registeredVehicles?: RegisteredVehicle[];
  setRegisteredVehicles?: React.Dispatch<React.SetStateAction<RegisteredVehicle[]>>;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  onWipeTransactions?: () => void;
  googleUser?: any;
  googleToken?: string | null;
  isSyncing?: boolean;
  isImporting?: boolean;
  spreadsheetUrl?: string;
  syncError?: string | null;
  lastSyncedTime?: string;
  autoSync?: boolean;
  onGoogleLogin?: () => Promise<void> | void;
  onGoogleLogout?: () => Promise<void> | void;
  onToggleAutoSync?: (checked: boolean) => void;
  onTriggerSync?: (token?: string) => Promise<void> | void;
  onTriggerImport?: () => Promise<void> | void;
  onConnectGoogleDrive?: (urlOrToken: string) => Promise<void> | void;
  onAddTransaction?: (tx: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => void;
  onEditTransaction?: (id: number, tx: Partial<Transaction>) => void;
  onDeleteTransaction?: (id: number) => void;
  onImportTransactions?: (importedTxs: Transaction[]) => Promise<void>;
  compromissos?: Compromisso[];
  setCompromissos?: React.Dispatch<React.SetStateAction<Compromisso[]>>;
  forcedFilter?: 'RECEITA' | 'DESPESA' | 'ABASTECIMENTO' | 'FINANCAS';
  initialShowAddForm?: boolean;
}

export const FinanceiroPage: React.FC<FinanceiroPageProps> = (props) => {
  // Defensive sanitization of transactions
  const safeTransactions = React.useMemo(() => {
    return (props.transactions || []).map(t => {
      if (!t || typeof t !== 'object') return t;
      return {
        ...t,
        descricao: String(t.descricao ?? '').trim(),
        categoria: String(t.categoria ?? 'OUTROS').trim(),
        tipo: String(t.tipo ?? 'DESPESA').trim(),
        status: String(t.status ?? 'PAGO').trim(),
        formaPagamento: String(t.formaPagamento ?? '').trim(),
        obs: String(t.obs ?? '').trim(),
        veiculo: String(t.veiculo ?? t.descricaoVeiculo ?? '').trim(),
        motorista: String(t.motorista ?? '').trim(),
        nomePosto: String(t.nomePosto ?? '').trim(),
        localizacaoPosto: String(t.localizacaoPosto ?? '').trim()
      };
    });
  }, [props.transactions]);

  return (
    <div className="space-y-6 animate-fade-in">
      <TransactionsTab
        {...props}
        transactions={safeTransactions}
      />
    </div>
  );
};

export default FinanceiroPage;
