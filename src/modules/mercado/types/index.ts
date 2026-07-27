import { GroceryCategory, GroceryItem, BankAccount, CreditCard } from '../../../types';

export type { GroceryCategory, GroceryItem };

export interface GroceryListTabProps {
  groceryItems: GroceryItem[];
  bankAccounts?: BankAccount[];
  creditCards?: CreditCard[];
  onAddGroceryItem: (item: Omit<GroceryItem, 'id'>) => Promise<void>;
  onEditGroceryItem: (id: string, updatedFields: Partial<GroceryItem>) => Promise<void>;
  onDeleteGroceryItem: (id: string) => Promise<void>;
  onClearPurchasedItems: () => Promise<void>;
  onAddTransaction?: (transaction: any) => Promise<void>;
  onSyncWithSheets?: () => void;
  isSyncing?: boolean;
}
