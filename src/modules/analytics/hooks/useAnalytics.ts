import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardData, AnalyticsFilter, AnalyticsSettings } from '../types';
import { analyticsService } from '../services/analyticsService';
import { analyticsSettingsService } from '../services/analyticsSettingsService';

export function useAnalytics() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<AnalyticsFilter>({
    period: 'MONTH',
    type: 'TODOS',
  });
  const [settings, setSettings] = useState<AnalyticsSettings>(() =>
    analyticsSettingsService.getSettings()
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(
    async (forceRefresh = false) => {
      try {
        setLoading(true);
        setError(null);
        const result = await analyticsService.getDashboardData(filter, forceRefresh);
        setData(result);
      } catch (err) {
        setError((err as Error).message || 'Erro ao carregar dados do dashboard');
      } finally {
        setLoading(false);
      }
    },
    [filter]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Atualizacao automatica em segundo plano
  useEffect(() => {
    if (settings.atualizacaoAutomatica && settings.intervaloAtualizacaoSegundos > 0) {
      timerRef.current = setInterval(() => {
        analyticsService.getDashboardData(filter, true).then(result => {
          setData(result);
        }).catch(() => {
          // silent failure in background refresh
        });
      }, settings.intervaloAtualizacaoSegundos * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [settings, filter]);

  const updateFilter = (newFilter: Partial<AnalyticsFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  };

  const updateSettings = (newSettings: AnalyticsSettings) => {
    setSettings(newSettings);
    analyticsSettingsService.saveSettings(newSettings);
  };

  const refreshNow = () => {
    return loadData(true);
  };

  return {
    data,
    loading,
    error,
    filter,
    settings,
    updateFilter,
    updateSettings,
    refreshNow,
  };
}
