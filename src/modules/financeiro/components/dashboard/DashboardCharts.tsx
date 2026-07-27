import React from 'react';
import { BarChart3, PieChart } from 'lucide-react';
import { 
  BarChart as RechartsBarChart, 
  Bar as RechartsBar, 
  XAxis as RechartsXAxis, 
  YAxis as RechartsYAxis, 
  CartesianGrid as RechartsCartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend as RechartsLegend, 
  ResponsiveContainer as RechartsResponsiveContainer 
} from 'recharts';
import { Transaction } from '../../../../types';

export interface DashboardChartsProps {
  monthlyTransactions: Transaction[];
  monthlyCategoryData: { 
    list: Array<{ name: string; value: number; color: string; percentage: number }>; 
    total: number 
  };
  donutSegments: Array<{ 
    name: string; 
    value: number; 
    color: string; 
    percentage: number; 
    pctFloat: number; 
    offset: number 
  }>;
  hideValuesMode: boolean;
  selectedMonthKey: string;
  formatMonthKey: (key: string) => string;
}

const CustomTooltip = ({ active, payload, label, hideValuesMode }: any) => {
  if (active && payload && payload.length) {
    const revenue = payload[0]?.value || 0;
    const expense = payload[1]?.value || 0;
    const balance = revenue - expense;
    return (
      <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl text-left font-sans">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-6">
            <span className="text-emerald-400 font-semibold">Receitas:</span>
            <span className={`font-mono font-bold text-white ${hideValuesMode ? 'blur-[5px]' : ''}`}>
              R$ {revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between gap-6">
            <span className="text-rose-400 font-semibold">Despesas:</span>
            <span className={`font-mono font-bold text-white ${hideValuesMode ? 'blur-[5px]' : ''}`}>
              R$ {expense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="border-t border-slate-900 pt-1.5 mt-1 flex justify-between gap-6">
            <span className="text-slate-300 font-semibold">Saldo:</span>
            <span className={`font-mono font-bold ${hideValuesMode ? 'blur-[5px]' : (balance >= 0 ? 'text-emerald-400' : 'text-rose-400')}`}>
              {balance >= 0 && !hideValuesMode ? '+' : ''}R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export const DashboardCharts: React.FC<DashboardChartsProps> = React.memo(({
  monthlyTransactions,
  monthlyCategoryData,
  donutSegments,
  hideValuesMode,
  selectedMonthKey,
  formatMonthKey,
}) => {
  // Aggregate comparative data by day or 5-day buckets
  const chartData = React.useMemo(() => {
    if (!monthlyTransactions || monthlyTransactions.length === 0) return [];
    
    const dayBuckets: { [day: number]: { receita: number; despesa: number } } = {};
    monthlyTransactions.forEach(t => {
      if (!t.data) return;
      const parts = t.data.includes('/') ? t.data.split('/') : t.data.split('-');
      const day = t.data.includes('/') ? parseInt(parts[0], 10) : parseInt(parts[2], 10);
      if (isNaN(day)) return;

      if (!dayBuckets[day]) dayBuckets[day] = { receita: 0, despesa: 0 };

      if (t.tipo === 'RECEITA') {
        dayBuckets[day].receita += t.valor;
      } else {
        dayBuckets[day].despesa += t.valor;
      }
    });

    const daysSorted = Object.keys(dayBuckets).map(Number).sort((a, b) => a - b);
    return daysSorted.map(d => ({
      dia: `Dia ${d}`,
      Receita: dayBuckets[d].receita,
      Despesa: dayBuckets[d].despesa,
    }));
  }, [monthlyTransactions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recharts Income vs Expense bar chart */}
      <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Evolução Financeira em {formatMonthKey(selectedMonthKey)}
              </h3>
              <p className="text-[11px] text-slate-400">Comparativo diário de Receitas vs Despesas</p>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-500">
              Nenhuma movimentação registrada no período selecionado.
            </div>
          ) : (
            <RechartsResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <RechartsCartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <RechartsXAxis dataKey="dia" stroke="#64748b" fontSize={10} tickLine={false} />
                <RechartsYAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <RechartsTooltip content={<CustomTooltip hideValuesMode={hideValuesMode} />} />
                <RechartsLegend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <RechartsBar dataKey="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                <RechartsBar dataKey="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </RechartsResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Expense Donut Chart & Breakdown */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Distribuição por Categoria</h3>
              <p className="text-[11px] text-slate-400">Detalhamento proporcional das saídas</p>
            </div>
          </div>

          {monthlyCategoryData.list.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-500">
              Nenhuma despesa para exibir neste mês.
            </div>
          ) : (
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
              {monthlyCategoryData.list.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="font-semibold text-slate-200">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-400 text-[11px]">{item.percentage}%</span>
                      <span className={`font-bold text-white ${hideValuesMode ? 'blur-[4px]' : ''}`}>
                        R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-800/80 pt-3 mt-4 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Total de Despesas do Mês</span>
          <span className={`font-mono font-bold text-rose-400 text-sm ${hideValuesMode ? 'blur-[5px]' : ''}`}>
            R$ {monthlyCategoryData.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
});

DashboardCharts.displayName = 'DashboardCharts';
