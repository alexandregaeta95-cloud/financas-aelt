import { Transaction } from '../../../types';
import { Recommendation, BudgetAnalysis, FinancialHealth } from '../types';

export class RecommendationEngine {
  public static gerarRecomendacoes(
    transactions: Transaction[],
    budget: BudgetAnalysis,
    health: FinancialHealth
  ): Recommendation[] {
    const recs: Recommendation[] = [];

    // 1. Reserve recommendation if reserve score is low
    if (health.details.reservaScore < 60) {
      recs.push({
        id: 'rec-reserva-1',
        title: 'Criar Reserva de Emergência Automatizada',
        description: 'Destine pelo menos 10% de cada nova receita diretamente para uma conta de rendimento automático.',
        explicacaoLogica: 'Sua reserva de emergência atual cobre menos de 3 meses do seu custo de vida básico, aumentando sua vulnerabilidade a imprevistos.',
        impactoEstimado: 350,
        categoriaAcao: 'CRIAR_RESERVA',
        prioridade: 'ALTA'
      });
    }

    // 2. Reduce category overspend recommendation
    const overspent = budget.categories.find((c) => c.status === 'EXCEDIDO');
    if (overspent) {
      const economiaSugerida = Math.round(overspent.realizado * 0.15);
      recs.push({
        id: `rec-reduce-${overspent.categoria}`,
        title: `Reduzir Gastos na Categoria ${overspent.categoria}`,
        description: `Estabeleça um teto de R$ ${overspent.planejado} para ${overspent.categoria} cortando despesas supérfluas nos próximos 30 dias.`,
        explicacaoLogica: `A categoria ${overspent.categoria} excedeu o orçamento previsto em R$ ${Math.abs(overspent.diferenca)} este mês (${Math.round(overspent.percentualGasto)}% do limite).`,
        impactoEstimado: economiaSugerida,
        categoriaAcao: 'REDUZIR_GASTO',
        prioridade: 'ALTA'
      });
    }

    // 3. Renegotiate recurring expenses
    recs.push({
      id: 'rec-reneg-1',
      title: 'Renegociar Despesas Fixas Recorrentes',
      description: 'Revise assinaturas, planos de internet, telefonia e seguros para buscar tarifas promocionais.',
      explicacaoLogica: 'Análise histórica indica que faturas de serviços recorrentes tendem a acumular aumentos anuais sem contrapartida de benefícios.',
      impactoEstimado: 120,
      categoriaAcao: 'RENEGOCIAR',
      prioridade: 'MÉDIA'
    });

    // 4. Prioritize pending payments
    const pendingCount = transactions.filter((t) => (t.status || '').toUpperCase() === 'PENDENTE').length;
    if (pendingCount > 0) {
      recs.push({
        id: 'rec-prioritize-1',
        title: 'Priorizar Quitação de Contas Pendentes',
        description: 'Agende a liquidação de contas em aberto para evitar a incidência de juros e cobranças por atraso.',
        explicacaoLogica: `Existem ${pendingCount} lançamentos marcados como pendentes que podem gerar encargos se não forem pagos na data limite.`,
        impactoEstimado: 45,
        categoriaAcao: 'PRIORIZAR_PAGAMENTO',
        prioridade: 'ALTA'
      });
    }

    // 5. Investment increase if balance is strong
    if (health.score >= 75) {
      recs.push({
        id: 'rec-invest-1',
        title: 'Aumentar Aportes em Investimentos de Liquidez',
        description: 'Com sua saúde financeira excelente, direcione o excedente de caixa para opções de Renda Fixa ou Tesouro Direto.',
        explicacaoLogica: 'Seu saldo e fluxo de caixa estão altamente sustentáveis, permitindo maximizar a rentabilidade dos seus recursos parados.',
        impactoEstimado: 280,
        categoriaAcao: 'AUMENTAR_INVESTIMENTO',
        prioridade: 'MÉDIA'
      });
    }

    return recs;
  }
}
