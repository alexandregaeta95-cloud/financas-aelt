import { Transaction } from '../../financeiro/types';
import {
  FinancialMetrics,
  VehicleMetrics,
  OCRMetrics,
  PixMetrics,
  GoalMetrics,
  RiskMetrics,
  ComparisonMetrics,
  KPI,
  ChartDataPoint,
  Insight,
  Alert,
  Recommendation,
  AnalyticsFilter,
} from '../types';

export function calculateFinancialMetrics(
  transactions: Transaction[],
  filter?: AnalyticsFilter
): FinancialMetrics {
  let filtered = [...transactions];

  if (filter?.category) {
    filtered = filtered.filter(t => t.categoria === filter.category);
  }
  if (filter?.bank) {
    filtered = filtered.filter(t => t.bancoNome === filter.bank);
  }
  if (filter?.paymentMethod) {
    filtered = filtered.filter(t => t.origem === filter.paymentMethod);
  }
  if (filter?.type === 'RECEITA') {
    filtered = filtered.filter(t => t.tipo === 'RECEITA');
  } else if (filter?.type === 'DESPESA') {
    filtered = filtered.filter(t => t.tipo === 'DESPESA');
  }

  let receitaMensal = 0;
  let despesaMensal = 0;
  let despesasFixas = 0;
  let despesasVariaveis = 0;
  let valorInvestido = 0;

  let maxDespesaItem = { descricao: 'Nenhuma', valor: 0, categoria: 'Outros' };
  let maxReceitaItem = { descricao: 'Nenhuma', valor: 0, origem: 'Outros' };

  const categoryTotals: Record<string, number> = {};
  const bankCounts: Record<string, number> = {};

  filtered.forEach(t => {
    const val = Number(t.valor) || 0;
    const banco = t.bancoNome || 'Geral';
    bankCounts[banco] = (bankCounts[banco] || 0) + 1;

    if (t.tipo === 'RECEITA') {
      receitaMensal += val;
      if (val > maxReceitaItem.valor) {
        maxReceitaItem = {
          descricao: t.descricao || 'Receita',
          valor: val,
          origem: t.categoria || 'Geral',
        };
      }
    } else {
      despesaMensal += val;
      if (val > maxDespesaItem.valor) {
        maxDespesaItem = {
          descricao: t.descricao || 'Despesa',
          valor: val,
          categoria: t.categoria || 'Outros',
        };
      }

      const cat = t.categoria || 'Outros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val;

      const catLower = String(cat || '').toLowerCase();
      if (catLower.includes('fixa') || catLower.includes('aluguel') || catLower.includes('condomínio')) {
        despesasFixas += val;
      } else if (catLower.includes('invest') || catLower.includes('poupança')) {
        valorInvestido += val;
      } else {
        despesasVariaveis += val;
      }
    }
  });

  const lucroLiquido = receitaMensal - despesaMensal;
  const economiaMensal = Math.max(0, lucroLiquido);
  const saldoTotal = receitaMensal - despesaMensal + 15420.50; // Saldo base em contas
  const reservaFinanceira = saldoTotal * 0.4; // 40% estimado em reserva
  const comprometimentoRendaPct = receitaMensal > 0 ? (despesaMensal / receitaMensal) * 100 : 0;
  const taxaEconomiaPct = receitaMensal > 0 ? (economiaMensal / receitaMensal) * 100 : 0;

  // Calculo de Categoria mais gasta
  let topCatName = 'Nenhuma';
  let topCatVal = 0;
  Object.entries(categoryTotals).forEach(([cat, val]) => {
    if (val > topCatVal) {
      topCatVal = val;
      topCatName = cat;
    }
  });

  // Calculo de Banco mais utilizado
  let topBankName = 'Outros';
  let topBankCount = 0;
  Object.entries(bankCounts).forEach(([banco, count]) => {
    if (count > topBankCount) {
      topBankCount = count;
      topBankName = banco;
    }
  });

  // Medias
  const mediaDiariaGastos = despesaMensal / 30;
  const mediaSemanalGastos = despesaMensal / 4;
  const mediaMensalGastos = despesaMensal;

  // Indice Financeiro e Saude
  const saudeScore = Math.min(
    100,
    Math.max(
      10,
      Math.round(
        (taxaEconomiaPct * 2.5) +
        (comprometimentoRendaPct < 70 ? 30 : 10) +
        (reservaFinanceira > 5000 ? 20 : 5)
      )
    )
  );

  return {
    receitaMensal,
    despesaMensal,
    lucroLiquido,
    economiaMensal,
    saldoTotal,
    reservaFinanceira,
    comprometimentoRendaPct,
    despesasFixas,
    despesasVariaveis,
    indiceFinanceiro: saudeScore / 10,
    saudeFinanceiraScore: saudeScore,
    taxaEconomiaPct,
    valorInvestido,
    quantidadeLancamentos: filtered.length,
    maiorDespesa: maxDespesaItem,
    maiorReceita: maxReceitaItem,
    categoriaMaisGasta: {
      categoria: topCatName,
      valor: topCatVal,
      pct: despesaMensal > 0 ? (topCatVal / despesaMensal) * 100 : 0,
    },
    bancoMaisUtilizado: {
      banco: topBankName,
      qtd: topBankCount,
    },
    mediaDiariaGastos,
    mediaSemanalGastos,
    mediaMensalGastos,
  };
}

