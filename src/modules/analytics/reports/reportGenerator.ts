import { ExecutiveReport, DashboardData } from '../types';
import { analyticsLogger } from '../utils/analyticsLogger';

export function generateExecutiveReport(data: DashboardData, periodoDesc = 'Mês Atual'): ExecutiveReport {
  const report: ExecutiveReport = {
    id: `rep_${Date.now()}`,
    dataGeracao: new Date().toISOString(),
    periodo: periodoDesc,
    metricasFinanceiras: data.financialMetrics,
    metricasVeiculos: data.vehicleMetrics,
    metricasOcr: data.ocrMetrics,
    metricasPix: data.pixMetrics,
    metricasMetas: data.goalMetrics,
    metricasRisco: data.riskMetrics,
    resumoExecutivoText: `No período (${periodoDesc}), a receita total consolidada atingiu R$ ${data.financialMetrics.receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, enquanto as despesas somaram R$ ${data.financialMetrics.despesaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, gerando um saldo operacional positivo de R$ ${data.financialMetrics.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. A taxa de economia ficou em ${data.financialMetrics.taxaEconomiaPct.toFixed(1)}%, com Score de Saúde Financeira de ${data.financialMetrics.saudeFinanceiraScore}/100.`,
    recomendacoesPrincipais: data.recommendations.map(r => `${r.categoria}: ${r.acaoSugerida} (Impacto est: R$ ${r.impactoEstimadoEmReais})`),
  };

  analyticsLogger.log('RELATORIO', `Relatório Executivo gerado para período: ${periodoDesc}`, true);
  return report;
}
