import React from 'react';
import { AnalyticsFilter, TimePeriodFilter } from '../types';
import { Filter, RefreshCw, Calendar, Tag, Building2, Car } from 'lucide-react';

interface Props {
  filter: AnalyticsFilter;
  onFilterChange: (newFilter: Partial<AnalyticsFilter>) => void;
  onRefresh: () => void;
  loading: boolean;
}

export const FilterBar: React.FC<Props> = ({
  filter,
  onFilterChange,
  onRefresh,
  loading,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium text-sm">
          <Filter className="w-4 h-4 text-sky-500" />
          <span>Filtros do Dashboard Executivo</span>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Dados</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mt-3">
        {/* Periodo */}
        <div className="relative">
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
            <Calendar className="w-3 h-3 inline mr-1" /> Período
          </label>
          <select
            value={filter.period}
            onChange={e => onFilterChange({ period: e.target.value as TimePeriodFilter })}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="TODAY">Hoje</option>
            <option value="YESTERDAY">Ontem</option>
            <option value="WEEK">Esta Semana</option>
            <option value="MONTH">Mês Atual</option>
            <option value="QUARTER">Trimestre</option>
            <option value="SEMESTER">Semestre</option>
            <option value="YEAR">Ano Atual</option>
            <option value="PREVIOUS_YEAR">Ano Anterior</option>
          </select>
        </div>

        {/* Tipo */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
            Tipo
          </label>
          <select
            value={filter.type || 'TODOS'}
            onChange={e => onFilterChange({ type: e.target.value as 'RECEITA' | 'DESPESA' | 'TODOS' })}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="TODOS">Todos os Fluxos</option>
            <option value="RECEITA">Apenas Receitas</option>
            <option value="DESPESA">Apenas Despesas</option>
          </select>
        </div>

        {/* Categoria */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
            <Tag className="w-3 h-3 inline mr-1" /> Categoria
          </label>
          <input
            type="text"
            placeholder="Todas categorias..."
            value={filter.category || ''}
            onChange={e => onFilterChange({ category: e.target.value || undefined })}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Banco */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
            <Building2 className="w-3 h-3 inline mr-1" /> Banco
          </label>
          <input
            type="text"
            placeholder="Todos os bancos..."
            value={filter.bank || ''}
            onChange={e => onFilterChange({ bank: e.target.value || undefined })}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        {/* Veiculo */}
        <div>
          <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
            <Car className="w-3 h-3 inline mr-1" /> Veículo
          </label>
          <input
            type="text"
            placeholder="Todos veículos..."
            value={filter.vehicleId || ''}
            onChange={e => onFilterChange({ vehicleId: e.target.value || undefined })}
            className="w-full text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>
    </div>
  );
};
