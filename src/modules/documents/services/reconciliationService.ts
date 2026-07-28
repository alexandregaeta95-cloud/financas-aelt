import { BankStatementItem, ReconciliationResult } from '../types';

export class ReconciliationService {
  /**
   * Compares extracted bank statement / document items against existing system transactions
   */
  public static conciliar(
    itensExtrato: BankStatementItem[],
    transacoesExistentes: Array<{ id: string | number; data: string; descricao: string; valor: number; tipo: string }>
  ): ReconciliationResult[] {
    return itensExtrato.map((item) => {
      // Find matching item by date and amount
      const valorItem = item.valor;
      const dataItem = item.data;

      const matchExato = transacoesExistentes.find((t) => {
        const mesmoValor = Math.abs(t.valor) === Math.abs(valorItem);
        const mesmaData = t.data === dataItem;
        return mesmoValor && mesmaData;
      });

      if (matchExato) {
        return {
          transacaoExtrato: item,
          transacaoExistenteId: matchExato.id,
          statusConciliacao: 'DUPLICADA',
          divergenciaMensagem: 'Transação idêntica já cadastrada no sistema.'
        };
      }

      // Check for partial match (same description or close date with different value)
      const matchDivergente = transacoesExistentes.find((t) => {
        const tDesc = (t.descricao || '').toLowerCase();
        const itemDesc = (item.descricao || '').toLowerCase();
        const descSimilar = tDesc.includes(itemDesc) || itemDesc.includes(tDesc);
        const mesmaData = t.data === dataItem;
        return descSimilar && mesmaData;
      });

      if (matchDivergente) {
        return {
          transacaoExtrato: item,
          transacaoExistenteId: matchDivergente.id,
          statusConciliacao: 'DIVERGENTE',
          divergenciaMensagem: `Valor divergente. Cadastrado: R$ ${matchDivergente.valor.toFixed(2)}, Extrato: R$ ${valorItem.toFixed(2)}`
        };
      }

      return {
        transacaoExtrato: item,
        statusConciliacao: 'PENDENTE',
        divergenciaMensagem: 'Nova transação pronta para importação.'
      };
    });
  }
}
