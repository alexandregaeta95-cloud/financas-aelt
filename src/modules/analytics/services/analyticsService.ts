import { transactionService } from '../../financeiro/services/transactionService';
import { Transaction } from '../../financeiro/types';
import { DashboardData, AnalyticsFilter } from '../types';
import {
  calculateFinancialMetrics,
  calculateVehicleMetrics,
  calculateOCRMetrics,
  calculatePixMetrics,
  calculateGoalMetrics,
  calculateRiskMetrics,
  calculateComparisonMetrics,
  generateKPIs,
  generateChartData,
  generateInsightsAndAlerts,
} from '../metrics/metricsCalculator';
import { analyticsCache } from '../utils/analyticsCache';
import { analyticsLogger } from '../utils/analyticsLogger';

export class AnalyticsService {
  public static async getDashboardData(
    filter?: AnalyticsFilter,
    forceRefresh = false
  ): Promise<DashboardData> {
    const startTime = Date.now();
    const cacheKey = `dashboard_${JSON.stringify(filter || {})}`;

    if (!forceRefresh) {
      const cached = analyticsCache.get<DashboardData>(cacheKey);
      if (cached) {
        analyticsLogger.log('CARREGAMENTO', 'Dados carregados do cache inteligente', true, Date.now() - startTime);
        return cached.data;
      }
    }

    try {
      const transactions: Transaction[] = await transactionService.listarTransacoes();

      const financialMetrics = calculateFinancialMetrics(transactions, filter);
      const vehicleMetrics = calculateVehicleMetrics();
      const ocrMetrics = calculateOCRMetrics();
      const pixMetrics = calculatePixMetrics();
      const goalMetrics = calculateGoalMetrics();
      const riskMetrics = calculateRiskMetrics();
      const comparison = calculateComparisonMetrics(financialMetrics);

      const kpis = generateKPIs(financialMetrics);
      const charts = generateChartData(transactions);
      const { insights, alerts, recommendations } = generateInsightsAndAlerts(financialMetrics);

      const dashboardData: DashboardData = {
        timestamp: new Date().toISOString(),
        kpis,
        financialMetrics,
        vehicleMetrics,
        ocrMetrics,
        pixMetrics,
        goalMetrics,
        riskMetrics,
        comparison,
        charts,
        insights,
        alerts,
        recommendations,
      };

      analyticsCache.set(cacheKey, dashboardData);
      analyticsLogger.log(
        forceRefresh ? 'ATUALIZACAO' : 'CARREGAMENTO',
        `Dashboard processado com ${transactions.length} lançamentos`,
        true,
        Date.now() - startTime
      );

      return dashboardData;
    } catch (error) {
      const errMsg = (error as Error).message || 'Erro desconhecido ao carregar dashboard';
      analyticsLogger.log('ERRO', `Falha ao processar dashboard: ${errMsg}`, false, Date.now() - startTime);
      throw error;
    }
  }

  public static invalidateCache(): void {
    analyticsCache.invalidate();
    analyticsLogger.log('ATUALIZACAO', 'Cache de Analytics invalidado', true);
  }
}

export const analyticsService = AnalyticsService;
