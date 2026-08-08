import {
  findOrCreateSpreadsheet,
  syncDataToSpreadsheet,
  fetchTransactionsFromSpreadsheet,
  fetchAllDataFromSpreadsheet,
  toSafeString
} from '../../lib/googleAuth';

export class SheetsService {
  static async obterOuCriarPlanilha(token?: any): Promise<string> {
    const safeToken = toSafeString(token);
    return await findOrCreateSpreadsheet(safeToken);
  }

  static async sincronizarTudo(
    token: any,
    spreadsheetId: any,
    transactions: any[],
    infractions: any[] = [],
    riskZones: any[] = [],
    medicalAppointments: any[] = [],
    medicalPrescriptions: any[] = [],
    compromissos: any[] = [],
    registeredVehicles: any[] = [],
    carServicesPerformed: any[] = [],
    carServicesScheduled: any[] = [],
    bankAccounts: any[] = [],
    creditCards: any[] = [],
    categoryBudgets: { [category: string]: number } = {},
    customCategories: string[] = [],
    groceryItems: any[] = [],
    forceOverwrite: boolean = false,
    sheetTxCount?: number,
    deletedIds: (string | number)[] = [],
    origem: string = 'sincronizarTudo'
  ) {
    const safeToken = toSafeString(token);
    const safeSheetId = toSafeString(spreadsheetId);

    const stackStr = new Error().stack || '';
    const nowStr = new Date().toLocaleString('pt-BR');
    const txCount = Array.isArray(transactions) ? transactions.length : 0;

    console.log('=========================');
    console.log(`ORIGEM: ${origem}`);
    console.log(`Quantidade de registros: ${txCount}`);
    console.log(`IDs excluídos explicitamente (${deletedIds.length}):`, deletedIds);
    console.log(`Horário: ${nowStr}`);
    console.log(`Call Stack completo:\n${stackStr}`);
    console.log('====================');

    return await syncDataToSpreadsheet(
      safeToken,
      safeSheetId,
      transactions,
      infractions,
      riskZones,
      medicalAppointments,
      medicalPrescriptions,
      compromissos,
      registeredVehicles,
      carServicesPerformed,
      carServicesScheduled,
      bankAccounts,
      creditCards,
      categoryBudgets,
      customCategories,
      groceryItems,
      forceOverwrite,
      sheetTxCount,
      [],
      [],
      [],
      [],
      [],
      deletedIds,
      origem
    );
  }

  static async buscarTransacoes(token: any, spreadsheetId: any): Promise<any[]> {
    return await fetchTransactionsFromSpreadsheet(toSafeString(token), toSafeString(spreadsheetId));
  }

  static async buscarTodosDados(token: any, spreadsheetId: any) {
    return await fetchAllDataFromSpreadsheet(toSafeString(token), toSafeString(spreadsheetId));
  }
}

export const sheetsService = SheetsService;
