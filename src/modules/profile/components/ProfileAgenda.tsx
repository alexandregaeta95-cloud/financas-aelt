import React from 'react';
import { Compromisso } from '../../../types';

interface ProfileAgendaProps {
  compromissos?: Compromisso[];
  medicalAppointmentLeadDays?: number;
  setMedicalAppointmentLeadDays?: (val: number) => void;
  notifyAppointments?: boolean;
  setNotifyAppointments?: (val: boolean) => void;
  notifyMedical?: boolean;
  setNotifyMedical?: (val: boolean) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileAgenda: React.FC<ProfileAgendaProps> = ({
  compromissos = [],
  medicalAppointmentLeadDays = 2,
  setMedicalAppointmentLeadDays,
  notifyAppointments = true,
  setNotifyAppointments,
  notifyMedical = true,
  setNotifyMedical,
  showAlert
}) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400">calendar_month</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Agenda &amp; Lembretes de Compromissos</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">CALENDÁRIO</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800 sm:col-span-2">
          <div>
            <p className="font-bold text-slate-200">Alertas de Agenda e Consultas Médicas</p>
            <p className="text-[10px] text-slate-400">Lembretes proativos antes de eventos importantes</p>
          </div>
          <input
            type="checkbox"
            checked={notifyMedical}
            onChange={(e) => setNotifyMedical?.(e.target.checked)}
            className="accent-indigo-500 w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="space-y-1 sm:col-span-2">
          <label className="block text-slate-400 font-medium">Antecedência Alerta Consultas/Eventos (Dias)</label>
          <input
            type="number"
            min={1}
            max={30}
            value={medicalAppointmentLeadDays}
            onChange={(e) => setMedicalAppointmentLeadDays?.(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500 font-mono text-xs"
          />
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 sm:col-span-2 flex justify-between items-center">
          <div>
            <p className="font-bold text-slate-200">Compromissos Agendados</p>
            <p className="text-[10px] text-slate-400">{compromissos.length} itens no calendário financeiro e pessoal</p>
          </div>
          <span className="text-xs font-mono font-bold text-indigo-400">{compromissos.length} Agendamentos</span>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileAgenda);
