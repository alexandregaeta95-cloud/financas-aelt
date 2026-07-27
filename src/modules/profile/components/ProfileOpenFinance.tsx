import React from 'react';
import { BankAccount, CreditCard } from '../../../types';

interface ProfileOpenFinanceProps {
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  onReindexBankAccounts?: () => void;
  onReindexCreditCards?: () => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileOpenFinance: React.FC<ProfileOpenFinanceProps> = ({
  bankAccounts,
  creditCards,
  onReindexBankAccounts,
  onReindexCreditCards,
  showAlert
}) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-400">account_balance</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Open Finance &amp; Sincronização Bancária</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded">BANCO CENTRAL</span>
      </div>

      <div className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-200">Contas Conectadas</p>
              <p className="text-[10px] text-slate-400">{bankAccounts.length} instituições ativas</p>
            </div>
            {onReindexBankAccounts && (
              <button
                type="button"
                onClick={onReindexBankAccounts}
                className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Reindexar
              </button>
            )}
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-200">Cartões de Crédito</p>
              <p className="text-[10px] text-slate-400">{creditCards.length} cartões vinculados</p>
            </div>
            {onReindexCreditCards && (
              <button
                type="button"
                onClick={onReindexCreditCards}
                className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                Reindexar
              </button>
            )}
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-bold text-slate-200">Consentimento Open Finance</span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded">ATIVO (365 DIAS)</span>
          </div>
          <p className="text-[10px] text-slate-400">
            Autorização renovada automaticamente. Criptografia ponta a ponta com padronização Open Finance Brasil.
          </p>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileOpenFinance);
