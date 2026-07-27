import React, { useState } from 'react';
import { limparCache } from '../utils/profileUtils';

interface ProfilePrivacyProps {
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export const ProfilePrivacy: React.FC<ProfilePrivacyProps> = ({
  showAlert,
  showConfirm
}) => {
  const [hideValuesMode, setHideValuesMode] = useState(false);

  const handleClearCache = () => {
    if (showConfirm) {
      showConfirm(
        "Limpar Cache Temporário",
        "Deseja limpar o cache da sessão local? Isso não apaga seus dados gravados.",
        () => {
          limparCache();
          if (showAlert) showAlert("Cache Limpo", "Dados de navegação temporários foram removidos.");
        }
      );
    } else {
      limparCache();
      if (showAlert) showAlert("Cache Limpo", "Dados de navegação temporários foram removidos.");
    }
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400">visibility_off</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Privacidade &amp; Dados</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">SIGILO</span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Ocultar Valores Sensíveis (Modo Discreto)</p>
            <p className="text-[10px] text-slate-400">Borra saldos e montantes na tela principal</p>
          </div>
          <input
            type="checkbox"
            checked={hideValuesMode}
            onChange={(e) => {
              setHideValuesMode(e.target.checked);
              if (showAlert) showAlert("Modo Discreto", e.target.checked ? "Valores borrados por padrão." : "Valores visíveis.");
            }}
            className="accent-indigo-500 w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Limpeza de Cache de Sessão</p>
            <p className="text-[10px] text-slate-400">Remove temporários do navegador para otimizar desempenho</p>
          </div>
          <button
            type="button"
            onClick={handleClearCache}
            className="bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all active:scale-95"
          >
            Limpar Cache
          </button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfilePrivacy);
