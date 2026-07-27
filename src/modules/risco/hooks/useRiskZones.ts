import { useState, useEffect, useCallback } from 'react';
import { RiskZone } from '../types';
import { riskService } from '../services/riskService';

export function useRiskZones() {
  const [riskZones, setRiskZones] = useState<RiskZone[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await riskService.listarZonasRisco();
      setRiskZones(data);
    } catch (e) {
      console.error('Erro ao carregar zonas de risco:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    riskZones,
    loading,
    carregar
  };
}
