import React, { useState } from 'react';
import { GoalProgress } from '../types';
import { GoalsManager } from '../goals/goalsManager';

interface GoalsCardProps {
  goals: GoalProgress[];
}

export const GoalsCard: React.FC<GoalsCardProps> = ({ goals: initialGoals }) => {
  const [goals, setGoals] = useState<GoalProgress[]>(initialGoals);
  const [isAdding, setIsAdding] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [valorAtual, setValorAtual] = useState('');
  const [dataLimite, setDataLimite] = useState('');

  const handleSaveNewGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo || !valorAlvo) return;

    const newGoalRaw = {
      id: `goal-${Date.now()}`,
      titulo,
      valorAlvo: parseFloat(valorAlvo.replace(',', '.')),
      valorAtual: parseFloat((valorAtual || '0').replace(',', '.')),
      dataLimite: dataLimite || '2026-12-31'
    };

    const updatedRawList = [...goals.map(g => ({
      id: g.id,
      titulo: g.titulo,
      valorAlvo: g.valorAlvo,
      valorAtual: g.valorAtual,
      dataLimite: g.dataLimite
    })), newGoalRaw];

    GoalsManager.salvarMetas(updatedRawList);
    setGoals(GoalsManager.obterMetas());
    setTitulo('');
    setValorAlvo('');
    setValorAtual('');
    setDataLimite('');
    setIsAdding(false);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-2xl">flag</span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Gerenciamento de Metas Financeiras
            </h3>
            <p className="text-[11px] text-slate-400">
              Acompanhamento de alvos, estimativas de conclusão e aportes recomendados.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono rounded-lg cursor-pointer transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">{isAdding ? 'close' : 'add'}</span>
          {isAdding ? 'Cancelar' : 'Nova Meta'}
        </button>
      </div>

      {isAdding && (
        <form onSubmit={handleSaveNewGoal} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 font-mono text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Título da Meta</label>
              <input
                type="text"
                placeholder="Ex: Compra do Carro"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Valor Alvo (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="20000"
                value={valorAlvo}
                onChange={(e) => setValorAlvo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                required
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Valor Atual Já Salvo (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="5000"
                value={valorAtual}
                onChange={(e) => setValorAtual(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Data Limite Desejada</label>
              <input
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
          >
            Salvar Meta Financeira
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {goals.map((g) => (
          <div key={g.id} className="p-4 bg-slate-950/70 border border-slate-850 rounded-xl space-y-2 font-mono">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-white">{g.titulo}</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                  g.statusGoal === 'CONCLUÍDA'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : g.statusGoal === 'RISCO' || g.statusGoal === 'ATRASADA'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                }`}
              >
                {g.statusGoal} ({g.percentualConcluido}%)
              </span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  g.percentualConcluido >= 100
                    ? 'bg-emerald-500'
                    : g.statusGoal === 'RISCO'
                    ? 'bg-rose-500'
                    : 'bg-indigo-500'
                }`}
                style={{ width: `${g.percentualConcluido}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Atual: R$ {g.valorAtual.toLocaleString('pt-BR')}</span>
              <span>Alvo: R$ {g.valorAlvo.toLocaleString('pt-BR')}</span>
            </div>

            <div className="text-[10px] text-indigo-300 bg-slate-900/60 p-2 rounded border border-slate-800 flex justify-between">
              <span>Aporte Sugerido: R$ {g.depositoMensalSugerido}/mês</span>
              <span>Conclusão Prev.: {new Date(g.dataEstimadaConclusao).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
