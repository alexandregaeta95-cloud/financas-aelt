import React from 'react';
import { TrendingUp, Calendar, AlertTriangle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Transaction } from '../../../../types';

export interface DashboardForecastProps {
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
  hideValuesMode: boolean;
}

export const DashboardForecast: React.FC<DashboardForecastProps> = React.memo(({
  transactions,
  totalIncome,
  totalExpense,
  hideValuesMode,
}) => {
  // Simple 3-month forecast calculation based on current net average trend
  const monthlyAverageNet = totalIncome - totalExpense;
  const now = new Date();

  const forecastMonths = React.useMemo(() => {
    const list = [];
    let cumulativeBalance = 0;

    for (let i = 1; i <= 3; i++) {
      const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = futureDate.toLocaleString('pt-BR', { month: 'long' });
      const year = futureDate.getFullYear();
      cumulativeBalance += monthlyAverageNet;

      list.push({
        monthName: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        year,
        projectedNet: monthlyAverageNet,
        cumulativeBalance,
      });
    }

    return list;
  }, [monthlyAverageNet, now]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Previsão e Projeções Financeiras</h3>
            <p className="text-[11px] text-slate-400">Projeção estimada de caixa para os próximos 3 meses</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {forecastMonths.map((item, idx) => (
          <div key={idx} className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300">{item.monthName} {item.year}</span>
              <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full font-mono">
                +{(idx + 1)} Mês
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-400 block">Projeção de Resultado</span>
              <span className={`text-base font-extrabold font-mono ${item.projectedNet >= 0 ? 'text-emerald-400' : 'text-rose-400'} ${hideValuesMode ? 'blur-[5px]' : ''}`}>
                {item.projectedNet >= 0 ? '+' : ''}R$ {item.projectedNet.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-t border-slate-900 pt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Saldo Acumulado Est.</span>
              <span className={`font-mono font-semibold ${item.cumulativeBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'} ${hideValuesMode ? 'blur-[4px]' : ''}`}>
                R$ {item.cumulativeBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

DashboardForecast.displayName = 'DashboardForecast';
