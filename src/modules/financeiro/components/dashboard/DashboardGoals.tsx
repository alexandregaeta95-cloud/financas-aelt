import React from 'react';
import { Target, Plus, ArrowUpRight, ArrowDownRight, Edit3, Trash2, PiggyBank } from 'lucide-react';
import { SavingsGoal } from '../../../../types';

export interface DashboardGoalsProps {
  savingsGoals: SavingsGoal[];
  onOpenGoalModal: (goal?: SavingsGoal) => void;
  onOpenTransferModal: (type: 'DEPOSIT' | 'WITHDRAW', goalId: string) => void;
  hideValuesMode: boolean;
}

export const DashboardGoals: React.FC<DashboardGoalsProps> = React.memo(({
  savingsGoals,
  onOpenGoalModal,
  onOpenTransferModal,
  hideValuesMode,
}) => {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Metas Financeiras & Objetivos</h3>
            <p className="text-[11px] text-slate-400">Acompanhamento do progresso de reserva e objetivos</p>
          </div>
        </div>
        <button
          onClick={() => onOpenGoalModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nova Meta</span>
        </button>
      </div>

      {savingsGoals.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
          <PiggyBank className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-xs font-semibold text-slate-400 mb-1">Nenhuma meta criada ainda</p>
          <p className="text-[11px] text-slate-500 max-w-sm mx-auto mb-3">
            Defina objetivos de reserva financeira para viagem, reserva de emergência ou aquisições.
          </p>
          <button
            onClick={() => onOpenGoalModal()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs rounded-xl border border-slate-700"
          >
            Criar Minha Primeira Meta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {savingsGoals.map((goal) => {
            const pct = Math.min(100, Math.round(((goal.valorAtual || 0) / (goal.valorAlvo || 1)) * 100));
            return (
              <div
                key={goal.id}
                className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3 relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white truncate">{goal.nome}</span>
                    <button
                      onClick={() => onOpenGoalModal(goal)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {goal.categoria && (
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-md font-mono">
                      {goal.categoria}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline text-xs font-mono">
                    <span className={`font-bold text-emerald-400 ${hideValuesMode ? 'blur-[4px]' : ''}`}>
                      R$ {(goal.valorAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      de R$ {(goal.valorAlvo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>{pct}% concluído</span>
                    {goal.prazo && <span>Prazo: {goal.prazo}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-900">
                  <button
                    onClick={() => onOpenTransferModal('DEPOSIT', goal.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all"
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Aportar</span>
                  </button>
                  <button
                    onClick={() => onOpenTransferModal('WITHDRAW', goal.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-semibold transition-all"
                  >
                    <ArrowDownRight className="w-3 h-3" />
                    <span>Resgatar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

DashboardGoals.displayName = 'DashboardGoals';
