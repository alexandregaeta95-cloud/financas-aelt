import {
  getTransactionsFromDb,
  saveTransactionToDb,
  deleteTransactionFromDb,
} from '../../../lib/localSync';
import { safeJsonParse } from '../../../lib/safeParse';
import { Transaction } from '../types';
import { BankAccount, CreditCard, SavingsGoal, RegisteredVehicle } from '../../../types';

export interface TransactionDraftData {
  txType?: string;
  newTypeName?: string;
  amountStr?: string;
  category?: string;
  newCategoryName?: string;
  date?: string;
  desc?: string;
  status?: string;
  fuelType?: string;
  km?: string;
  litros?: string;
  precoLitro?: string;
  veiculo?: string;
  descricaoVeiculo?: string;
  valorPgStr?: string;
  completouTanque?: boolean;
  nomePosto?: string;
  localizacaoPosto?: string;
  motorista?: string;
  formaPagamento?: string;
  comprovanteUrl?: string;
  manualKmPercorrido?: string;
  manualMediaKmL?: string;
  obs?: string;
  formBankId?: number;
  formCartaoId?: string;
}

const DRAFT_KEYS = [
  'draft_txType',
  'draft_newTypeName',
  'draft_amountStr',
  'draft_category',
  'draft_newCategoryName',
  'draft_date',
  'draft_desc',
  'draft_status',
  'draft_fuelType',
  'draft_km',
  'draft_litros',
  'draft_precoLitro',
  'draft_veiculo',
  'draft_descricaoVeiculo',
  'draft_valorPgStr',
  'draft_completouTanque',
  'draft_nomePosto',
  'draft_localizacaoPosto',
  'draft_motorista',
  'draft_formaPagamento',
  'draft_comprovanteUrl',
  'draft_manualKmPercorrido',
  'draft_manualMediaKmL',
  'draft_obs',
  'draft_formBankId',
  'draft_formCartaoId',
] as const;

export class FinanceStorage {
  // --- Transactions ---
  static async getTransactions(): Promise<Transaction[]> {
    return await getTransactionsFromDb();
  }

  static async saveTransaction(tx: Transaction): Promise<void> {
    await saveTransactionToDb(tx);
  }

  static async deleteTransaction(id: number | string): Promise<void> {
    await deleteTransactionFromDb(id);
  }

  // --- Bank Accounts ---
  static getBankAccounts(): BankAccount[] {
    try {
      const saved = localStorage.getItem('wealthflow_bank_accounts');
      return saved ? safeJsonParse(saved, []) : [];
    } catch {
      return [];
    }
  }

  static saveBankAccounts(accounts: BankAccount[]): void {
    try {
      localStorage.setItem('wealthflow_bank_accounts', JSON.stringify(accounts));
    } catch (e) {
      console.warn('Erro ao salvar contas bancárias no localStorage:', e);
    }
  }

  // --- Credit Cards ---
  static getCreditCards(): CreditCard[] {
    try {
      const saved = localStorage.getItem('wealthflow_credit_cards');
      return saved ? safeJsonParse(saved, []) : [];
    } catch {
      return [];
    }
  }

  static saveCreditCards(cards: CreditCard[]): void {
    try {
      localStorage.setItem('wealthflow_credit_cards', JSON.stringify(cards));
    } catch (e) {
      console.warn('Erro ao salvar cartões de crédito no localStorage:', e);
    }
  }

  // --- Category Budgets ---
  static getCategoryBudgets(): Record<string, number> {
    try {
      const saved = localStorage.getItem('wealthflow_category_budgets');
      return saved ? safeJsonParse(saved, {}) : {};
    } catch {
      return {};
    }
  }

  static saveCategoryBudgets(budgets: Record<string, number>): void {
    try {
      localStorage.setItem('wealthflow_category_budgets', JSON.stringify(budgets));
    } catch (e) {
      console.warn('Erro ao salvar orçamentos no localStorage:', e);
    }
  }

  // --- Hide Values Mode ---
  static getHideValuesMode(): boolean {
    try {
      return localStorage.getItem('wealthflow_hide_values_mode') === 'true';
    } catch {
      return false;
    }
  }

  static saveHideValuesMode(enabled: boolean): void {
    try {
      localStorage.setItem('wealthflow_hide_values_mode', String(enabled));
    } catch (e) {
      console.warn('Erro ao salvar modo ocultar valores:', e);
    }
  }

