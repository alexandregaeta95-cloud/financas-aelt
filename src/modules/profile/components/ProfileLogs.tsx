import React from 'react';
import { AndroidLogsViewer } from '../../android';

interface ProfileLogsProps {
  showAlert?: (title: string, message: string) => void;
}

export const ProfileLogs: React.FC<ProfileLogsProps> = ({ showAlert }) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">article</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Logs de Sistema &amp; Diagnóstico</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">SYSTEM AUDIT</span>
      </div>

      <AndroidLogsViewer />
    </section>
  );
};

export default React.memo(ProfileLogs);
