import React from 'react';
import { Sparkles, ArrowRight, CheckCircle2, AlertCircle, Lightbulb } from 'lucide-react';
import { Transaction } from '../../../../types';

export interface DashboardInsightsProps {
  transactions: Transaction[];
  categoryBudgets: { [category: string]: number };
  totalIncome: number;
  totalExpense: number;
  hideValuesMode: boolean;
  onNavigate: (tab: string) => void;
}

export const DashboardInsights: React.FC<DashboardInsightsProps> = React.memo(({
  transactions,
  categoryBudgets,
  totalIncome,
  totalExpense,
  hideValuesMode,
  onNavigate,
}) => {
  const insights = React.useMemo(() => {
    const list = [];

    // Net balance insight
    const net = totalIncome - totalExpense;
    if (totalIncome > 0 && net > 0) {
      list.push({
        id: 'positive-net',
        type: 'success',
        title: 'Superávit Operacional Positivo',
        description: `Sua receita cobriu 100% das despesas com R$ ${net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de sobra. Recomenda-se aportar na sua Meta de Economia.`,
      });
    } else if (totalIncome > 0 && net < 0) {
      list.push({
        id: 'negative-net',
        type: 'warning',
        title: 'Atenção ao Balanço Mensal',
        description: `As despesas superaram a receita registrada em R$ ${Math.abs(net).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Revise custos não essenciais.`,
      });
    }

    // Default recommendation if empty
    if (list.length === 0) {
      list.push({
        id: 'default-insight',
        type: 'info',
        title: 'Análise de Consumo Inteligente',
        description: 'Mantenha os lançamentos atualizados diariamente para receber insights personalizados da IA sobre padrão de consumo.',
      });
    }

    return list;
  }, [totalIncome, totalExpense]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Insights & IA Financeira</h3>
            <p className="text-[11px] text-slate-400">Recomendações automáticas baseadas em seus hábitos</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {insights.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
              item.type === 'success'
                ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200'
                : item.type === 'warning'
                ? 'bg-amber-500/5 border-amber-500/20 text-amber-200'
                : 'bg-purple-500/5 border-purple-500/20 text-purple-200'
            }`}
          >
            {item.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : item.type === 'warning' ? (
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Lightbulb className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
            )}

            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white">{item.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

DashboardInsights.displayName = 'DashboardInsights';
