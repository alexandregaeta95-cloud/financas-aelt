import React, { useState, useMemo } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Circle, 
  DollarSign, 
  Search, 
  ShoppingBag, 
  X, 
  Edit2, 
  RefreshCw, 
  Check, 
  Sparkles,
  CheckSquare,
  Tag,
  FileText,
  Minus
} from 'lucide-react';
import { GroceryCategory, GroceryItem, GroceryListTabProps } from '../types';

// Helper to format values to PT-BR standard with 2 decimal places (e.g. 12.5 -> "12,50")
export const formatCurrencyBR = (val: number | string | undefined | null): string => {
  if (val === undefined || val === null || val === '') return '';
  let num: number;
  if (typeof val === 'number') {
    num = val;
  } else {
    // replace thousand dots and replace comma with dot
    const clean = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
    num = parseFloat(clean);
  }
  if (isNaN(num)) return '';
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper to parse PT-BR string or standard number into float (e.g. "12,50" -> 12.5)
export const parseCurrencyBR = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const clean = String(val).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
};

const CATEGORIES: { name: GroceryCategory; icon: string; color: string }[] = [
  { name: 'Hortifrúti', icon: '🥗', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  { name: 'Limpeza', icon: '🧹', color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800' },
  { name: 'Bebidas', icon: '🥤', color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800' },
  { name: 'Mercearia', icon: '🌾', color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  { name: 'Açougue', icon: '🥩', color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  { name: 'Padaria', icon: '🥖', color: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' },
  { name: 'Higiene', icon: '🧴', color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' },
  { name: 'Outros', icon: '📦', color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
];

export const GroceryListTab: React.FC<GroceryListTabProps> = ({
  groceryItems = [],
  bankAccounts = [],
  creditCards = [],
  onAddGroceryItem,
  onEditGroceryItem,
  onDeleteGroceryItem,
  onClearPurchasedItems,
  onAddTransaction,
  onSyncWithSheets,
  isSyncing = false,
}) => {
  // Safe Array Fallback
  const safeGroceryItems = Array.isArray(groceryItems) ? groceryItems : [];
  const safeBankAccounts = Array.isArray(bankAccounts) ? bankAccounts : [];
  const safeCreditCards = Array.isArray(creditCards) ? creditCards : [];

  // Form State
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<GroceryCategory>('Mercearia');
  const [quantidade, setQuantidade] = useState<number | ''>(1);
  const [valorEstimadoInput, setValorEstimadoInput] = useState<string>('');
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter and Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTES' | 'COMPRADOS'>('TODOS');

  // Editing Item Modal State
  const [editingItem, setEditingItem] = useState<GroceryItem | null>(null);
  const [editingValorInput, setEditingValorInput] = useState<string>('');

  // Finalize Purchase Modal State
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [lancarDespesa, setLancarDespesa] = useState(true);
  const [valorPagoInput, setValorPagoInput] = useState<string>('');
  const [categoriaDespesa, setCategoriaDespesa] = useState('Supermercado');
  const [descricaoDespesa, setDescricaoDespesa] = useState('');
  const [dataTransacao, setDataTransacao] = useState(() => new Date().toISOString().split('T')[0]);
  const [tipoConta, setTipoConta] = useState('Cartão de Crédito');
  const [finalizingSuccess, setFinalizingSuccess] = useState(false);

  // Quick preset items suggestions
  const presetSuggestions = [
    { nome: 'Arroz 5kg', categoria: 'Mercearia' as GroceryCategory, valor: 28.90 },
    { nome: 'Feijão Carioca 1kg', categoria: 'Mercearia' as GroceryCategory, valor: 8.50 },
    { nome: 'Leite Integral 1L', categoria: 'Bebidas' as GroceryCategory, valor: 4.80 },
    { nome: 'Café Tradicional 500g', categoria: 'Mercearia' as GroceryCategory, valor: 16.90 },
    { nome: 'Banana Prata kg', categoria: 'Hortifrúti' as GroceryCategory, valor: 6.90 },
    { nome: 'Sabão em Pó 1.6kg', categoria: 'Limpeza' as GroceryCategory, valor: 19.90 },
    { nome: 'Pão de Forma', categoria: 'Padaria' as GroceryCategory, valor: 9.00 },
    { nome: 'Detergente Líquido', categoria: 'Limpeza' as GroceryCategory, valor: 2.80 },
  ];

  // Summaries
  const totalEstimado = useMemo(() => {
    return safeGroceryItems.reduce((acc, item) => acc + (Number(item?.quantidade || 1) * Number(item?.valorEstimado || 0)), 0);
  }, [safeGroceryItems]);

  const totalNoCarrinho = useMemo(() => {
    return safeGroceryItems
      .filter(item => item?.comprado)
      .reduce((acc, item) => acc + (Number(item?.quantidade || 1) * Number(item?.valorEstimado || 0)), 0);
  }, [safeGroceryItems]);

  const totalItens = safeGroceryItems.length;
  const compradosCount = safeGroceryItems.filter(item => item?.comprado).length;
  const progressPercent = totalItens > 0 ? Math.round((compradosCount / totalItens) * 100) : 0;

  // Filtered List
  const filteredItems = useMemo(() => {
    return safeGroceryItems.filter(item => {
      if (!item) return false;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (item.nome || '').toLowerCase().includes(q) ||
        (item.observacao || '').toLowerCase().includes(q);
      const matchesCategory = selectedCategory === 'TODAS' || item.categoria === selectedCategory;
      const matchesStatus = statusFilter === 'TODOS' || 
        (statusFilter === 'COMPRADOS' && item.comprado) ||
        (statusFilter === 'PENDENTES' && !item.comprado);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [safeGroceryItems, searchQuery, selectedCategory, statusFilter]);

  // Handlers
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setIsSubmitting(true);
    try {
      const parsedValor = parseCurrencyBR(valorEstimadoInput);

      await onAddGroceryItem({
        nome: nome.trim(),
        categoria,
        quantidade: typeof quantidade === 'number' && quantidade > 0 ? quantidade : 1,
        valorEstimado: parsedValor,
        comprado: false,
        observacao: observacao.trim() || undefined,
        updatedAt: Date.now()
      });

      // Clear Form
      setNome('');
      setQuantidade(1);
      setValorEstimadoInput('');
      setObservacao('');
    } catch (err) {
      console.error('Erro ao adicionar item de mercado:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComprado = async (item: GroceryItem) => {
    try {
      await onEditGroceryItem(item.id, {
        comprado: !item.comprado,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Erro ao atualizar status do item:', err);
    }
  };

  const handleAdjustQuantity = async (item: GroceryItem, delta: number) => {
    const currentQtd = Number(item.quantidade) || 1;
    const newQtd = Math.max(1, currentQtd + delta);
    if (newQtd === currentQtd) return;

    try {
      await onEditGroceryItem(item.id, {
        quantidade: newQtd,
        updatedAt: Date.now()
      });
    } catch (err) {
      console.error('Erro ao ajustar quantidade:', err);
    }
  };

  const handleOpenEditItem = (item: GroceryItem) => {
    setEditingItem(item);
    setEditingValorInput(formatCurrencyBR(item.valorEstimado));
  };

  const handleSaveEditItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.nome.trim()) return;

    try {
      const parsedValor = parseCurrencyBR(editingValorInput);

      await onEditGroceryItem(editingItem.id, {
        nome: editingItem.nome.trim(),
        categoria: editingItem.categoria,
        quantidade: Number(editingItem.quantidade) || 1,
        valorEstimado: parsedValor,
        observacao: editingItem.observacao || '',
        updatedAt: Date.now()
      });
      setEditingItem(null);
    } catch (err) {
      console.error('Erro ao editar item:', err);
    }
  };

  const handleOpenFinalizeModal = () => {
    const purchased = safeGroceryItems.filter(i => i?.comprado);
    const total = purchased.reduce((acc, item) => acc + (Number(item?.quantidade || 1) * Number(item?.valorEstimado || 0)), 0);
    const sampleNames = purchased.map(i => i.nome).slice(0, 3).join(', ');
    const hasMore = purchased.length > 3 ? ` +${purchased.length - 3}` : '';

    setValorPagoInput(formatCurrencyBR(total));
    setCategoriaDespesa('Supermercado');
    setDescricaoDespesa(purchased.length > 0 ? `Compra de Mercado (${purchased.length} itens: ${sampleNames}${hasMore})` : 'Compra de Mercado');
    setDataTransacao(new Date().toISOString().split('T')[0]);
    if (safeBankAccounts.length > 0) {
      setTipoConta(`BANK:${safeBankAccounts[0].id}`);
    } else {
      setTipoConta('Cartão de Crédito');
    }
    setLancarDespesa(true);
    setShowFinalizeModal(true);
  };

  const handleFinalizePurchase = async () => {
    if (compradosCount === 0) return;

    try {
      const parsedVal = parseCurrencyBR(valorPagoInput);
      const finalVal = parsedVal > 0 ? parsedVal : totalNoCarrinho;

      // 1. Launch transaction if selected
      if (lancarDespesa && onAddTransaction && finalVal > 0) {
        const purchased = safeGroceryItems.filter(i => i?.comprado);
        const itemsDetail = purchased.map(i => `${i.quantidade}x ${i.nome}`).join(', ');

        let selectedMethodName = tipoConta;
        let selectedBankId: number | undefined = undefined;
        let selectedBankName: string | undefined = undefined;

        if (tipoConta.startsWith('BANK:')) {
          const bankId = Number(tipoConta.replace('BANK:', ''));
          const foundBank = safeBankAccounts.find(b => b.id === bankId);
          if (foundBank) {
            selectedBankId = foundBank.id;
            selectedBankName = foundBank.nome;
            selectedMethodName = foundBank.nome;
          }
        } else if (tipoConta.startsWith('CARD:')) {
          const cardId = Number(tipoConta.replace('CARD:', ''));
          const foundCard = safeCreditCards.find(c => c.id === cardId);
          if (foundCard) {
            selectedBankName = foundCard.nome;
            selectedMethodName = foundCard.nome;
          }
        }

        const payload = {
          data: dataTransacao,
          descricao: descricaoDespesa.trim() || `Compra de Mercado (${compradosCount} itens)`,
          valor: finalVal,
          tipo: 'DESPESA',
          categoria: categoriaDespesa.trim() || 'Supermercado',
          metodoPagamento: selectedMethodName,
          bancoId: selectedBankId,
          bancoNome: selectedBankName,
          observacoes: `Lançado via Lista de Mercado. Itens comprados (${compradosCount}): ${itemsDetail}`,
          updatedAt: Date.now()
        };
        await onAddTransaction(payload);
      }

      // 2. Clear/Archive purchased items from the list
      await onClearPurchasedItems();

      // 3. Trigger immediate sync with Google Sheets if available
      if (onSyncWithSheets) {
        onSyncWithSheets();
      }

      setFinalizingSuccess(true);
      setTimeout(() => {
        setFinalizingSuccess(false);
        setShowFinalizeModal(false);
      }, 1500);

    } catch (err) {
      console.error('Erro ao finalizar compra:', err);
    }
  };

  const handleAddPreset = (preset: typeof presetSuggestions[0]) => {
    setNome(preset.nome);
    setCategoria(preset.categoria);
    setValorEstimadoInput(formatCurrencyBR(preset.valor));
  };

  const getCategoryBadge = (catName: string) => {
    const found = CATEGORIES.find(c => c.name === catName);
    if (!found) return { name: catName, icon: '📦', color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' };
    return found;
  };

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto px-2 sm:px-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-5 sm:p-6 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 backdrop-blur-md rounded-xl text-emerald-100 shadow-inner">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Lista de Mercado</h1>
              <p className="text-emerald-100 text-sm mt-0.5">
                Organize suas compras, controle o orçamento estimado e lance no financeiro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {onSyncWithSheets && (
              <button
                onClick={onSyncWithSheets}
                disabled={isSyncing}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 active:scale-95 text-white px-3.5 py-2 rounded-xl text-sm font-medium transition-all backdrop-blur-md border border-white/20 cursor-pointer"
                title="Sincronizar com Google Sheets"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar Planilha'}</span>
              </button>
            )}

            <button
              onClick={handleOpenFinalizeModal}
              disabled={compradosCount === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-md active:scale-95 ${
                compradosCount > 0
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-900 cursor-pointer'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Finalizar Compra ({compradosCount})</span>
            </button>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/15">
            <div className="flex items-center justify-between text-xs text-emerald-100 font-medium">
              <span>Total Estimado</span>
              <DollarSign className="w-4 h-4 opacity-75" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1">
              R$ {formatCurrencyBR(totalEstimado) || '0,00'}
            </div>
            <p className="text-[11px] text-emerald-200 mt-0.5">Soma de todos os {totalItens} itens</p>
          </div>

          <div className="bg-white/15 backdrop-blur-md rounded-xl p-3.5 border border-white/20">
            <div className="flex items-center justify-between text-xs text-emerald-100 font-medium">
              <span>Total no Carrinho</span>
              <ShoppingBag className="w-4 h-4 text-amber-300" />
            </div>
            <div className="text-xl sm:text-2xl font-black mt-1 text-amber-200">
              R$ {formatCurrencyBR(totalNoCarrinho) || '0,00'}
            </div>
            <p className="text-[11px] text-emerald-200 mt-0.5">{compradosCount} de {totalItens} itens marcados</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-xl p-3.5 border border-white/15 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-100 font-medium">
              <span>Progresso das Compras</span>
              <span className="font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-black/20 rounded-full h-2.5 mt-2 overflow-hidden">
              <div 
                className="bg-amber-300 h-2.5 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-emerald-200 mt-2">
              {totalItens - compradosCount > 0 ? `${totalItens - compradosCount} itens pendentes` : 'Tudo no carrinho!'}
            </p>
          </div>
        </div>
      </div>

      {/* Add Item Form Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Adicionar Item à Lista
          </h2>
          <span className="text-xs text-slate-400 font-medium">* Campos principais de preenchimento</span>
        </div>

        <form onSubmit={handleAddItem} className="space-y-4">
          {/* Row 1: Name, Category, Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Nome do Item */}
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nome do Item *
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Arroz 5kg, Queijo Mussarela 200g, Sabão..."
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Categoria */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Categoria *
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as GroceryCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.name} value={cat.name}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantidade */}
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantidade (Qtd)
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value === '' ? '' : parseFloat(e.target.value))}
                placeholder="1"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Row 2: Valor Estimado (R$), Observação */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Valor Estimado (R$) - Formatted for PT-BR 2 decimal places */}
            <div className="sm:col-span-4">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Valor Estimado Un. (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorEstimadoInput}
                  onChange={(e) => setValorEstimadoInput(e.target.value)}
                  onBlur={() => {
                    if (valorEstimadoInput.trim() !== '') {
                      const parsed = parseCurrencyBR(valorEstimadoInput);
                      setValorEstimadoInput(formatCurrencyBR(parsed));
                    }
                  }}
                  placeholder="0,00"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-0.5 block">Ex: 12,50 ou 12.50 (2 casas decimais)</span>
            </div>

            {/* Observação / Detalhes */}
            <div className="sm:col-span-8">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Observações / Detalhes
              </label>
              <input
                type="text"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Ex: Marca específica, tamanho da embalagem, substituir se não achar..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Row 3: Presets & Submit */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/60">
            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto py-1 scrollbar-none">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Atalia de Itens:
              </span>
              {presetSuggestions.slice(0, 5).map((p) => (
                <button
                  key={p.nome}
                  type="button"
                  onClick={() => handleAddPreset(p)}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700/60 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 text-slate-600 dark:text-slate-300 rounded-lg text-xs shrink-0 transition-colors border border-slate-200/60 dark:border-slate-700 cursor-pointer"
                >
                  + {p.nome} ({formatCurrencyBR(p.valor)})
                </button>
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !nome.trim()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50 text-sm shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar à Lista</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar item, categoria ou detalhe..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setStatusFilter('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === 'TODOS'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Todos ({totalItens})
            </button>
            <button
              onClick={() => setStatusFilter('PENDENTES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === 'PENDENTES'
                  ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              Pendentes ({totalItens - compradosCount})
            </button>
            <button
              onClick={() => setStatusFilter('COMPRADOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                statusFilter === 'COMPRADOS'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              No Carrinho ({compradosCount})
            </button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('TODAS')}
            className={`px-3 py-1 rounded-xl text-xs font-semibold shrink-0 transition-all border cursor-pointer ${
              selectedCategory === 'TODAS'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            Todas as Categorias
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all border cursor-pointer ${
                selectedCategory === cat.name
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : `${cat.color} hover:opacity-90`
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grocery Checklist List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              {safeGroceryItems.length === 0 ? 'Sua lista de mercado está vazia' : 'Nenhum item encontrado'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {safeGroceryItems.length === 0 
                ? 'Adicione seus itens acima para acompanhar os valores estimados e marcar no carrinho durante as compras.'
                : 'Tente alterar os filtros de busca ou de categorias selecionados acima.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredItems.map((item) => {
              const badge = getCategoryBadge(item.categoria);
              const unitPrice = Number(item.valorEstimado || 0);
              const subtotal = Number(item.quantidade || 1) * unitPrice;

              return (
                <div
                  key={item.id}
                  className={`group bg-white dark:bg-slate-800 rounded-2xl p-4 border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:shadow-md ${
                    item.comprado
                      ? 'border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Interactive Checkbox */}
                    <button
                      type="button"
                      onClick={() => handleToggleComprado(item)}
                      className={`mt-0.5 p-1 rounded-lg transition-transform active:scale-90 shrink-0 cursor-pointer ${
                        item.comprado 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-slate-300 dark:text-slate-600 hover:text-emerald-500'
                      }`}
                      title={item.comprado ? 'Marcar como não comprado' : 'Marcar como comprado'}
                    >
                      {item.comprado ? (
                        <CheckCircle2 className="w-6 h-6 fill-emerald-100 dark:fill-emerald-950" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>

                    {/* Content Details */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-base font-bold transition-all ${
                            item.comprado
                              ? 'line-through text-slate-400 dark:text-slate-500'
                              : 'text-slate-800 dark:text-slate-100'
                          }`}
                        >
                          {item.nome}
                        </span>

                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.color}`}>
                          <span>{badge.icon}</span>
                          <span>{item.categoria}</span>
                        </span>
                      </div>

                      {/* Quantity & Unit Price */}
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Qtd:</span>
                          <button
                            type="button"
                            onClick={() => handleAdjustQuantity(item, -1)}
                            className="p-0.5 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-400 rounded-xs cursor-pointer"
                            title="Diminuir quantidade"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 px-1">
                            {item.quantidade}x
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAdjustQuantity(item, 1)}
                            className="p-0.5 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-400 rounded-xs cursor-pointer"
                            title="Aumentar quantidade"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        {unitPrice > 0 && (
                          <div className="flex items-center gap-1">
                            <span>Un:</span>
                            <strong className="text-slate-700 dark:text-slate-300 font-mono">
                              R$ {formatCurrencyBR(unitPrice)}
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Observação */}
                      {item.observacao && (
                        <p className="text-xs italic text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-0.5">
                          <FileText className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">"{item.observacao}"</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Subtotal & Action buttons */}
                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-700/60">
                    <div className="text-left sm:text-right">
                      <div className={`text-base font-black font-mono ${
                        item.comprado ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                      }`}>
                        R$ {formatCurrencyBR(subtotal) || '0,00'}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        {item.comprado ? 'No Carrinho' : 'Estimado'}
                      </span>
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                        title="Editar item"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onDeleteGroceryItem(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                        title="Excluir item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-600" />
                Editar Item de Mercado
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditItem} className="flex flex-col min-h-0 flex-1 mt-4">
              <div className="overflow-y-auto pr-1 space-y-4 flex-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Item *
                  </label>
                  <input
                    type="text"
                    value={editingItem.nome}
                    onChange={(e) => setEditingItem({ ...editingItem, nome: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={editingItem.categoria}
                    onChange={(e) => setEditingItem({ ...editingItem, categoria: e.target.value as GroceryCategory })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.name} value={cat.name}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={editingItem.quantidade}
                      onChange={(e) => setEditingItem({ ...editingItem, quantidade: parseFloat(e.target.value) || 1 })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Valor Estimado Un. (R$)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editingValorInput}
                        onChange={(e) => setEditingValorInput(e.target.value)}
                        onBlur={() => {
                          if (editingValorInput.trim() !== '') {
                            const parsed = parseCurrencyBR(editingValorInput);
                            setEditingValorInput(formatCurrencyBR(parsed));
                          }
                        }}
                        placeholder="0,00"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Observações / Detalhes
                  </label>
                  <input
                    type="text"
                    value={editingItem.observacao || ''}
                    onChange={(e) => setEditingItem({ ...editingItem, observacao: e.target.value })}
                    placeholder="Ex: Marca específica, tamanho..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FINALIZE PURCHASE MODAL */}
      {showFinalizeModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-lg">
                <ShoppingBag className="w-5 h-5" />
                <span>Finalizar Compras do Mercado</span>
              </div>
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {finalizingSuccess ? (
              <div className="py-8 text-center space-y-3 shrink-0">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-8 h-8" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">Compra Finalizada!</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Os itens do carrinho foram arquivados e o lançamento foi concluído com sucesso.
                </p>
              </div>
            ) : (
              <div className="flex flex-col min-h-0 flex-1 mt-4">
                <div className="overflow-y-auto pr-1 space-y-4 flex-1">
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4">
                    <div className="flex items-center justify-between text-xs text-amber-700 dark:text-amber-300 font-medium">
                      <span>Resumo do Carrinho:</span>
                      <span className="bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-100 px-2 py-0.5 rounded-md font-bold">
                        {compradosCount} {compradosCount === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <div className="text-2xl font-black text-amber-900 dark:text-amber-100 mt-1 font-mono">
                      R$ {formatCurrencyBR(totalNoCarrinho) || '0,00'}
                    </div>
                    <div className="text-[11px] text-amber-700/80 dark:text-amber-400 mt-1">
                      Soma estimada dos itens no carrinho. Você pode ajustar o valor pago real abaixo.
                    </div>
                  </div>

                  {onAddTransaction && (
                    <div className="space-y-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                      <label className="flex items-center gap-2.5 cursor-pointer pb-1 border-b border-slate-200/60 dark:border-slate-800">
                        <input
                          type="checkbox"
                          checked={lancarDespesa}
                          onChange={(e) => setLancarDespesa(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                          Registrar lançamento como Despesa no Financeiro
                        </span>
                      </label>

                      {lancarDespesa && (
                        <div className="space-y-3 pt-1">
                          {/* Valor Pago & Categoria */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Valor Pago Real (R$) *
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs select-none">
                                  R$
                                </span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={valorPagoInput}
                                  onChange={(e) => setValorPagoInput(e.target.value)}
                                  onBlur={() => {
                                    if (valorPagoInput.trim() !== '') {
                                      const parsed = parseCurrencyBR(valorPagoInput);
                                      setValorPagoInput(formatCurrencyBR(parsed));
                                    }
                                  }}
                                  placeholder="0,00"
                                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Categoria *
                              </label>
                              <select
                                value={categoriaDespesa}
                                onChange={(e) => setCategoriaDespesa(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                <option value="Supermercado">Supermercado</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Feira e Hortifrúti">Feira e Hortifrúti</option>
                                <option value="Padaria">Padaria</option>
                                <option value="Outros">Outros</option>
                              </select>
                            </div>
                          </div>

                          {/* Descrição */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Descrição do Lançamento
                            </label>
                            <input
                              type="text"
                              value={descricaoDespesa}
                              onChange={(e) => setDescricaoDespesa(e.target.value)}
                              placeholder="Ex: Compra de Mercado (5 itens)"
                              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                          </div>

                          {/* Data & Forma de Pagamento */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Data do Lançamento
                              </label>
                              <input
                                type="date"
                                value={dataTransacao}
                                onChange={(e) => setDataTransacao(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Forma de Pagamento
                              </label>
                              <select
                                value={tipoConta}
                                onChange={(e) => setTipoConta(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              >
                                {safeBankAccounts.length > 0 && (
                                  <optgroup label="Contas Bancárias Cadastradas">
                                    {safeBankAccounts.map((acc) => (
                                      <option key={`bank-${acc.id}`} value={`BANK:${acc.id}`}>
                                        🏦 {acc.nome} {acc.agencia ? `(Ag. ${acc.agencia})` : ''}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                {safeCreditCards.length > 0 && (
                                  <optgroup label="Cartões Cadastrados">
                                    {safeCreditCards.map((card) => (
                                      <option key={`card-${card.id}`} value={`CARD:${card.id}`}>
                                        💳 {card.nome}
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                <optgroup label="Outras Formas de Pagamento">
                                  <option value="Cartão de Crédito">Cartão de Crédito (Geral)</option>
                                  <option value="Cartão de Débito">Cartão de Débito (Geral)</option>
                                  <option value="PIX">PIX</option>
                                  <option value="Dinheiro">Dinheiro</option>
                                  <option value="Vale Alimentação">Vale Alimentação / Refeição</option>
                                </optgroup>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Ao confirmar, os <strong>{compradosCount} itens</strong> no carrinho serão limpos/arquivados e sincronizados na planilha do Google Sheets.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-700 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowFinalizeModal(false)}
                    className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl font-medium transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalizePurchase}
                    className="px-5 py-2.5 text-sm bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Confirmar e Finalizar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
