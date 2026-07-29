import React from 'react';
import { ProfileSubTab } from '../types/profile';

interface ProfileHeaderProps {
  userName: string;
  userEmail: string;
  avatarUrl: string;
  activeSubTab: ProfileSubTab;
  setActiveSubTab: (tab: ProfileSubTab) => void;
  onOpenAvatarModal?: () => void;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userName,
  userEmail,
  avatarUrl,
  activeSubTab,
  setActiveSubTab,
  onOpenAvatarModal
}) => {
  return (
    <div className="space-y-6">
      {/* User Header Summary Card */}
      <section className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl flex flex-col items-center text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10" />
        
        <div className="relative mt-2">
          <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 bg-slate-950 flex items-center justify-center">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-4xl text-slate-500">person</span>
            )}
          </div>
          {onOpenAvatarModal && (
            <button
              type="button"
              onClick={onOpenAvatarModal}
              className="absolute bottom-0 right-0 bg-emerald-500 hover:bg-emerald-400 text-slate-950 p-1.5 rounded-full shadow-lg transition-all active:scale-95 cursor-pointer"
              title="Alterar Foto"
            >
              <span className="material-symbols-outlined text-xs font-bold">photo_camera</span>
            </button>
          )}
        </div>

        <h2 className="mt-3 font-bold text-lg text-white font-display">{userName || 'Usuário Premium'}</h2>
        <p className="text-xs text-slate-400 font-mono">{userEmail || 'usuario@exemplo.com'}</p>

        <div className="mt-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold tracking-wider uppercase font-mono">
          <span className="material-symbols-outlined text-xs">workspace_premium</span>
          Premium Partner
        </div>
      </section>

      {/* Sub-tabs selector for ProfileTab */}
      <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-slate-800/80 w-full max-w-3xl mx-auto overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('config')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeSubTab === 'config'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
          id="btn-subtab-config"
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          Configurações
        </button>

        <button
          onClick={() => setActiveSubTab('notificacoes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap relative ${
            activeSubTab === 'notificacoes'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
          id="btn-subtab-notificacoes"
        >
          <span className="material-symbols-outlined text-sm">notifications</span>
          Notificações
        </button>

        <button
          onClick={() => setActiveSubTab('metas')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap relative ${
            activeSubTab === 'metas'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
          id="btn-subtab-metas"
        >
          <span className="material-symbols-outlined text-sm">savings</span>
          Metas de Economia
        </button>

        <button
          onClick={() => setActiveSubTab('integracoes')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap relative ${
            activeSubTab === 'integracoes'
              ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
          }`}
          id="btn-subtab-integracoes"
        >
          <span className="material-symbols-outlined text-sm">sync_alt</span>
          Backups &amp; Integrações
          <span className="absolute -top-1 -right-1 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
          </span>
        </button>
      </div>
    </div>
  );
};

export default React.memo(ProfileHeader);
