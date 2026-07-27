import React, { useState } from 'react';
import { CashFlowAnalysis } from '../types';

interface CashFlowCardProps {
  cashFlow: CashFlowAnalysis;
}

export const CashFlowCard: React.FC<CashFlowCardProps> = ({ cashFlow }) => {
  const [viewMode, setViewMode] = useState<'MENSAL' | 'SEMANAL'>('MENSAL');

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400 text-2xl">swap_horiz</span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Fluxo de Caixa
            </h3>
            <p className="text-[11px] text-slate-400">
              Entradas, saídas e resultado líquido do período.
            </p>
          </div>
        </div>

        <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('MENSAL')}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer ${
              viewMode === 'MENSAL' ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            Histórico Mensal
          </button>
          <button
            type="button"
            onClick={() => setViewMode('SEMANAL')}
            className={`px-3 py-1 text-xs font-mono font-bold rounded-lg cursor-pointer ${
              viewMode === 'SEMANAL' ? 'bg-teal-600 text-white' : 'text-slate-400'
            }`}
          >
            Semanas do Mês
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Entradas do Mês</span>
          <span className="text-base font-bold font-mono text-emerald-400">
            +R$ {cashFlow.entradasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Saídas do Mês</span>
          <span className="text-base font-bold font-mono text-rose-400">
            -R$ {cashFlow.saidasMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3.5 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Resultado Líquido</span>
          <span
            className={`text-base font-bold font-mono ${
              cashFlow.fluxoLiquidoMes >= 0 ? 'text-teal-400' : 'text-rose-400'
            }`}
          >
            R$ {cashFlow.fluxoLiquidoMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {viewMode === 'MENSAL' ? (
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-2">
          {cashFlow.mensal.map((m) => (
            <div key={m.mes} className="p-2.5 bg-slate-950/50 border border-slate-850 rounded-xl space-y-1 text-center font-mono">
              <span className="text-[10px] text-slate-400 font-bold block">{m.mes}</span>
              <span className="text-xs font-bold text-emerald-400 block">+R$ {m.entradas}</span>
              <span className="text-xs font-bold text-rose-400 block">-R$ {m.saidas}</span>
              <span className={`text-[10px] font-bold block border-t border-slate-800 pt-1 ${m.saldo >= 0 ? 'text-teal-300' : 'text-rose-400'}`}>
                {m.saldo >= 0 ? '+' : ''}R$ {m.saldo}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2">
          {cashFlow.semanal.map((w) => (
            <div key={w.semana} className="p-3 bg-slate-950/50 border border-slate-850 rounded-xl space-y-1 font-mono">
              <span className="text-xs text-white font-bold block">{w.semana}</span>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Entradas:</span>
                <span className="text-emerald-400">+R$ {w.entradas}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Saídas:</span>
                <span className="text-rose-400">-R$ {w.saidas}</span>
              </div>
              <div className="flex justify-between text-xs font-bold border-t border-slate-800 pt-1">
                <span className="text-slate-300">Líquido:</span>
                <span className={w.saldo >= 0 ? 'text-teal-400' : 'text-rose-400'}>R$ {w.saldo}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
