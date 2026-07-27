import React from 'react';
import { AlertTriangle, MapPin, Calendar, Stethoscope, Bell, ShieldAlert, CheckCircle2, Play, Square } from 'lucide-react';
import { RiskZone, MedicalAppointment, MedicalPrescription, Compromisso } from '../../../../types';

export interface DashboardAlertsProps {
  activeRiskAlertZone: RiskZone | null;
  gpsPosition: { latitude: number; longitude: number } | null;
  isGpsTracking: boolean;
  isGpsSimulated: boolean;
  gpsError: string | null;
  riskZones: RiskZone[];
  onSimulateGPS: (zoneId: number) => void;
  onStopGPSTracking: () => void;
  appointments: MedicalAppointment[];
  prescriptions: MedicalPrescription[];
  compromissos: Compromisso[];
  dismissedReminders: number[];
  onDismissReminder: (id: number) => void;
  onNavigate: (tab: string) => void;
}

export const DashboardAlerts: React.FC<DashboardAlertsProps> = React.memo(({
  activeRiskAlertZone,
  gpsPosition,
  isGpsTracking,
  isGpsSimulated,
  gpsError,
  riskZones,
  onSimulateGPS,
  onStopGPSTracking,
  appointments,
  prescriptions,
  compromissos,
  dismissedReminders,
  onDismissReminder,
  onNavigate,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Central de Alertas & Segurança</h3>
            <p className="text-[11px] text-slate-400">Monitoramento de Zonas de Risco e Lembretes Importantes</p>
          </div>
        </div>
      </div>

      {/* GPS Active Proximity Risk Banner */}
      {activeRiskAlertZone && (
        <div className="p-4 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-200 flex items-start gap-3 shadow-lg animate-pulse">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-extrabold uppercase tracking-wide text-rose-300">
              ALERTA DE PROXIMIDADE: {activeRiskAlertZone.nomeLocal}
            </h4>
            <p className="text-xs">
              Você entrou no raio de risco cadastrado ({activeRiskAlertZone.raioMetros || 300}m).
              Evite expor pertences de valor e mantenha atenção redobrada!
            </p>
          </div>
        </div>
      )}

      {/* GPS Controls & Proximity Tester */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <MapPin className={`w-4 h-4 ${isGpsTracking ? 'text-emerald-400 animate-bounce' : 'text-slate-500'}`} />
          <div>
            <span className="font-bold text-slate-200 block">
              {isGpsTracking ? (isGpsSimulated ? 'GPS Simulado Ativo' : 'GPS em Monitoramento Real') : 'GPS Inativo'}
            </span>
            {gpsPosition && (
              <span className="text-[10px] text-slate-500 font-mono">
                {gpsPosition.latitude.toFixed(4)}, {gpsPosition.longitude.toFixed(4)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {riskZones.length > 0 && !isGpsTracking && (
            <select
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val)) onSimulateGPS(val);
              }}
              className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>Simular Ponto de Risco...</option>
              {riskZones.map(z => (
                <option key={z.id} value={z.id}>{z.nomeLocal}</option>
              ))}
            </select>
          )}

          {isGpsTracking && (
            <button
              onClick={onStopGPSTracking}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-xl font-bold hover:bg-rose-500/20"
            >
              <Square className="w-3 h-3" />
              <span>Parar GPS</span>
            </button>
          )}
        </div>
      </div>

      {/* Appointments / Reminders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {appointments.length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-sky-400">
              <div className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4" />
                <span>Consultas Médicas Agendadas</span>
              </div>
              <button onClick={() => onNavigate('saude')} className="text-[10px] underline">Ver</button>
            </div>
            {appointments.slice(0, 2).map((app) => (
              <div key={app.id} className="text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">{app.medico || app.especialidade}</span>
                  <span className="text-[10px] text-slate-400">{app.data} às {app.horario || 'N/I'}</span>
                </div>
                <span className="text-[10px] text-sky-400 font-mono font-bold">{app.especialidade}</span>
              </div>
            ))}
          </div>
        )}

        {compromissos.length > 0 && (
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-purple-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Compromissos & Agenda</span>
              </div>
              <button onClick={() => onNavigate('agenda')} className="text-[10px] underline">Ver Agenda</button>
            </div>
            {compromissos.slice(0, 2).map((comp) => (
              <div key={comp.id} className="text-xs bg-slate-900/80 p-2 rounded-lg border border-slate-800/80 flex justify-between">
                <div>
                  <span className="font-semibold text-slate-200 block">{comp.titulo}</span>
                  <span className="text-[10px] text-slate-400">{comp.data} {comp.horario ? `• ${comp.horario}` : ''}</span>
                </div>
                <span className="text-[10px] text-purple-400 font-mono">{comp.categoria || 'Geral'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

DashboardAlerts.displayName = 'DashboardAlerts';
