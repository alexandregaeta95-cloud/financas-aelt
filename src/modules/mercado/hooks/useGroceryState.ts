import { useState } from 'react';
import { GroceryItem } from '../../../types';

export function useGroceryState() {
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_grocery_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse grocery items state:", e);
    }
    return [
      { id: 'g1', nome: 'Arroz 5kg', categoria: 'Mercearia', quantidade: 1, valorEstimado: 28.90, comprado: false, updatedAt: Date.now() },
      { id: 'g2', nome: 'Banana Prata kg', categoria: 'Hortifrúti', quantidade: 2, valorEstimado: 6.90, comprado: true, updatedAt: Date.now() },
      { id: 'g3', nome: 'Detergente Líquido', categoria: 'Limpeza', quantidade: 3, valorEstimado: 2.80, comprado: false, updatedAt: Date.now() },
    ];
  });

  return {
    groceryItems,
    setGroceryItems,
  };
}