  // --- Savings Goals ---
  static getSavingsGoals(): SavingsGoal[] {
    try {
      const stored = localStorage.getItem('wealthflow_savings_goals');
      return stored ? safeJsonParse(stored, []) : [];
    } catch {
      return [];
    }
  }

  static saveSavingsGoals(goals: SavingsGoal[]): void {
    try {
      localStorage.setItem('wealthflow_savings_goals', JSON.stringify(goals));
    } catch (e) {
      console.warn('Erro ao salvar metas de economia:', e);
    }
  }

  // --- Registered Vehicles ---
  static getRegisteredVehicles(): RegisteredVehicle[] {
    try {
      const saved = localStorage.getItem('wealthflow_registered_vehicles');
      return saved ? safeJsonParse(saved, []) : [];
    } catch {
      return [];
    }
  }

  // --- Draft Storage ---
  static getDraftValue(key: string, defaultValue = ''): string {
    try {
      return localStorage.getItem(key) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }

  static setDraftValue(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`Erro ao salvar rascunho [${key}]:`, e);
    }
  }

  static saveDraft(draft: TransactionDraftData): void {
    try {
      if (draft.txType !== undefined) localStorage.setItem('draft_txType', draft.txType);
      if (draft.newTypeName !== undefined) localStorage.setItem('draft_newTypeName', draft.newTypeName);
      if (draft.amountStr !== undefined) localStorage.setItem('draft_amountStr', draft.amountStr);
      if (draft.category !== undefined) localStorage.setItem('draft_category', draft.category);
      if (draft.newCategoryName !== undefined) localStorage.setItem('draft_newCategoryName', draft.newCategoryName);
      if (draft.date !== undefined) localStorage.setItem('draft_date', draft.date);
      if (draft.desc !== undefined) localStorage.setItem('draft_desc', draft.desc);
      if (draft.status !== undefined) localStorage.setItem('draft_status', draft.status);
      if (draft.fuelType !== undefined) localStorage.setItem('draft_fuelType', draft.fuelType);
      if (draft.km !== undefined) localStorage.setItem('draft_km', draft.km);
      if (draft.litros !== undefined) localStorage.setItem('draft_litros', draft.litros);
      if (draft.precoLitro !== undefined) localStorage.setItem('draft_precoLitro', draft.precoLitro);
      if (draft.veiculo !== undefined) localStorage.setItem('draft_veiculo', draft.veiculo);
      if (draft.descricaoVeiculo !== undefined) localStorage.setItem('draft_descricaoVeiculo', draft.descricaoVeiculo);
      if (draft.valorPgStr !== undefined) localStorage.setItem('draft_valorPgStr', draft.valorPgStr);
      if (draft.completouTanque !== undefined) localStorage.setItem('draft_completouTanque', String(draft.completouTanque));
      if (draft.nomePosto !== undefined) localStorage.setItem('draft_nomePosto', draft.nomePosto);
      if (draft.localizacaoPosto !== undefined) localStorage.setItem('draft_localizacaoPosto', draft.localizacaoPosto);
      if (draft.motorista !== undefined) localStorage.setItem('draft_motorista', draft.motorista);
      if (draft.formaPagamento !== undefined) localStorage.setItem('draft_formaPagamento', draft.formaPagamento);
      if (draft.comprovanteUrl !== undefined) localStorage.setItem('draft_comprovanteUrl', draft.comprovanteUrl);
      if (draft.manualKmPercorrido !== undefined) localStorage.setItem('draft_manualKmPercorrido', draft.manualKmPercorrido);
      if (draft.manualMediaKmL !== undefined) localStorage.setItem('draft_manualMediaKmL', draft.manualMediaKmL);
      if (draft.obs !== undefined) localStorage.setItem('draft_obs', draft.obs);
      if (draft.formBankId !== undefined) localStorage.setItem('draft_formBankId', String(draft.formBankId));
      if (draft.formCartaoId !== undefined) localStorage.setItem('draft_formCartaoId', draft.formCartaoId);
    } catch (e) {
      console.warn('Erro ao salvar rascunho completo:', e);
    }
  }

  static clearDraft(): void {
    try {
      DRAFT_KEYS.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Erro ao limpar rascunho:', e);
    }
  }
}

export const financeStorage = FinanceStorage;
