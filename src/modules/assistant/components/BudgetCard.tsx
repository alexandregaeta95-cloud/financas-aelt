import React from 'react';
import { BudgetAnalysis } from '../types';

interface BudgetCardProps {
  budget: BudgetAnalysis;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400 text-2xl">account_balance_wallet</span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Análise de Orçamento
            </h3>
            <p className="text-[11px] text-slate-400">
              Comparativo de orçamentos planejados vs realizados por categoria.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Planejado Total</span>
          <span className="text-sm font-bold font-mono text-white">
            R$ {budget.totalPlanejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Realizado Total</span>
          <span className="text-sm font-bold font-mono text-indigo-400">
            R$ {budget.totalRealizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Economia Gerada</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            R$ {budget.economiaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Excesso em Categorias</span>
          <span className="text-sm font-bold font-mono text-rose-400">
            R$ {budget.excessoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Category Breakdown Progress Bars */}
      <div className="space-y-3 pt-2">
        {budget.categories.slice(0, 6).map((cat) => (
          <div key={cat.categoria} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl space-y-1.5">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="font-bold text-white">{cat.categoria}</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400">
                  R$ {cat.realizado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ {cat.planejado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    cat.status === 'EXCEDIDO'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : cat.status === 'ALERTA'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {Math.round(cat.percentualGasto)}%
                </span>
              </div>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  cat.status === 'EXCEDIDO'
                    ? 'bg-rose-500'
                    : cat.status === 'ALERTA'
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, cat.percentualGasto)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
