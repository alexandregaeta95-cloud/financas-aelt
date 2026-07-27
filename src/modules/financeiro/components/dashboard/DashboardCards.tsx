import React from 'react';
import { ArrowUpRight, ArrowDownRight, Wallet, CreditCard as CreditCardIcon, Landmark, TrendingUp, TrendingDown } from 'lucide-react';
import { BankAccount, CreditCard } from '../../../../types';

export interface DashboardCardsProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  showBalance: boolean;
  hideValuesMode: boolean;
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  onNavigate: (tab: string) => void;
}

export const DashboardCards: React.FC<DashboardCardsProps> = React.memo(({
  totalBalance,
  totalIncome,
  totalExpense,
  netBalance,
  showBalance,
  hideValuesMode,
  bankAccounts,
  creditCards,
  onNavigate,
}) => {
  const formatVal = (val: number) => {
    return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-4">
      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Balance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Saldo Total em Contas
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono tracking-tight">
            {showBalance ? (
              <span className={hideValuesMode ? 'blur-[6px] select-none hover:blur-none transition-all duration-200' : ''}>
                R$ {formatVal(totalBalance)}
              </span>
            ) : (
              <span className="text-slate-500">••••••••</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Consolidado de {bankAccounts.length} banco(s) cadastrado(s)
          </p>
        </div>

        {/* Receita Mensal */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Receitas no Mês
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
            <span className={hideValuesMode ? 'blur-[6px] select-none hover:blur-none transition-all duration-200' : ''}>
              R$ {formatVal(totalIncome)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-500 mt-2 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>Entradas confirmadas no período</span>
          </div>
        </div>

        {/* Despesa Mensal */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Despesas no Mês
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 font-mono tracking-tight">
            <span className={hideValuesMode ? 'blur-[6px] select-none hover:blur-none transition-all duration-200' : ''}>
              R$ {formatVal(totalExpense)}
            </span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-rose-500 mt-2 font-medium">
            <TrendingDown className="w-3 h-3" />
            <span>Saídas e consumos acumulados</span>
          </div>
        </div>

        {/* Saldo Operacional Liquido */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Resultado Líquido
            </span>
            <div className={`p-2 rounded-xl ${netBalance >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono tracking-tight ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={hideValuesMode ? 'blur-[6px] select-none hover:blur-none transition-all duration-200' : ''}>
              {netBalance >= 0 ? '+' : ''}R$ {formatVal(netBalance)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Superávit / Déficit operacional do mês
          </p>
        </div>
      </div>

      {/* Accounts & Credit Cards horizontal bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bank accounts list summary */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <Landmark className="w-4 h-4 text-emerald-400" />
              <span>Bancos & Instituições</span>
            </div>
            <button
              onClick={() => onNavigate('financas')}
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              Ver Tudo
            </button>
          </div>
          <div className="space-y-2">
            {bankAccounts.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum banco cadastrado</p>
            ) : (
              bankAccounts.slice(0, 3).map((acc) => (
                <div key={acc.id} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-200">{acc.nome}</span>
                  <span className={`text-xs font-bold font-mono text-emerald-400 ${hideValuesMode ? 'blur-[5px]' : ''}`}>
                    R$ {formatVal(acc.saldoInicial || 0)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Credit cards summary */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-300">
              <CreditCardIcon className="w-4 h-4 text-sky-400" />
              <span>Cartões de Crédito</span>
            </div>
            <button
              onClick={() => onNavigate('financas')}
              className="text-xs text-sky-400 hover:underline font-semibold"
            >
              Gerenciar
            </button>
          </div>
          <div className="space-y-2">
            {creditCards.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhum cartão cadastrado</p>
            ) : (
              creditCards.slice(0, 3).map((card) => (
                <div key={card.id} className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80">
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">{card.nome}</span>
                    <span className="text-[10px] text-slate-500">Vence dia {card.diaVencimento}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold font-mono text-rose-400 block ${hideValuesMode ? 'blur-[5px]' : ''}`}>
                      R$ {formatVal(card.limiteUtilizado || 0)}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Limite R$ {formatVal(card.limite)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardCards.displayName = 'DashboardCards';
