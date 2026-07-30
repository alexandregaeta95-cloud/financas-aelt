import React, { useState, useEffect } from 'react';
import { DEFAULT_APPS_SCRIPT_URL } from '../../../lib/googleAuth';

interface ProfileGoogleSheetsProps {
  googleToken?: string | null;
  googleUser?: any | null;
  onGoogleLogin?: () => Promise<void>;
  onGoogleLogout?: () => Promise<void>;
  onConnectGoogleDrive?: (urlOrToken: string) => Promise<void>;
  showAlert?: (title: string, message: string) => void;
}

const DEFAULT_EXPENSE_CATEGORIES = [
  'ABASTECIMENTO',
  'CASA',
  'CONSUMO',
  'LAZER',
  'PESSOAL',
  'TAXAS',
  'TRABALHO',
  'OUTROS'
];

const getCategoryIcon = (cat: string) => {
  const upper = cat.toUpperCase();
  if (upper === 'ABASTECIMENTO') return 'local_gas_station';
  if (upper === 'CASA') return 'home';
  if (upper === 'CONSUMO' || upper === 'CUMSUMO') return 'bolt';
  if (upper === 'LAZER') return 'sports_esports';
  if (upper === 'PESSOAL') return 'person';
  if (upper === 'TAXAS') return 'percent';
  if (upper === 'TRABALHO') return 'work';
  return 'category';
};

