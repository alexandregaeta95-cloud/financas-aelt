import { useState, useEffect, useCallback } from 'react';
import { RegisteredVehicle } from '../types';
import { vehicleService } from '../services/vehicleService';

export function useVehicles() {
  const [vehicles, setVehicles] = useState<RegisteredVehicle[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.listarVeiculos();
      setVehicles(data);
    } catch (e) {
      console.error('Erro ao carregar veículos:', e);
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
    carregar
  };
}
