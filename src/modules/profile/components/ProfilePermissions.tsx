import React from 'react';
import { AndroidSettingsView } from '../../android';

interface ProfilePermissionsProps {
  showAlert?: (title: string, message: string) => void;
}

export const ProfilePermissions: React.FC<ProfilePermissionsProps> = ({ showAlert }) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">admin_panel_settings</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Permissões Android &amp; Dispositivo</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">ANDROID NATIVE</span>
      </div>

      <AndroidSettingsView />
    </section>
  );
};

export default React.memo(ProfilePermissions);
