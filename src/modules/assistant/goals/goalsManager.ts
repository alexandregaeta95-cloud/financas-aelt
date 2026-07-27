import { GoalProgress } from '../types';

const GOALS_STORAGE_KEY = 'wealthflow_savings_goals';

export class GoalsManager {
  public static obterMetas(): GoalProgress[] {
    try {
      const stored = localStorage.getItem(GOALS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((item: any) => GoalsManager.calcularProgressoMeta(item));
      }
    } catch (e) {
      console.error('Erro ao carregar metas', e);
    }
    // Return default goals if none stored
    const defaults: any[] = [
      {
        id: 'goal-1',
        titulo: 'Reserva de Emergência',
        valorAlvo: 15000,
        valorAtual: 6200,
        dataLimite: '2026-12-31'
      },
      {
        id: 'goal-2',
        titulo: 'Viagem de Férias',
        valorAlvo: 5000,
        valorAtual: 2800,
        dataLimite: '2026-10-15'
      }
    ];
    return defaults.map((item) => GoalsManager.calcularProgressoMeta(item));
  }

  public static salvarMetas(metas: any[]): void {
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(metas));
    } catch (e) {
      console.error('Erro ao salvar metas', e);
    }
  }

  public static calcularProgressoMeta(item: {
    id: string;
    titulo: string;
    valorAlvo: number;
    valorAtual: number;
    dataLimite: string;
  }): GoalProgress {
    const valorAlvo = item.valorAlvo || 1;
    const valorAtual = item.valorAtual || 0;
    const percentualConcluido = Math.min(100, Math.round((valorAtual / valorAlvo) * 100));

    const now = new Date();
    const limitDate = item.dataLimite ? new Date(item.dataLimite) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    const diffMs = limitDate.getTime() - now.getTime();
    const diasRestantes = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    const mesesRestantes = Math.max(1, Math.ceil(diasRestantes / 30));
    const restante = Math.max(0, valorAlvo - valorAtual);
    const depositoMensalSugerido = Math.round(restante / mesesRestantes);

    let statusGoal: GoalProgress['statusGoal'] = 'EM_DIA';
    if (percentualConcluido >= 100) {
      statusGoal = 'CONCLUÍDA';
    } else if (diasRestantes <= 0) {
      statusGoal = 'ATRASADA';
    } else if (percentualConcluido < 50 && diasRestantes < 60) {
      statusGoal = 'RISCO';
    }

    // Estimate completion date based on current monthly deposit rate
    const estDate = new Date();
    const estimatedMonths = depositoMensalSugerido > 0 ? Math.ceil(restante / (depositoMensalSugerido || 1)) : 12;
    estDate.setMonth(estDate.getMonth() + estimatedMonths);
    const dataEstimadaConclusao = estDate.toISOString().split('T')[0];

    return {
      id: item.id,
      titulo: item.titulo,
      valorAlvo,
      valorAtual,
      percentualConcluido,
      dataLimite: item.dataLimite || limitDate.toISOString().split('T')[0],
      dataEstimadaConclusao,
      statusGoal,
      diasRestantes,
      depositoMensalSugerido
    };
  }
}
