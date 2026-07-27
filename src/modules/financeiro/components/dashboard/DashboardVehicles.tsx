import React from 'react';
import { Car, AlertTriangle, Calendar, Fuel, Wrench } from 'lucide-react';
import { RegisteredVehicle, CarServiceScheduled } from '../../../../types';
import { checkIpvaAlerts, getNextIpvaDueDate } from '../../../../lib/ipvaUtils';

export interface DashboardVehiclesProps {
  registeredVehicles: RegisteredVehicle[];
  scheduledServices: CarServiceScheduled[];
  ipvaLeadDays: number;
  ipvaClosingDay: number;
  notifyIpva: boolean;
  onNavigate: (tab: string) => void;
}

export const DashboardVehicles: React.FC<DashboardVehiclesProps> = React.memo(({
  registeredVehicles = [],
  scheduledServices = [],
  ipvaLeadDays,
  ipvaClosingDay,
  notifyIpva,
  onNavigate,
}) => {
  const safeVehicles = Array.isArray(registeredVehicles) ? registeredVehicles : [];
  const ipvaAlerts = React.useMemo(() => {
    if (!notifyIpva) return [];
    return checkIpvaAlerts(safeVehicles, new Date(), [], ipvaLeadDays);
  }, [safeVehicles, ipvaLeadDays, notifyIpva]);

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
            <Car className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Gestão da Frota & Veículos</h3>
            <p className="text-[11px] text-slate-400">Vencimentos de IPVA, manutenções e combustível</p>
          </div>
        </div>
        <button
          onClick={() => onNavigate('oficina')}
          className="text-xs text-amber-400 hover:underline font-semibold cursor-pointer"
        >
          Ver Frota
        </button>
      </div>

      {safeVehicles.length === 0 ? (
        <p className="text-xs text-slate-500 italic text-center py-4">Nenhum veículo cadastrado na frota.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {safeVehicles.map((vehicle, index) => {
            if (!vehicle) return null;
            const nextIpva = vehicle.placa ? getNextIpvaDueDate(vehicle.placa) : null;
            const hasAlert = ipvaAlerts.some(a => a && a.vehicleId === vehicle.id);

            return (
              <div
                key={vehicle.id || index}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">{vehicle.descricao || vehicle.modelo || vehicle.placa || 'Veículo'}</span>
                  </div>
                  {vehicle.placa && (
                    <span className="text-[10px] font-mono bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-md text-slate-300">
                      {vehicle.placa}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block">Próximo IPVA</span>
                    <span className={`font-mono font-semibold ${hasAlert ? 'text-amber-400' : 'text-slate-300'}`}>
                      {nextIpva ? nextIpva.toLocaleDateString('pt-BR') : 'Não calc.'}
                    </span>
                  </div>

                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                    <span className="text-slate-500 text-[10px] block">KM Atual</span>
                    <span className="font-mono font-semibold text-slate-300">
                      {vehicle.kmAtual ? `${vehicle.kmAtual.toLocaleString('pt-BR')} km` : 'N/I'}
                    </span>
                  </div>
                </div>

                {hasAlert && (
                  <div className="flex items-center gap-1.5 p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Atenção: IPVA próximo do vencimento!</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

DashboardVehicles.displayName = 'DashboardVehicles';
