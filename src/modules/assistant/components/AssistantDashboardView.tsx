import React, { useState } from 'react';
import { Transaction } from '../../../types';
import { useAssistant } from '../hooks/useAssistant';
import { HealthCard } from './HealthCard';
import { ForecastCard } from './ForecastCard';
import { BudgetCard } from './BudgetCard';
import { CashFlowCard } from './CashFlowCard';
import { AlertsCard } from './AlertsCard';
import { InsightsCard } from './InsightsCard';
import { RecommendationsCard } from './RecommendationsCard';
import { GoalsCard } from './GoalsCard';
import { SimulatorCard } from './SimulatorCard';
import { AssistantSettingsCard } from './AssistantSettingsCard';
import { Sprint6PrepView } from './Sprint6PrepView';

interface AssistantDashboardViewProps {
  transactions: Transaction[];
  initialAccountsTotal?: number;
}

export const AssistantDashboardView: React.FC<AssistantDashboardViewProps> = ({
  transactions,
  initialAccountsTotal = 0
}) => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PREVISOES' | 'ORCAMENTO' | 'SIMULADOR' | 'CONFIG'>('DASHBOARD');

  const {
    analysis,
    settings,
    updateSettings,
    isSimulating,
    adicionarSimulacaoReceita,
    adicionarSimulacaoDespesa,
    limparSimulacao
  } = useAssistant(transactions, initialAccountsTotal);

  if (!analysis || !settings.ativarAssistente) {
    return (
      <div className="p-8 bg-slate-900/40 border border-slate-800 rounded-2xl text-center space-y-4 font-mono">
        <span className="material-symbols-outlined text-slate-500 text-4xl">smart_toy</span>
        <h3 className="text-sm font-bold text-white">Assistente Financeiro Desativado</h3>
        <p className="text-xs text-slate-400">
          Ative o assistente inteligente nas configurações do seu perfil para visualizar análises preditivas.
        </p>
        <button
          type="button"
          onClick={() => updateSettings({ ativarAssistente: true })}
          className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-500 cursor-pointer"
        >
          Ativar Assistente Inteligente
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub-navigation Menu */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('DASHBOARD')}
          className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'DASHBOARD'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">dashboard</span>
          Painel IA & Saúde
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('PREVISOES')}
          className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'PREVISOES'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">insights</span>
          Previsões & Caixa
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ORCAMENTO')}
          className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'ORCAMENTO'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
          Orçamento & Metas
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('SIMULADOR')}
          className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'SIMULADOR'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">science</span>
          Simulador IA
          {isSimulating && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CONFIG')}
          className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'CONFIG'
              ? 'bg-indigo-600 text-white shadow-lg'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          Configurações & Sprint 6
        </button>
      </div>

      {/* Tab Content Views */}
      {activeTab === 'DASHBOARD' && (
        <div className="space-y-6">
          <HealthCard health={analysis.health} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AlertsCard alerts={analysis.alerts} />
            <InsightsCard insights={analysis.insights} />
          </div>

          <RecommendationsCard recommendations={analysis.recommendations} />
        </div>
      )}

      {activeTab === 'PREVISOES' && (
        <div className="space-y-6">
          <ForecastCard forecast={analysis.forecast} />
          <CashFlowCard cashFlow={analysis.cashFlow} />
        </div>
      )}

      {activeTab === 'ORCAMENTO' && (
        <div className="space-y-6">
          <BudgetCard budget={analysis.budget} />
          <GoalsCard goals={analysis.goals} />
        </div>
      )}

      {activeTab === 'SIMULADOR' && (
        <div className="space-y-6">
          <SimulatorCard
            isSimulating={isSimulating}
            onAddReceita={adicionarSimulacaoReceita}
            onAddDespesa={adicionarSimulacaoDespesa}
            onClear={limparSimulacao}
          />

          <HealthCard health={analysis.health} />
          <ForecastCard forecast={analysis.forecast} />
        </div>
      )}

      {activeTab === 'CONFIG' && (
        <div className="space-y-6">
          <AssistantSettingsCard settings={settings} onUpdateSettings={updateSettings} />
          <Sprint6PrepView />
        </div>
      )}
    </div>
  );
};
