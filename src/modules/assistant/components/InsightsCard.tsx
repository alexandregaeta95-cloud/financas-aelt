import React from 'react';
import { FinancialInsight } from '../types';

interface InsightsCardProps {
  insights: FinancialInsight[];
}

export const InsightsCard: React.FC<InsightsCardProps> = ({ insights }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <span className="material-symbols-outlined text-purple-400 text-2xl">auto_awesome</span>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Insights Automáticos da IA
          </h3>
          <p className="text-[11px] text-slate-400">
            Destaques de comportamento, oscilações e padrões observados.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {insights.map((ins) => (
          <div
            key={ins.id}
            className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl space-y-1.5 font-mono"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-indigo-400 text-lg">
                {ins.icon || 'lightbulb'}
              </span>
              <span className="text-xs font-bold text-white">{ins.title}</span>
            </div>
            <p className="text-xs text-slate-300">{ins.description}</p>
            {ins.value !== undefined && (
              <span className="text-xs font-bold text-emerald-400 block pt-1">
                R$ {ins.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
