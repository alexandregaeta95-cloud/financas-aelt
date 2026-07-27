import React, { useState } from 'react';
import { PixSettingsView, PixHistoryComponent, PixSimulatorModal } from '../../pix';

interface ProfilePixProps {
  showAlert?: (title: string, message: string) => void;
}

export const ProfilePix: React.FC<ProfilePixProps> = ({ showAlert }) => {
  const [isPixSimulatorOpen, setIsPixSimulatorOpen] = useState(false);

  return (
    <div className="space-y-6">
      <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">bolt</span>
            <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Assistente de Leitura PIX</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsPixSimulatorOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">play_arrow</span>
            Simular Notificação PIX
          </button>
        </div>

        <PixSettingsView />
      </section>

      <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Histórico de Detecções PIX</h4>
        <PixHistoryComponent />
      </section>

      {isPixSimulatorOpen && (
        <PixSimulatorModal isOpen={isPixSimulatorOpen} onClose={() => setIsPixSimulatorOpen(false)} />
      )}
    </div>
  );
};

export default React.memo(ProfilePix);
