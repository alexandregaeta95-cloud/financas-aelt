import React, { useState } from 'react';
import { AssistantSettings } from '../types';
import { assistantLogger } from '../services/assistantLogger';

interface AssistantSettingsCardProps {
  settings: AssistantSettings;
  onUpdateSettings: (newSettings: Partial<AssistantSettings>) => void;
}

export const AssistantSettingsCard: React.FC<AssistantSettingsCardProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [logs, setLogs] = useState(() => assistantLogger.getLogs());

  const handleToggle = (key: keyof AssistantSettings) => {
    onUpdateSettings({ [key]: !settings[key] });
  };

  const handleRefreshLogs = () => {
    setLogs(assistantLogger.getLogs());
  };

  const handleClearLogs = () => {
    assistantLogger.clearLogs();
    setLogs([]);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="material-symbols-outlined text-amber-400 text-2xl">settings</span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              Configurações do Assistente Inteligente
            </h3>
            <p className="text-[11px] text-slate-400">
              Personalize a execução das análises, alertas e frequência de atualização.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block font-mono">Ativar Assistente Financeiro</span>
              <span className="text-[10px] text-slate-400 block font-mono">Executar análises em tempo real</span>
            </div>
            <input
              type="checkbox"
              checked={settings.ativarAssistente}
              onChange={() => handleToggle('ativarAssistente')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block font-mono">Ativar Alertas Inteligentes</span>
              <span className="text-[10px] text-slate-400 block font-mono">Alertas automáticos de risco e desvios</span>
            </div>
            <input
              type="checkbox"
              checked={settings.ativarAlertas}
              onChange={() => handleToggle('ativarAlertas')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block font-mono">Ativar Previsões Preditivas</span>
              <span className="text-[10px] text-slate-400 block font-mono">Projeções de saldo de 7 a 365 dias</span>
            </div>
            <input
              type="checkbox"
              checked={settings.ativarPrevisoes}
              onChange={() => handleToggle('ativarPrevisoes')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block font-mono">Ativar Recomendações IA</span>
              <span className="text-[10px] text-slate-400 block font-mono">Sugestões de economia explicáveis</span>
            </div>
            <input
              type="checkbox"
              checked={settings.ativarRecomendacoes}
              onChange={() => handleToggle('ativarRecomendacoes')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block font-mono">Atualizar Automaticamente</span>
              <span className="text-[10px] text-slate-400 block font-mono">Recalcular a cada novo lançamento</span>
            </div>
            <input
              type="checkbox"
              checked={settings.atualizarAutomaticamente}
              onChange={() => handleToggle('atualizarAutomaticamente')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block font-mono">Atualizar ao Abrir Aplicativo</span>
              <span className="text-[10px] text-slate-400 block font-mono">Processar lote de entrada no boot</span>
            </div>
            <input
              type="checkbox"
              checked={settings.atualizarAoAbrir}
              onChange={() => handleToggle('atualizarAoAbrir')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Logs View */}
      <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-3 shadow-xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">terminal</span>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Logs de Auditoria do Assistente
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshLogs}
              className="px-2.5 py-1 bg-slate-800 text-slate-200 text-xs font-mono font-bold rounded hover:bg-slate-700 cursor-pointer"
            >
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-mono font-bold rounded hover:bg-rose-500/20 cursor-pointer"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
          {logs.length === 0 ? (
            <div className="text-center text-xs text-slate-500 font-mono py-4">
              Nenhum log de auditoria do assistente registrado.
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="p-2 bg-slate-950/70 border border-slate-850 rounded text-[11px] font-mono flex justify-between items-center"
              >
                <div className="space-y-0.5">
                  <span className="text-indigo-400 font-bold block">{log.event}</span>
                  <span className="text-slate-300 block">{log.message}</span>
                </div>
                <div className="text-[10px] text-slate-500 text-right">
                  {log.processingTimeMs !== undefined && (
                    <span className="text-emerald-400 font-bold block">{log.processingTimeMs}ms</span>
                  )}
                  <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
