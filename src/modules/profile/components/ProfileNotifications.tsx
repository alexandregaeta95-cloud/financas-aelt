import React, { useState } from 'react';
import { playNotificationSound } from '../utils/profileUtils';

interface ProfileNotificationsProps {
  notifyIpva?: boolean;
  setNotifyIpva?: (val: boolean) => void;
  notifyBudget?: boolean;
  setNotifyBudget?: (val: boolean) => void;
  notifyAppointments?: boolean;
  setNotifyAppointments?: (val: boolean) => void;
  notifyLicensing?: boolean;
  setNotifyLicensing?: (val: boolean) => void;
  notifyCarServices?: boolean;
  setNotifyCarServices?: (val: boolean) => void;
  notifyMedical?: boolean;
  setNotifyMedical?: (val: boolean) => void;
  notifyRiskZones?: boolean;
  setNotifyRiskZones?: (val: boolean) => void;
  ipvaLeadDays?: number;
  setIpvaLeadDays?: (val: number) => void;
  medicalAppointmentLeadDays?: number;
  setMedicalAppointmentLeadDays?: (val: number) => void;
  dailyCheckInTime?: string;
  setDailyCheckInTime?: (val: string) => void;
  licensingReminderDay?: number;
  setLicensingReminderDay?: (val: number) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileNotifications: React.FC<ProfileNotificationsProps> = ({
  notifyIpva = true,
  setNotifyIpva,
  notifyBudget = true,
  setNotifyBudget,
  notifyAppointments = true,
  setNotifyAppointments,
  notifyLicensing = true,
  setNotifyLicensing,
  notifyCarServices = true,
  setNotifyCarServices,
  notifyMedical = true,
  setNotifyMedical,
  notifyRiskZones = true,
  setNotifyRiskZones,
  ipvaLeadDays = 30,
  setIpvaLeadDays,
  medicalAppointmentLeadDays = 2,
  setMedicalAppointmentLeadDays,
  dailyCheckInTime = '20:00',
  setDailyCheckInTime,
  licensingReminderDay = 10,
  setLicensingReminderDay,
  showAlert
}) => {
  const [selectedSound, setSelectedSound] = useState('bell');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const testAudio = () => {
    playNotificationSound('system', selectedSound);
    if (vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
    if (showAlert) {
      showAlert("Sintetizador Web Audio", `Som "${selectedSound}" reproduzido com sucesso!`);
    }
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-5">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">notifications_active</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Notificações &amp; Alertas Smart</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">PUSH READY</span>
      </div>

      <div className="space-y-4 text-xs">
        {/* Toggle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-slate-200">Alertas IPVA &amp; Licenciamento</p>
              <p className="text-[10px] text-slate-400">Avisos de vencimentos veiculares</p>
            </div>
            <input
              type="checkbox"
              checked={notifyIpva}
              onChange={(e) => setNotifyIpva?.(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-slate-200">Orçamento &amp; Metas</p>
              <p className="text-[10px] text-slate-400">Alertas de estouro de teto de gastos</p>
            </div>
            <input
              type="checkbox"
              checked={notifyBudget}
              onChange={(e) => setNotifyBudget?.(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-slate-200">Consultas &amp; Compromissos</p>
              <p className="text-[10px] text-slate-400">Lembrete de agenda prévia</p>
            </div>
            <input
              type="checkbox"
              checked={notifyAppointments}
              onChange={(e) => setNotifyAppointments?.(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-slate-200">Zonas de Risco GPS</p>
              <p className="text-[10px] text-slate-400">Notificações ao aproximar de área perigosa</p>
            </div>
            <input
              type="checkbox"
              checked={notifyRiskZones}
              onChange={(e) => setNotifyRiskZones?.(e.target.checked)}
              className="accent-emerald-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* Lead days & Audio options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <label className="block text-slate-400 font-medium">Antecedência Alerta IPVA (Dias)</label>
            <input
              type="number"
              value={ipvaLeadDays}
              onChange={(e) => setIpvaLeadDays?.(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 font-medium">Horário Lembrete Check-In Diário</label>
            <input
              type="time"
              value={dailyCheckInTime}
              onChange={(e) => setDailyCheckInTime?.(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-slate-400 font-medium">Efeito Sonoro do Sistema</label>
            <select
              value={selectedSound}
              onChange={(e) => setSelectedSound(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            >
              <option value="bell">Sino Moderno</option>
              <option value="crystal">Cristalino</option>
              <option value="digital">Alerta Digital</option>
              <option value="echo">Eco Suave</option>
              <option value="piano">Acordes de Piano</option>
              <option value="zen">Sopro Zen</option>
            </select>
          </div>

          <div className="flex items-end pb-1">
            <button
              type="button"
              onClick={testAudio}
              className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 font-bold px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">volume_up</span>
              Testar Som do Alerta
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileNotifications);
