import React, { useState } from 'react';
import { FinancialForecast } from '../types';

interface ForecastCardProps {
  forecast: FinancialForecast;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ forecast }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<number>(30);

  const activePeriod = forecast.periods.find((p) => p.days === selectedPeriod) || forecast.periods[2];

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400 text-2xl">insights</span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Análise Preditiva e Previsões
            </h3>
            <p className="text-[11px] text-slate-400">
              Projeção de fluxo baseada no histórico de lançamentos e tendências.
            </p>
          </div>
        </div>

        {/* Period Selector Pills */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {forecast.periods.map((p) => (
            <button
              type="button"
              key={p.days}
              onClick={() => setSelectedPeriod(p.days)}
              className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                selectedPeriod === p.days
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.days === 365 ? '12 Meses' : `${p.days}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Period Active Details */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Saldo Atual</span>
          <span className="text-sm font-bold font-mono text-white">
            R$ {forecast.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Receitas Previstas</span>
          <span className="text-sm font-bold font-mono text-emerald-400">
            +R$ {activePeriod.receitasPrevistas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Despesas Previstas</span>
          <span className="text-sm font-bold font-mono text-rose-400">
            -R$ {activePeriod.despesasPrevistas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        <div className="p-3 bg-slate-950/70 border border-slate-850 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-mono block">Saldo Previsto ({activePeriod.periodLabel})</span>
          <span
            className={`text-sm font-bold font-mono ${
              activePeriod.saldoPrevisto >= 0 ? 'text-blue-400' : 'text-rose-400'
            }`}
          >
            R$ {activePeriod.saldoPrevisto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* 30-Day Daily Projection Table Sample */}
      <div className="space-y-2">
        <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono">
          Projeção Diária de Caixa (Próximos 7 Dias)
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                <th className="py-2 px-2">Data</th>
                <th className="py-2 px-2 text-right">Entrada Estimada</th>
                <th className="py-2 px-2 text-right">Saída Estimada</th>
                <th className="py-2 px-2 text-right">Saldo Projetado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {forecast.dailyProjections.slice(0, 7).map((d) => (
                <tr key={d.date} className="hover:bg-slate-950/40">
                  <td className="py-1.5 px-2 text-slate-300">
                    {new Date(d.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-1.5 px-2 text-right text-emerald-400">
                    +R$ {d.entrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-2 text-right text-rose-400">
                    -R$ {d.saida.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td
                    className={`py-1.5 px-2 text-right font-bold ${
                      d.saldo >= 0 ? 'text-slate-200' : 'text-rose-400'
                    }`}
                  >
                    R$ {d.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
