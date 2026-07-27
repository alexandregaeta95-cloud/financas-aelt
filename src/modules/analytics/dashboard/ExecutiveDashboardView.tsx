import React, { useState } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';
import { KpiCardWidget } from '../widgets/KpiCardWidget';
import { CashFlowLineChart, CategoryPieChart, ForecastBarChart } from '../charts/AnalyticsCharts';
import { FilterBar } from '../filters/FilterBar';
import { ExecutiveReportModal } from '../reports/ExecutiveReportModal';
import {
  PieChart,
  BellRing,
  Car,
  QrCode,
  FileCheck,
  Target,
  ShieldAlert,
  Sparkles,
  FileText,
  SlidersHorizontal,
  RotateCcw,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

export const ExecutiveDashboardView: React.FC = () => {
  const {
    data,
    loading,
    error,
    filter,
    settings,
    updateFilter,
    updateSettings,
    refreshNow,
  } = useAnalytics();

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (loading && !data) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Carregando plataforma de Business Intelligence e processando lançamentos...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/20 rounded-2xl m-4">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          {error || 'Não foi possível carregar o Dashboard Executivo.'}
        </p>
        <button
          onClick={refreshNow}
          className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sky-500/10 text-sky-600 rounded-lg">
              <PieChart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Dashboard Executivo BI
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Plataforma Unificada de Inteligência Financeira e Operacional
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-sky-500" />
            <span>Refreshed: {new Date(data.timestamp).toLocaleTimeString('pt-BR')}</span>
          </div>

          <button
            onClick={() => setIsReportOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl transition-all shadow-xs"
          >
            <FileText className="w-4 h-4" />
            <span>Relatório Executivo</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            title="Configurações do BI"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings bar */}
      {showSettings && (
        <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Configurações de Cache & Atualização
            </h3>
            <button
              onClick={() => updateSettings({ ...settings, cacheInteligente: !settings.cacheInteligente })}
              className="text-xs text-sky-600 dark:text-sky-400 font-semibold"
            >
              {settings.cacheInteligente ? 'Cache Inteligente: Ativo' : 'Cache Inteligente: Inativo'}
            </button>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.atualizacaoAutomatica}
                onChange={e => updateSettings({ ...settings, atualizacaoAutomatica: e.target.checked })}
                className="rounded text-sky-600 focus:ring-sky-500"
              />
              <span className="text-slate-700 dark:text-slate-300">Atualização Automática (30s)</span>
            </label>
          </div>
        </div>
      )}

      {/* FilterBar */}
      <FilterBar
        filter={filter}
        onFilterChange={updateFilter}
        onRefresh={refreshNow}
        loading={loading}
      />

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.kpis.map(kpi => (
          <KpiCardWidget key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fluxo de Caixa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Fluxo de Caixa Operacional
              </h2>
              <p className="text-xs text-slate-500">Evolução comparativa entre Receita e Despesa</p>
            </div>
          </div>
          <CashFlowLineChart data={data.charts.fluxoCaixaMensal} />
        </div>

        {/* Categoria */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="w-4 h-4 text-sky-500" />
                Distribuição de Despesas
              </h2>
              <p className="text-xs text-slate-500">Detalhamento por Categoria principal</p>
            </div>
          </div>
          <CategoryPieChart data={data.charts.gastosPorCategoria} />
        </div>
      </div>

      {/* Previsao e Evolucao */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Previsão de Evolução Patrimonial
            </h2>
            <p className="text-xs text-slate-500">Estimativa do saldo consolidado nos próximos meses</p>
          </div>
        </div>
        <ForecastBarChart data={data.charts.previsaoEvolucao} />
      </div>

      {/* Specialized Panels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Painel PIX */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <QrCode className="w-4 h-4 text-teal-500" />
              <span>Painel PIX</span>
            </div>
            <span className="text-[11px] font-semibold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-full">
              {data.pixMetrics.totalPixEnviados + data.pixMetrics.totalPixRecebidos} Transações
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">PIX Recebidos:</span>
              <span className="font-bold text-emerald-600">
                R$ {data.pixMetrics.valorTotalPixRecebidos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">PIX Enviados:</span>
              <span className="font-bold text-rose-600">
                R$ {data.pixMetrics.valorTotalPixEnviados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Banco Principal:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data.pixMetrics.bancoPixMaisUsado}
              </span>
            </div>
          </div>
        </div>

        {/* Painel OCR */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <FileCheck className="w-4 h-4 text-indigo-500" />
              <span>Painel OCR & Documentos</span>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">
              {data.ocrMetrics.precisaoMediaPct}% Precisão
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Documentos Processados:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.ocrMetrics.totalProcessados}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Comprovantes & Boletos:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data.ocrMetrics.comprovantesPixCount} / {data.ocrMetrics.boletosCount}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Conciliações Exatas:</span>
              <span className="font-bold text-emerald-600">{data.ocrMetrics.conciliacoesExatas}</span>
            </div>
          </div>
        </div>

        {/* Painel Veiculos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Car className="w-4 h-4 text-amber-500" />
              <span>Painel Veículos</span>
            </div>
            <span className="text-[11px] font-semibold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
              {data.vehicleMetrics.totalVeiculos} Veículos
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Gasto Abastecimento:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                R$ {data.vehicleMetrics.custoTotalAbastecimento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Consumo Médio:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data.vehicleMetrics.consumoMedioKmL} Km/L
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Veículo Maior Custo:</span>
              <span className="font-bold text-amber-600 line-clamp-1">
                {data.vehicleMetrics.veiculoMaisCustoso?.nome}
              </span>
            </div>
          </div>
        </div>

        {/* Painel Metas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <Target className="w-4 h-4 text-emerald-500" />
              <span>Painel Metas</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              {data.goalMetrics.percentualGeralConclusao}%
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Acumulado em Metas:</span>
              <span className="font-bold text-emerald-600">
                R$ {data.goalMetrics.valorTotalAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Metas Concluídas:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data.goalMetrics.metasConcluidas} de {data.goalMetrics.totalMetas}
              </span>
            </div>
          </div>
        </div>

        {/* Painel de Risco */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>Painel de Risco</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Risco {data.riskMetrics.nivelRiscoAtual}
            </span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Zonas Cadastradas:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">{data.riskMetrics.totalZonasRisco}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Alertas Ativos:</span>
              <span className="font-semibold text-rose-600">{data.riskMetrics.alertasAtivos}</span>
            </div>
          </div>
        </div>

        {/* Central de Alertas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
              <BellRing className="w-4 h-4 text-amber-500" />
              <span>Central de Alertas</span>
            </div>
          </div>
          <div className="space-y-2">
            {data.alerts.map(alt => (
              <div key={alt.id} className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg text-xs">
                <span className="font-bold text-amber-700 dark:text-amber-400 block">{alt.titulo}</span>
                <span className="text-slate-600 dark:text-slate-400">{alt.mensagem}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <ExecutiveReportModal
        data={data}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
