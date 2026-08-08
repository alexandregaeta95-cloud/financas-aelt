import {
  getTransactionsFromDb,
  saveTransactionToDb,
  deleteTransactionFromDb
} from '../../../lib/localSync';
import { sheetsService } from '../../../services/sheets';
import { Transaction } from '../types';

export class TransactionService {
  /**
   * Listar todas as transações cadastradas
   */
  static async listarTransacoes(): Promise<Transaction[]> {
    return await getTransactionsFromDb();
  }

  /**
   * Buscar uma transação por ID
   */
  static async buscarTransacao(id: number | string): Promise<Transaction | undefined> {
    const list = await this.listarTransacoes();
    return list.find(t => String(t.id) === String(id));
  }

  /**
   * Salvar/criar uma nova transação
   */
  static async salvarTransacao(tx: Transaction): Promise<void> {
    await saveTransactionToDb(tx);
  }

  /**
   * Editar uma transação existente
   */
  static async editarTransacao(tx: Transaction): Promise<void> {
    await saveTransactionToDb(tx);
  }

  /**
   * Excluir uma transação pelo ID
   */
  static async excluirTransacao(id: number | string): Promise<void> {
    await deleteTransactionFromDb(id);
  }

  /**
   * Sincronizar transações com o Google Sheets
   */
  static async sincronizarGoogleSheets(token: string, spreadsheetId: string, transactions?: Transaction[]): Promise<void> {
    const txs = transactions || await this.listarTransacoes();
    const stackStr = new Error().stack || '';
    const nowStr = new Date().toLocaleString('pt-BR');
    const txCount = Array.isArray(txs) ? txs.length : 0;

    console.log('=========================');
    console.log('ORIGEM: transactionService');
    console.log(`Quantidade de registros: ${txCount}`);
    console.log(`Horário: ${nowStr}`);
    console.log(`Call Stack completo:\n${stackStr}`);
    console.log('====================');

    await sheetsService.sincronizarTudo(
      token,
      spreadsheetId,
      txs,
      [], [], [], [], [], [], [], [], [], [], {}, [], [], false, undefined, [], 'transactionService'
    );
  }
}

export const transactionService = TransactionService;
