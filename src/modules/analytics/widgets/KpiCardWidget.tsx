import React from 'react';
import { KPI } from '../types';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  PiggyBank,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';

interface Props {
  kpi: KPI;
}

export const KpiCardWidget: React.FC<Props> = ({ kpi }) => {
  const getIcon = () => {
    switch (kpi.icon) {
      case 'TrendingUp':
        return <TrendingUp className="w-5 h-5 text-emerald-500" />;
      case 'TrendingDown':
        return <TrendingDown className="w-5 h-5 text-rose-500" />;
      case 'Wallet':
        return <Wallet className="w-5 h-5 text-sky-500" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-indigo-500" />;
      case 'PiggyBank':
        return <PiggyBank className="w-5 h-5 text-amber-500" />;
      case 'ShieldCheck':
        return <ShieldCheck className="w-5 h-5 text-teal-500" />;
      default:
        return <Activity className="w-5 h-5 text-sky-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (kpi.status) {
      case 'EXCELLENT':
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case 'GOOD':
        return 'bg-sky-500/10 text-sky-600 border-sky-500/20';
      case 'WARNING':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border-slate-500/20';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-5 shadow-xs hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
            {getIcon()}
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {kpi.title}
          </span>
        </div>
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${getStatusBadge()}`}>
          {kpi.status}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between">
        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          {kpi.formattedValue}
        </div>

        {kpi.changePercentage !== undefined && (
          <div
            className={`flex items-center text-xs font-semibold ${
              kpi.changePercentage >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {kpi.changePercentage > 0 ? (
              <ArrowUpRight className="w-4 h-4 mr-0.5" />
            ) : kpi.changePercentage < 0 ? (
              <ArrowDownRight className="w-4 h-4 mr-0.5" />
            ) : (
              <Minus className="w-4 h-4 mr-0.5" />
            )}
            {Math.abs(kpi.changePercentage)}%
          </div>
        )}
      </div>

      {kpi.description && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
          {kpi.description}
        </p>
      )}
    </div>
  );
};
