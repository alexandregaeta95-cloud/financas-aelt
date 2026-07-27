import React, { useState } from 'react';

interface ProfileAIProps {
  showAlert?: (title: string, message: string) => void;
}

export const ProfileAI: React.FC<ProfileAIProps> = ({ showAlert }) => {
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [smartBudgetAdvice, setSmartBudgetAdvice] = useState(true);
  const [anomalyDetection, setAnomalyDetection] = useState(true);

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400">psychology</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Assistente Financeiro IA (Gemini 2.5)</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">AUTÔNOMO</span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Categorização Automática Inteligente</p>
            <p className="text-[10px] text-slate-400">Classifica extratos e comprovantes via IA</p>
          </div>
          <input
            type="checkbox"
            checked={autoCategorize}
            onChange={(e) => {
              setAutoCategorize(e.target.checked);
              if (showAlert) showAlert("IA Assistente", e.target.checked ? "Auto-categorização ativada." : "Auto-categorização pausada.");
            }}
            className="accent-purple-500 w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Sugestões de Economia em Tempo Real</p>
            <p className="text-[10px] text-slate-400">Recomendações personalizadas de corte de despesas</p>
          </div>
          <input
            type="checkbox"
            checked={smartBudgetAdvice}
            onChange={(e) => setSmartBudgetAdvice(e.target.checked)}
            className="accent-purple-500 w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Detecção de Anomalias &amp; Duplicidades</p>
            <p className="text-[10px] text-slate-400">Identifica lançamentos suspeitos ou em duplicidade</p>
          </div>
          <input
            type="checkbox"
            checked={anomalyDetection}
            onChange={(e) => setAnomalyDetection(e.target.checked)}
            className="accent-purple-500 w-4 h-4 cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileAI);
