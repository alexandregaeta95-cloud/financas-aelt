import { useState } from 'react';
import { RegisteredVehicle, CarServicePerformed, CarServiceScheduled } from '../../../types';

export function useVehiclesState() {
  const [registeredVehicles, setRegisteredVehicles] = useState<RegisteredVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_registered_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(Boolean).map((v: any) => ({
            ...v,
            descricao: (v.descricao || v.modelo || v.nome || '').toString().toUpperCase(),
            placa: (v.placa || '').toString().toUpperCase(),
            motorista: (v.motorista || '').toString().toUpperCase(),
            marca: (v.marca || '').toString().toUpperCase(),
            modelo: (v.modelo || '').toString().toUpperCase()
          })).filter(v => {
            const desc = (v.descricao || v.modelo || v.nome || v.placa || '').toString().toUpperCase();
            return desc !== 'FOX PRATA';
          });
          if (filtered.length !== parsed.length) {
            localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error("Failed to parse registered vehicles state:", e);
    }
    return [
      { id: '1', descricao: 'FOX ROCK RIO 1.6', motorista: 'ALEXANDRE', placa: 'FVS4I24' }
    ];
  });

  const [performedServices, setPerformedServices] = useState<CarServicePerformed[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_car_services_performed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(s => {
            if (!s || typeof s !== 'object') return false;
            try {
              const veh = String(s.veiculoDescricao || (s as any)['Veículo'] || '').toUpperCase();
              return veh !== 'FOX PRATA';
            } catch {
              return false;
            }
          });
          if (filtered.length !== parsed.length) {
            localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error("Failed to parse performed services state:", e);
    }
    return [
      {
        id: 'p1',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Troca de Óleo e Filtro',
        data: '2026-04-11',
        km: 82350,
        valor: 250,
        oficina: 'Auto Center Gaeta',
        observacoes: 'Óleo Shell Helix 10w40 semissintético e filtro de óleo Bosch.',
        updatedAt: Date.now()
      },
      {
        id: 'p2',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Alinhamento e Balanceamento',
        data: '2026-05-05',
        km: 83100,
        valor: 120,
        oficina: 'Pneus Express',
        observacoes: 'Feito rodízio de pneus traseiros para dianteiros.',
        updatedAt: Date.now()
      }
    ];
  });

  const [scheduledServices, setScheduledServices] = useState<CarServiceScheduled[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_car_services_scheduled');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(s => {
            if (!s || typeof s !== 'object') return false;
            try {
              const veh = String(s.veiculoDescricao || (s as any)['Veículo'] || '').toUpperCase();
              return veh !== 'FOX PRATA';
            } catch {
              return false;
            }
          });
          if (filtered.length !== parsed.length) {
            localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error("Failed to parse scheduled services state:", e);
    }
    return [
      {
        id: 's1',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Revisão Geral e Troca de Pastilhas',
        tipoAgendamento: 'DATA_E_KM',
        dataAlvo: '2026-08-15',
        kmAlvo: 90000,
        recorrente: false,
        status: 'PENDENTE',
        updatedAt: Date.now()
      },
      {
        id: 's2',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Troca de Óleo e Filtro',
        tipoAgendamento: 'DATA_E_KM',
        dataAlvo: '2026-10-11',
        kmAlvo: 92350,
        recorrente: true,
        frequenciaMeses: 6,
        frequenciaKm: 10000,
        status: 'PENDENTE',
        updatedAt: Date.now()
      }
    ];
  });

  return {
    registeredVehicles,
    setRegisteredVehicles,
    performedServices,
    setPerformedServices,
    scheduledServices,
    setScheduledServices,
  };
}
