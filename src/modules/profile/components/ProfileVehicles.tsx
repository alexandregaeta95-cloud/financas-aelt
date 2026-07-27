import React from 'react';
import { RegisteredVehicle } from '../../../types';

interface ProfileVehiclesProps {
  registeredVehicles: RegisteredVehicle[];
  defaultVehicleId?: string;
  setDefaultVehicleId?: (id: string) => void;
  ipvaLeadDays?: number;
  setIpvaLeadDays?: (val: number) => void;
  ipvaClosingDay?: number;
  setIpvaClosingDay?: (val: number) => void;
  licensingReminderDay?: number;
  setLicensingReminderDay?: (val: number) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileVehicles: React.FC<ProfileVehiclesProps> = ({
  registeredVehicles = [],
  defaultVehicleId = '',
  setDefaultVehicleId,
  ipvaLeadDays = 30,
  setIpvaLeadDays,
  ipvaClosingDay = 15,
  setIpvaClosingDay,
  licensingReminderDay = 10,
  setLicensingReminderDay,
  showAlert
}) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">directions_car</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Módulo de Veículos &amp; Frotas</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">GESTÃO VEICULAR</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Veículo Padrão (Favorito)</label>
          <select
            value={defaultVehicleId}
            onChange={(e) => {
              setDefaultVehicleId?.(e.target.value);
              if (showAlert) showAlert("Veículo Padrão", "Veículo principal selecionado.");
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
          >
            <option value="">Selecione um veículo...</option>
            {registeredVehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.marca} {v.modelo} ({v.placa})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Dia Fechamento Escala IPVA</label>
          <input
            type="number"
            min={1}
            max={31}
            value={ipvaClosingDay}
            onChange={(e) => setIpvaClosingDay?.(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Antecedência Alerta Licenciamento (Dias)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={licensingReminderDay}
            onChange={(e) => setLicensingReminderDay?.(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Antecedência Alerta IPVA (Dias)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={ipvaLeadDays}
            onChange={(e) => setIpvaLeadDays?.(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-amber-500 font-mono text-xs"
          />
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileVehicles);
