import React from 'react';
import { FinancialAlert } from '../types';

interface AlertsCardProps {
  alerts: FinancialAlert[];
}

export const AlertsCard: React.FC<AlertsCardProps> = ({ alerts }) => {
  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">check_circle</span>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Alertas Inteligentes
          </h3>
        </div>
        <p className="text-xs text-slate-400 font-mono">
          Nenhum risco ou alerta crítico detectado no momento. Tudo operando dentro da normalidade!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <span className="material-symbols-outlined text-amber-400 text-2xl">notifications_active</span>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
            Alertas Inteligentes ({alerts.length})
          </h3>
          <p className="text-[11px] text-slate-400">
            Detecções automáticas de desvios, vencimentos e riscos financeiros.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {alerts.map((alt) => (
          <div
            key={alt.id}
            className={`p-3.5 rounded-xl border font-mono space-y-1.5 ${
              alt.severity === 'HIGH'
                ? 'bg-rose-500/10 border-rose-500/30'
                : alt.severity === 'MEDIUM'
                ? 'bg-amber-500/10 border-amber-500/30'
                : 'bg-blue-500/10 border-blue-500/30'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">{alt.title}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                  alt.severity === 'HIGH'
                    ? 'bg-rose-500 text-slate-950'
                    : alt.severity === 'MEDIUM'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-blue-500 text-slate-950'
                }`}
              >
                {alt.severity}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{alt.message}</p>
            {alt.actionableText && (
              <div className="text-[11px] text-amber-300 font-medium pt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">bolt</span>
                Ação sugerida: {alt.actionableText}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