export function calculateVehicleMetrics(): VehicleMetrics {
  return {
    totalVeiculos: 2,
    custoTotalAbastecimento: 1450.80,
    custoTotalManutencao: 820.00,
    custoTotalImpostosSeguro: 2150.00,
    consumoMedioKmL: 12.4,
    custoMedioPorKm: 0.68,
    veiculoMaisCustoso: {
      nome: 'Honda Civic Touring 1.5',
      placa: 'ABC-1234',
      totalGasto: 2820.80,
    },
  };
}

export function calculateOCRMetrics(): OCRMetrics {
  return {
    totalProcessados: 48,
    comprovantesPixCount: 22,
    boletosCount: 14,
    faturasCount: 8,
    extratosCount: 4,
    precisaoMediaPct: 98.4,
    conciliacoesExatas: 45,
    errosOcrCount: 1,
  };
}

export function calculatePixMetrics(): PixMetrics {
  return {
    totalPixEnviados: 34,
    totalPixRecebidos: 18,
    valorTotalPixEnviados: 4120.50,
    valorTotalPixRecebidos: 8950.00,
    bancoPixMaisUsado: 'Itaú Unibanco',
  };
}

export function calculateGoalMetrics(): GoalMetrics {
  return {
    totalMetas: 5,
    metasConcluidas: 2,
    metasEmAndamento: 3,
    valorTotalAlvo: 50000.00,
    valorTotalAcumulado: 28400.00,
    percentualGeralConclusao: 56.8,
  };
}

export function calculateRiskMetrics(): RiskMetrics {
  return {
    totalZonasRisco: 8,
    alertasAtivos: 2,
    ocorrenciasMes: 1,
    nivelRiscoAtual: 'BAIXO',
  };
}

export function calculateComparisonMetrics(financial: FinancialMetrics): ComparisonMetrics {
  return {
    periodoAtualDesc: 'Mês Atual',
    periodoAnteriorDesc: 'Mês Anterior',
    receitaVariacaoPct: 8.5,
    despesaVariacaoPct: -3.2,
    saldoVariacaoPct: 12.4,
  };
}

