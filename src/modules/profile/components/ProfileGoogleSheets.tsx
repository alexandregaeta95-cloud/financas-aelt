import React from 'react';

interface ProfileGoogleSheetsProps {
  googleToken?: string | null;
  googleUser?: any | null;
  onGoogleLogin?: () => Promise<void>;
  onGoogleLogout?: () => Promise<void>;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileGoogleSheets: React.FC<ProfileGoogleSheetsProps> = ({
  googleToken,
  googleUser,
  onGoogleLogin,
  onGoogleLogout
}) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">cloud_sync</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Integração Google Drive</h3>
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
        {/* Connection status */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="font-bold text-slate-200">
              {googleUser?.displayName || (googleToken ? 'Google Apps Script Conectado' : 'Google Drive')}
            </p>
            <p className="text-[10px] text-slate-400">
              {googleToken 
                ? 'Sincronização automática e transparente ativa (Offline-First)' 
                : 'Conecte seu Google Apps Script para sincronizar dados em tempo real'}
            </p>
          </div>
          {googleToken ? (
            <button
              type="button"
              onClick={onGoogleLogout}
              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95"
            >
              Desconectar
            </button>
          ) : (
            <button
              type="button"
              onClick={onGoogleLogin}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">link</span>
              Conectar Drive
            </button>
          )}
        </div>

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
