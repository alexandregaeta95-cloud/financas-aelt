import React from 'react';
import { ShieldCheck, PiggyBank, Scale, AlertCircle, Percent, Calendar } from 'lucide-react';

export interface DashboardKPIsProps {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  hideValuesMode: boolean;
}

export const DashboardKPIs: React.FC<DashboardKPIsProps> = React.memo(({
  totalIncome,
  totalExpense,
  netBalance,
  hideValuesMode,
}) => {
  const savingsRate = totalIncome > 0 ? Math.max(0, Math.round((netBalance / totalIncome) * 100)) : 0;
  const expenseRatio = totalIncome > 0 ? Math.min(100, Math.round((totalExpense / totalIncome) * 100)) : 0;
  const daysInMonth = new Date().getDate() || 30;
  const dailyAverageExpense = totalExpense > 0 ? totalExpense / daysInMonth : 0;

  // Solvency Status Assessment
  let solvencyStatus = 'Equilibrado';
  let solvencyColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (expenseRatio > 90) {
    solvencyStatus = 'Atenção Elevada';
    solvencyColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  } else if (expenseRatio > 75) {
    solvencyStatus = 'Moderado';
    solvencyColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  }

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Indicadores Principais de Saúde Financeira</h3>
            <p className="text-[11px] text-slate-400">Métricas analíticas em tempo real do período</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${solvencyColor}`}>
          {solvencyStatus}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taxa de Poupança */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Taxa de Poupança</span>
            <span className="text-lg font-extrabold text-emerald-400 font-mono">
              {savingsRate}%
            </span>
            <span className="text-[10px] text-slate-500 block">da receita guardada</span>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <PiggyBank className="w-5 h-5" />
          </div>
        </div>

        {/* Comprometimento de Renda */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Comprometimento</span>
            <span className={`text-lg font-extrabold font-mono ${expenseRatio > 80 ? 'text-rose-400' : 'text-sky-400'}`}>
              {expenseRatio}%
            </span>
            <span className="text-[10px] text-slate-500 block">da renda gasta no mês</span>
          </div>
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        {/* Média Diária de Gastos */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Gasto Médio Diário</span>
            <span className={`text-lg font-extrabold text-amber-400 font-mono ${hideValuesMode ? 'blur-[5px]' : ''}`}>
              R$ {dailyAverageExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">média corrida de saídas</span>
          </div>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Proporção de Cobertura */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">Índice de Solvência</span>
            <span className="text-lg font-extrabold text-purple-400 font-mono">
              {totalExpense > 0 ? (totalIncome / totalExpense).toFixed(2) : '1.00'}x
            </span>
            <span className="text-[10px] text-slate-500 block">cobertura de receita/despesa</span>
          </div>
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  );
});

DashboardKPIs.displayName = 'DashboardKPIs';