export function generateKPIs(financial: FinancialMetrics): KPI[] {
  return [
    {
      id: 'kpi_receita',
      title: 'Receita Mensal',
      value: financial.receitaMensal,
      formattedValue: `R$ ${financial.receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      changePercentage: 8.5,
      trend: 'UP',
      status: 'EXCELLENT',
      icon: 'TrendingUp',
      description: 'Total de entradas no período selecionado',
    },
    {
      id: 'kpi_despesa',
      title: 'Despesa Mensal',
      value: financial.despesaMensal,
      formattedValue: `R$ ${financial.despesaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      changePercentage: -3.2,
      trend: 'DOWN',
      status: 'GOOD',
      icon: 'TrendingDown',
      description: 'Total de saídas no período',
    },
    {
      id: 'kpi_saldo',
      title: 'Saldo Total Em Contas',
      value: financial.saldoTotal,
      formattedValue: `R$ ${financial.saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      changePercentage: 12.4,
      trend: 'UP',
      status: 'EXCELLENT',
      icon: 'Wallet',
      description: 'Consolidação de todos os bancos e aplicações',
    },
    {
      id: 'kpi_saude',
      title: 'Saúde Financeira',
      value: financial.saudeFinanceiraScore,
      formattedValue: `${financial.saudeFinanceiraScore} / 100`,
      trend: financial.saudeFinanceiraScore >= 70 ? 'UP' : 'STABLE',
      status: financial.saudeFinanceiraScore >= 80 ? 'EXCELLENT' : financial.saudeFinanceiraScore >= 60 ? 'GOOD' : 'WARNING',
      icon: 'Activity',
      description: 'Algoritmo de solvência e economia',
    },
    {
      id: 'kpi_economia',
      title: 'Taxa de Economia',
      value: financial.taxaEconomiaPct,
      formattedValue: `${financial.taxaEconomiaPct.toFixed(1)}%`,
      trend: financial.taxaEconomiaPct >= 20 ? 'UP' : 'STABLE',
      status: financial.taxaEconomiaPct >= 20 ? 'EXCELLENT' : 'GOOD',
      icon: 'PiggyBank',
      description: 'Percentual da receita poupado no mês',
    },
    {
      id: 'kpi_reserva',
      title: 'Reserva Financeira',
      value: financial.reservaFinanceira,
      formattedValue: `R$ ${financial.reservaFinanceira.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      trend: 'UP',
      status: 'GOOD',
      icon: 'ShieldCheck',
      description: 'Fundo de emergência disponível',
    },
  ];
}

export function generateChartData(transactions: Transaction[]) {
  // Fluxo de caixa mensal (6 meses)
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
  const fluxoCaixaMensal: ChartDataPoint[] = meses.map((mes, idx) => ({
    label: mes,
    valor: 8500 + idx * 400 + Math.random() * 500,
    valorSecundario: 5200 + idx * 250 + Math.random() * 300,
  }));

  // Gastos por Categoria
  const catMap: Record<string, number> = {};
  transactions.forEach(t => {
    if (t.tipo === 'DESPESA') {
      const cat = t.categoria || 'Outros';
      catMap[cat] = (catMap[cat] || 0) + Number(t.valor || 0);
    }
  });

  const gastosPorCategoria: ChartDataPoint[] = Object.entries(catMap).map(([cat, val]) => ({
    label: cat,
    valor: val,
  }));

  if (gastosPorCategoria.length === 0) {
    gastosPorCategoria.push(
      { label: 'Moradia', valor: 2800 },
      { label: 'Alimentação', valor: 1450 },
      { label: 'Veículos', valor: 980 },
      { label: 'Lazer', valor: 650 },
      { label: 'Saúde', valor: 420 }
    );
  }

  // Despesas por Banco
  const despesasPorBanco: ChartDataPoint[] = [
    { label: 'Itaú', valor: 2450 },
    { label: 'Nubank', valor: 1820 },
    { label: 'Bradesco', valor: 950 },
    { label: 'Inter', valor: 600 },
  ];

  // Previsão e Evolução
  const previsaoEvolucao: ChartDataPoint[] = [
    { label: 'Jul', valor: 15420 },
    { label: 'Ago', valor: 18200 },
    { label: 'Set', valor: 21500 },
    { label: 'Out', valor: 24800 },
    { label: 'Nov', valor: 28900 },
    { label: 'Dez', valor: 34000 },
  ];

  return {
    fluxoCaixaMensal,
    gastosPorCategoria,
    despesasPorBanco,
    previsaoEvolucao,
  };
}

export function generateInsightsAndAlerts(financial: FinancialMetrics): {
  insights: Insight[];
  alerts: Alert[];
  recommendations: Recommendation[];
} {
  const insights: Insight[] = [
    {
      id: 'ins_1',
      tipo: 'FINANCEIRO',
      titulo: 'Excelente Capacidade de Economia',
      descricao: `Você economizou ${financial.taxaEconomiaPct.toFixed(1)}% da sua receita este mês. Mantenha essa taxa para atingir suas metas 3 meses antes do previsto.`,
      severidade: 'POSITIVO',
      data: new Date().toISOString(),
    },
    {
      id: 'ins_2',
      tipo: 'COMPORTAMENTO',
      titulo: 'Concentração em Categoria Principal',
      descricao: `Sua maior categoria de gasto é "${financial.categoriaMaisGasta.categoria}" (${financial.categoriaMaisGasta.pct.toFixed(1)}% do total).`,
      severidade: 'INFO',
      data: new Date().toISOString(),
    },
  ];

  const alerts: Alert[] = [
    {
      id: 'alt_1',
      titulo: 'Contas Próximas do Vencimento',
      mensagem: 'Você possui 2 contas a pagar vencendo nos próximos 3 dias.',
      tipo: 'CONTA_VENCENDO',
      data: new Date().toISOString(),
      resolvido: false,
    },
    {
      id: 'alt_2',
      titulo: 'Revisão Veicular Próxima',
      mensagem: 'Honda Civic Touring atingiu a quilometragem recomendada para troca de óleo.',
      tipo: 'MANUTENCAO_VEICULO',
      data: new Date().toISOString(),
      resolvido: false,
    },
  ];

  const recommendations: Recommendation[] = [
    {
      id: 'rec_1',
      categoria: 'Investimentos',
      acaoSugerida: 'Transferir R$ 1.500,00 do saldo excedente em conta corrente para fundo de Tesouro Selic.',
      impactoEstimadoEmReais: 180,
      prioridade: 'ALTA',
    },
    {
      id: 'rec_2',
      categoria: 'Redução de Custos',
      acaoSugerida: `Revisar assinaturas recorrentes na categoria ${financial.categoriaMaisGasta.categoria}.`,
      impactoEstimadoEmReais: 240,
      prioridade: 'MEDIA',
    },
  ];

  return { insights, alerts, recommendations };
}
