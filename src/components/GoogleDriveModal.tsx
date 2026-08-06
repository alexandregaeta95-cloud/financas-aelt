import React, { useState, useEffect } from 'react';
import { DEFAULT_APPS_SCRIPT_URL } from '../lib/googleAuth';
import { APPS_SCRIPT_CODE } from '../lib/appsScriptCode';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (urlOrToken: string) => Promise<void>;
  currentValue?: string;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  currentValue = ''
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const EXPENSE_CATEGORIES = [
    'TODAS', 'ABASTECIMENTO', 'ALIMENTAÇÃO', 'CASA', 'CONSUMO',
    'EDUCAÇÃO', 'LAZER', 'MERCADO', 'PESSOAL', 'SAÚDE',
    'SERVIÇOS', 'TRANSPORTE', 'TRABALHO', 'OUTROS'
  ];

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_sync_categories');
      return saved ? JSON.parse(saved) : ['TODAS'];
    } catch {
      return ['TODAS'];
    }
  });

  const toggleCategory = (cat: string) => {
    if (cat === 'TODAS') {
      setSelectedCategories(['TODAS']);
      return;
    }
    let updated = selectedCategories.filter(c => c !== 'TODAS');
    if (updated.includes(cat)) {
      updated = updated.filter(c => c !== cat);
      if (updated.length === 0) updated = ['TODAS'];
    } else {
      updated.push(cat);
    }
    setSelectedCategories(updated);
  };

  useEffect(() => {
    if (isOpen) {
      const saved = currentValue || 
                    localStorage.getItem('wealthflow_apps_script_url') || 
                    localStorage.getItem('wealthflow_google_access_token') || 
                    DEFAULT_APPS_SCRIPT_URL;
      setLinkInput(saved);
      setErrorMsg('');
      setIsLoading(false);
      setCopied(false);
    }
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = linkInput.trim() || 'wealthflow_direct_sheets_connected';

    try {
      setIsLoading(true);
      setErrorMsg('');
      localStorage.setItem('wealthflow_sync_categories', JSON.stringify(selectedCategories));
      await onConnect(val);
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Ocorreu um erro ao conectar. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">grid_on</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white font-display">Conectar Google Drive / Planilha</h3>
              <p className="text-xs text-slate-400">Sincronização em tempo real via Google Apps Script</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Instructions Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">integration_instructions</span>
              Passo a Passo Rápido (30 segundos)
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-xs">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Código Copiado!' : 'Copiar Código Apps Script'}
            </button>
          </div>
          <ol className="list-decimal list-inside text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
            <li>Abra sua planilha no Google Sheets e vá em <strong>Extensões &gt; Apps Script</strong>.</li>
            <li>Cole o código copiado acima e clique em <strong>Implantar &gt; Nova Implantação</strong>.</li>
            <li>Selecione Tipo: <strong>App da Web</strong>, Quem tem acesso: <strong>Qualquer Pessoa ("Anyone")</strong>.</li>
            <li>Copie o link do Web App gerado e cole no campo abaixo.</li>
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              URL do Web App (Google Apps Script)
            </label>
            <div className="relative">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pr-10"
              />
              {linkInput && (
                <button
                  type="button"
                  onClick={() => setLinkInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Categorias de Despesas para Sincronizar */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-emerald-400">filter_alt</span>
                Filtro de Categorias de Despesas
              </label>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {selectedCategories.includes('TODAS') ? 'Todas as Categorias' : `${selectedCategories.length} Selecionada(s)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Escolha quais categorias de despesas serão sincronizadas com o Google Sheets:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950/80 border border-slate-800 rounded-xl custom-scrollbar">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Conectando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">link</span>
                  Salvar e Conectar
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default GoogleDriveModal;
