import { useState, useEffect, useCallback } from 'react';
import { RegisteredVehicle } from '../types';
import { vehicleService } from '../services/vehicleService';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>(() => {
    try {
      const stored = localStorage.getItem('wealthflow_registered_vehicles') || localStorage.getItem('registered_vehicles');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await vehicleService.listarVeiculos();
      if (Array.isArray(data)) {
        setVehicles(data);
      }
    } catch (e: any) {
      console.warn('Erro ao carregar veículos no hook useVehicles:', e);
      setError(e?.message || 'Falha ao carregar veículos');
      // Fallback para o localStorage em caso de exceção inesperada
      try {
        const stored = localStorage.getItem('wealthflow_registered_vehicles') || localStorage.getItem('registered_vehicles');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setVehicles(parsed);
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    vehicles,
    loading,
    error,
    carregar
  };
}
