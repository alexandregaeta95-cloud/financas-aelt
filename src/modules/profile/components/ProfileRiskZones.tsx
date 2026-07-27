import React, { useState } from 'react';
import { RiskZone } from '../../../types';

interface ProfileRiskZonesProps {
  riskZones: RiskZone[];
  setRiskZones: React.Dispatch<React.SetStateAction<RiskZone[]>>;
  notifyRiskZones?: boolean;
  setNotifyRiskZones?: (val: boolean) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileRiskZones: React.FC<ProfileRiskZonesProps> = ({
  riskZones,
  setRiskZones,
  notifyRiskZones = true,
  setNotifyRiskZones,
  showAlert
}) => {
  const [alertRadius, setAlertRadius] = useState(500);

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400">fmd_bad</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Zonas de Risco GPS &amp; Alertas</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">GEOLOCALIZAÇÃO</span>
      </div>

      <div className="space-y-4 text-xs">
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Alertas em Tempo Real de Proximidade</p>
            <p className="text-[10px] text-slate-400">Emite sinal sonoro ao se aproximar de raio de perigo</p>
          </div>
          <input
            type="checkbox"
            checked={notifyRiskZones}
            onChange={(e) => setNotifyRiskZones?.(e.target.checked)}
            className="accent-rose-500 w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Raio de Alerta Padrão ({alertRadius}m)</label>
          <input
            type="range"
            min={100}
            max={2000}
            step={50}
            value={alertRadius}
            onChange={(e) => setAlertRadius(Number(e.target.value))}
            className="w-full accent-rose-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>100m</span>
            <span>1000m</span>
            <span>2000m</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-200">Zonas Cadastradas</p>
            <p className="text-[10px] text-slate-400">{riskZones.length} áreas identificadas no sistema</p>
          </div>
          <span className="text-xs font-mono font-bold text-rose-400">{riskZones.length} Registros</span>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileRiskZones);
