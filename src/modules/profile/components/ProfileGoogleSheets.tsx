import React, { useState, useEffect } from 'react';

interface ProfileGoogleSheetsProps {
  googleToken?: string | null;
  googleUser?: any | null;
  onGoogleLogin?: () => Promise<void>;
  onGoogleLogout?: () => Promise<void>;
  onConnectGoogleDrive?: (urlOrToken: string) => Promise<void>;
  showAlert?: (title: string, message: string) => void;
}

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

  useEffect(() => {
    const savedUrl = localStorage.getItem('wealthflow_apps_script_url') ||
                     localStorage.getItem('wealthflow_google_access_token') ||
                     localStorage.getItem('wealthflow_spreadsheet_url') ||
                     '';
    setScriptUrlInput(savedUrl);
  }, [googleToken]);

  const handleLinkSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = scriptUrlInput.trim();
    if (!val) {
      setStatusMsg({ type: 'error', text: 'Por favor, informe a URL do Web App ou ID do Google Apps Script.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMsg(null);
      if (onConnectGoogleDrive) {
        await onConnectGoogleDrive(val);
      } else if (onGoogleLogin) {
        await onGoogleLogin();
      }
      setIsSubmitting(false);
      setStatusMsg({ type: 'success', text: 'Planilha/Web App vinculado e salvo no localStorage com sucesso!' });
    } catch (err: any) {
      setIsSubmitting(false);
      // Keep input intact, do not erase from localStorage
      setStatusMsg({ type: 'error', text: err?.message || 'Link salvo localmente. Não foi possível validar o teste no momento.' });
      if (showAlert) {
        showAlert('Informação de Conexão', err?.message || 'Endereço salvo com sucesso no navegador.');
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

        {/* URL / ID Input Form */}
        <form onSubmit={handleLinkSubmit} className="space-y-2 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
          <label className="block font-semibold text-slate-300 text-[11px]">
            URL do Web App ou ID do Apps Script / Planilha:
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
                  Testando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">link</span>
                  {googleToken ? 'Atualizar Link' : 'Vincular Planilha'}
                </>
              )}
            </button>
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