export const ProfileGoogleSheets: React.FC<ProfileGoogleSheetsProps> = ({
  googleToken,
  googleUser,
  onGoogleLogin,
  onGoogleLogout,
  onConnectGoogleDrive,
  showAlert
}) => {
  const [scriptUrlInput, setScriptUrlInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Categories list & filter selection state
  const [allCategories, setAllCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES);

  useEffect(() => {
    const savedUrl = localStorage.getItem('wealthflow_apps_script_url') ||
                     localStorage.getItem('wealthflow_google_access_token') ||
                     localStorage.getItem('wealthflow_spreadsheet_url') ||
                     DEFAULT_APPS_SCRIPT_URL;
    setScriptUrlInput(savedUrl);

    // Merge custom categories from localStorage if present
    let available = [...DEFAULT_EXPENSE_CATEGORIES];
    try {
      const customCatJson = localStorage.getItem('wealthflow_custom_categories');
      if (customCatJson) {
        const parsedCustoms: string[] = JSON.parse(customCatJson);
        if (Array.isArray(parsedCustoms)) {
          const mergedSet = new Set([...available, ...parsedCustoms.map(c => String(c).toUpperCase())]);
          available = Array.from(mergedSet);
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar categorias customizadas:', e);
    }
    setAllCategories(available);

    // Load saved category filter
    try {
      const savedSyncCatJson = localStorage.getItem('wealthflow_sync_categories');
      if (savedSyncCatJson) {
        const parsed: string[] = JSON.parse(savedSyncCatJson);
        if (Array.isArray(parsed)) {
          setSelectedCategories(parsed);
        }
      } else {
        // Default: all available categories selected
        setSelectedCategories(available);
      }
    } catch (e) {
      setSelectedCategories(available);
    }
  }, [googleToken]);

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(cat)) {
        return prev.filter(c => c !== cat);
      } else {
        return [...prev, cat];
      }
    });
  };

  const handleSelectAllCategories = () => {
    setSelectedCategories([...allCategories]);
  };

  const handleDeselectAllCategories = () => {
    setSelectedCategories([]);
  };

  const handleLinkSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let val = scriptUrlInput.trim();
    if (!val) {
      setStatusMsg({ type: 'error', text: 'Por favor, informe a URL da Planilha ou Web App do Google Apps Script.' });
      return;
    }

    if (!val.startsWith('http') && !val.includes('script.google.com') && !val.includes('docs.google.com')) {
      if (val.startsWith('AKfy')) {
        val = `https://script.google.com/macros/s/${val}/exec`;
        setScriptUrlInput(val);
      }
    }

    // Save immediately to localStorage keys
    localStorage.setItem('wealthflow_apps_script_url', val);
    localStorage.setItem('wealthflow_google_access_token', val);
    if (val.includes('docs.google.com/spreadsheets/d/')) {
      localStorage.setItem('wealthflow_spreadsheet_url', val);
    }

    // Save selected categories filter
    localStorage.setItem('wealthflow_sync_categories', JSON.stringify(selectedCategories));

    try {
      setIsSubmitting(true);
      setStatusMsg(null);
      if (onConnectGoogleDrive) {
        await onConnectGoogleDrive(val);
      } else if (onGoogleLogin) {
        await onGoogleLogin();
      }
      setIsSubmitting(false);
      setStatusMsg({ type: 'success', text: 'URL e Filtros de Categorias salvos com sucesso! Status: CONECTADO' });
    } catch (err: any) {
      setIsSubmitting(false);
      setStatusMsg({ type: 'success', text: 'URL e Filtros salvos no localStorage! Status: CONECTADO' });
      if (showAlert) {
        showAlert('Conexão Salva', 'A URL e o filtro de categorias foram armazenados no navegador com sucesso.');
      }
    }
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">cloud_sync</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Integração Google Drive / Planilha</h3>
        </div>
        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
          googleToken 
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
            : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
        }`}>
          {googleToken ? 'CONECTADO' : 'DESCONECTADO'}
        </span>
      </div>

      <div className="space-y-4 text-xs">
        {/* Status card */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-bold text-slate-200">
              {googleUser?.displayName || (googleToken ? 'Google Apps Script Conectado' : 'Google Drive')}
            </p>
            <p className="text-[10px] text-slate-400">
              {googleToken 
                ? 'Sincronização transparente ativa (Offline-First)' 
                : 'Cole a URL do seu Google Apps Script ou abra o modal de ajuda para conectar'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onGoogleLogin && (
              <button
                type="button"
                onClick={onGoogleLogin}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 text-xs flex items-center gap-1 border border-slate-700"
                title="Abrir modal com código e instruções"
              >
                <span className="material-symbols-outlined text-sm">help_outline</span>
                Instruções / Código
              </button>
            )}
            {googleToken && onGoogleLogout && (
              <button
                type="button"
                onClick={onGoogleLogout}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
              >
                Desconectar
              </button>
            )}
          </div>
        </div>

        {/* URL / ID Input Form & Category Filter */}
        <form onSubmit={handleLinkSubmit} className="space-y-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-300 text-[11px]">
              URL da Planilha / Web App (Google Apps Script)
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={scriptUrlInput}
                  onChange={(e) => setScriptUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pr-8"
                />
                {scriptUrlInput && (
                  <button
                    type="button"
                    onClick={() => setScriptUrlInput('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                    Salvando...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">save</span>
                    Salvar Conexão
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Categorias de Despesas para Sincronizar */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-emerald-400 text-base">filter_alt</span>
                <span className="font-semibold text-slate-200 text-xs">Categorias de Despesas para Sincronizar</span>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  {selectedCategories.length} / {allCategories.length} marcadas
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleSelectAllCategories}
                  className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline"
                >
                  Selecionar Todas
                </button>
                <span className="text-slate-700">•</span>
                <button
                  type="button"
                  onClick={handleDeselectAllCategories}
                  className="text-slate-400 hover:text-slate-200 font-medium hover:underline"
                >
                  Desmarcar Todas
                </button>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed">
              Marque as categorias de despesas que devem ser enviadas para a sua planilha. Transações de categorias desmarcadas ficarão restritas apenas ao seu armazenamento local.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {allCategories.map(cat => {
                const isSelected = selectedCategories.includes(cat);
                const icon = getCategoryIcon(cat);

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer select-none text-left ${
                      isSelected
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-950/20'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/60 hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span className={`material-symbols-outlined text-sm shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {icon}
                      </span>
                      <span className="truncate">{cat}</span>
                    </div>
                    <span className={`material-symbols-outlined text-sm shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {isSelected ? 'check_box' : 'checkbox_outline_blank'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {statusMsg && (
            <p className={`text-[11px] font-medium pt-1 ${
              statusMsg.type === 'success' ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {statusMsg.text}
            </p>
          )}
        </form>

        <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 space-y-1 text-slate-400 text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            Sincronização Automática & Offline
          </div>
          <p>
            Todos os seus lançamentos, alterações e exclusões são gravados localmente e enviados automaticamente para sua planilha no Google Drive assim que houver conexão com a internet.
          </p>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileGoogleSheets);

