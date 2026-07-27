import React from 'react';
import { FinancialHealth } from '../types';

interface HealthCardProps {
  health: FinancialHealth;
}

export const HealthCard: React.FC<HealthCardProps> = ({ health }) => {
  const getBadgeStyle = (classification: FinancialHealth['classification']) => {
    switch (classification) {
      case 'EXCELENTE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'BOA':
        return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
      case 'REGULAR':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'ATENÇÃO':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'CRÍTICA':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-2xl">health_and_safety</span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Saúde Financeira IA
            </h3>
            <p className="text-[11px] text-slate-400">
              Pontuação calculada por 7 pilares de sustentabilidade financeira.
            </p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${getBadgeStyle(
            health.classification
          )}`}
        >
          {health.classification} ({health.score}/100)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Score Gauge */}
        <div className="flex flex-col items-center justify-center p-4 bg-slate-950/80 border border-slate-850 rounded-xl space-y-2">
          <div className="relative w-28 h-28 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={health.score >= 70 ? 'text-emerald-400' : health.score >= 50 ? 'text-amber-400' : 'text-rose-400'}
                strokeDasharray={`${health.score}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute text-center">
              <span className="text-2xl font-black text-white font-mono">{health.score}</span>
              <span className="text-[10px] text-slate-400 block uppercase font-mono">Índice</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-300 text-center font-mono leading-tight">
            {health.summaryText}
          </p>
        </div>

        {/* 7 Pillars Breakdown */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-mono">Reserva Financeira</span>
            <span className="text-xs font-bold text-emerald-400 font-mono">{health.details.reservaScore}%</span>
          </div>
          <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-mono">Comprometimento</span>
            <span className="text-xs font-bold text-indigo-400 font-mono">{health.details.comprometimentoScore}%</span>
          </div>
          <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-mono">Despesas Fixas</span>
            <span className="text-xs font-bold text-amber-400 font-mono">{health.details.despesasFixasScore}%</span>
          </div>
          <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-mono">Fluxo de Caixa</span>
            <span className="text-xs font-bold text-blue-400 font-mono">{health.details.fluxoCaixaScore}%</span>
          </div>
          <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-mono">Pontualidade</span>
            <span className="text-xs font-bold text-purple-400 font-mono">{health.details.pontualidadeScore}%</span>
          </div>
          <div className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-lg">
            <span className="text-[10px] text-slate-400 block font-mono">Saldo Disponível</span>
            <span className="text-xs font-bold text-teal-400 font-mono">{health.details.saldoScore}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
