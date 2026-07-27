import React from 'react';
import { ArrowLeftRight, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { Transaction } from '../../../../types';

export interface DashboardCashFlowProps {
  transactions: Transaction[];
  selectedMonthKey: string;
  hideValuesMode: boolean;
}

export const DashboardCashFlow: React.FC<DashboardCashFlowProps> = React.memo(({
  transactions,
  selectedMonthKey,
  hideValuesMode,
}) => {
  // Filter recent 5 cash flow entries
  const recentMovements = React.useMemo(() => {
    return [...transactions]
      .reverse()
      .slice(0, 5);
  }, [transactions]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Fluxo de Caixa em Tempo Real</h3>
            <p className="text-[11px] text-slate-400">Últimas movimentações financeiras processadas</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {recentMovements.length === 0 ? (
          <p className="text-xs text-slate-500 italic text-center py-4">Nenhuma movimentação no fluxo de caixa.</p>
        ) : (
          recentMovements.map((tx) => {
            const isRevenue = tx.tipo === 'RECEITA';
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl transition-all hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isRevenue ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {isRevenue ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">{tx.descricao || 'Sem descrição'}</span>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span>{tx.data}</span>
                      <span>•</span>
                      <span className="bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800 uppercase font-mono">
                        {tx.categoria || 'Geral'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-xs font-bold font-mono block ${isRevenue ? 'text-emerald-400' : 'text-rose-400'} ${hideValuesMode ? 'blur-[5px]' : ''}`}>
                    {isRevenue ? '+' : '-'}R$ {tx.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {tx.bancoNome || 'Conta Principal'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

DashboardCashFlow.displayName = 'DashboardCashFlow';
