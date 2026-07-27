import React from 'react';
import { Recommendation } from '../types';

interface RecommendationsCardProps {
  recommendations: Recommendation[];
}

export const RecommendationsCard: React.FC<RecommendationsCardProps> = ({ recommendations }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <span className="material-symbols-outlined text-emerald-400 text-2xl">psychology</span>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Recomendações Personalizadas Explicaveis
          </h3>
          <p className="text-[11px] text-slate-400">
            Ações práticas com justificativa lógica e estimativa de economia/ganho.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2 font-mono"
          >
            <div className="flex justify-between items-start gap-2">
              <span className="text-xs font-bold text-white">{rec.title}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                +R$ {rec.impactoEstimado}/mês
              </span>
            </div>

            <p className="text-xs text-slate-300">{rec.description}</p>

            <div className="p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-indigo-400 block uppercase">💡 Por que esta recomendação?</span>
              <p>{rec.explicacaoLogica}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
