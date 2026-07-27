import React from 'react';
import { Wallet, Eye, EyeOff, LayoutDashboard, PieChart as PieChartIcon } from 'lucide-react';

export interface DashboardHeaderProps {
  showBalance: boolean;
  setShowBalance: React.Dispatch<React.SetStateAction<boolean>>;
  hideValuesMode: boolean;
  setHideValuesMode: React.Dispatch<React.SetStateAction<boolean>>;
  dashboardTab: 'geral' | 'orcamento';
  setDashboardTab: (tab: 'geral' | 'orcamento') => void;
  selectedMonthKey: string;
  setSelectedMonthKey: (key: string) => void;
  availableMonths: string[];
  formatMonthKey: (key: string) => string;
  onNavigate: (tab: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = React.memo(({
  showBalance,
  setShowBalance,
  hideValuesMode,
  setHideValuesMode,
  dashboardTab,
  setDashboardTab,
  selectedMonthKey,
  setSelectedMonthKey,
  availableMonths,
  formatMonthKey,
  onNavigate,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Visão Geral Financeira
          </h1>
          <p className="text-xs text-slate-400">
            Acompanhamento consolidado de saldos, metas, veículos e contas
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Period Selector */}
        <div className="relative">
          <select
            value={selectedMonthKey}
            onChange={(e) => setSelectedMonthKey(e.target.value)}
            className="text-xs font-semibold bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {availableMonths.map((mKey) => (
              <option key={mKey} value={mKey}>
                {formatMonthKey(mKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Tab Toggle: Geral vs Orçamento */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setDashboardTab('geral')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              dashboardTab === 'geral'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Geral</span>
          </button>
          <button
            onClick={() => setDashboardTab('orcamento')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              dashboardTab === 'orcamento'
                ? 'bg-emerald-500 text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PieChartIcon className="w-3.5 h-3.5" />
            <span>Orçamentos</span>
          </button>
        </div>

        {/* Privacy / Hide Values mode */}
        <button
          onClick={() => setHideValuesMode(!hideValuesMode)}
          className={`p-2.5 rounded-xl border transition-all ${
            hideValuesMode
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
          }`}
          title={hideValuesMode ? 'Mostrar valores na tela' : 'Ocultar valores por privacidade'}
        >
          {hideValuesMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>

        {/* BI Dashboard Navigation button */}
        <button
          onClick={() => onNavigate('analytics')}
          className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 rounded-xl text-xs font-bold transition-all"
        >
          <span>Dashboard BI</span>
        </button>
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
