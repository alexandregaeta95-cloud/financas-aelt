import React from 'react';
import TransactionsTab from '../modules/financeiro/components/TransactionsTab';
import { BankAccount, CreditCard, Transaction, RegisteredVehicle, Compromisso } from '../types';

interface AbastecimentoPageProps {
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  creditCards?: CreditCard[];
  setCreditCards?: React.Dispatch<React.SetStateAction<CreditCard[]>>;
  registeredVehicles: RegisteredVehicle[];
  setRegisteredVehicles: React.Dispatch<React.SetStateAction<RegisteredVehicle[]>>;
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
  initialShowAddForm?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class AbastecimentoErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Erro renderizando Abastecimento:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 my-4">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center mx-auto border border-rose-500/20">
            <span className="material-symbols-outlined text-2xl">local_gas_station</span>
          </div>
          <h3 className="text-base font-bold text-white">Ops, ocorreu um erro ao carregar os dados de Abastecimento</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Detectamos dados inconsistentes vindos da planilha. A tela foi recuperada em modo de segurança.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            Tentar Novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const AbastecimentoPage: React.FC<AbastecimentoPageProps> = (props) => {
  // Sanitize transactions list with strict null checks for all fuel fields
  const safeTransactions = React.useMemo(() => {
    return (props.transactions || []).map(t => {
      if (!t || typeof t !== 'object') return t;      return {
        ...t,
        descricao: String(t.descricao ?? '').trim(),
        categoria: String(t.categoria ?? 'ABASTECIMENTO').trim(),
        tipo: String(t.tipo ?? 'DESPESA').trim(),
        veiculo: String(t.veiculo ?? t.descricaoVeiculo ?? '').trim(),
        motorista: String(t.motorista ?? '').trim(),
        nomePosto: String(t.nomePosto ?? '').trim(),
        localizacaoPosto: String(t.localizacaoPosto ?? '').trim(),
        formaPagamento: String(t.formaPagamento ?? '').trim(),
        obs: String(t.obs ?? '').trim(),
        status: String(t.status ?? 'PAGO').trim()
      };
    });
  }, [props.transactions]);

  const safeVehicles = React.useMemo(() => {
    return (props.registeredVehicles || []).map(v => {
      if (!v || typeof v !== 'object') return v;
      return {
        ...v,
        descricao: String(v.descricao ?? '').trim(),
        motorista: String(v.motorista ?? '').trim(),
        placa: String(v.placa ?? '').trim()
      };
    });
  }, [props.registeredVehicles]);

  return (
    <AbastecimentoErrorBoundary>
      <div className="space-y-6 animate-fade-in">
        <TransactionsTab
          {...props}
          transactions={safeTransactions}
          registeredVehicles={safeVehicles}
          forcedFilter="ABASTECIMENTO"
        />
      </div>
    </AbastecimentoErrorBoundary>
  );
};

export default AbastecimentoPage;
