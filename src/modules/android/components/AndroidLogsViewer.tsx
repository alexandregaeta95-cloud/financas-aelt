import React, { useState, useEffect } from 'react';
import { androidLogger } from '../logs/androidLogger';
import { AndroidLogEntry } from '../types';

export const AndroidLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<AndroidLogEntry[]>([]);

  const reloadLogs = () => {
    setLogs(androidLogger.getLogs());
  };

  useEffect(() => {
    reloadLogs();
    const interval = setInterval(reloadLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleClear = () => {
    androidLogger.clearLogs();
    reloadLogs();
  };

  const getEventBadge = (event: AndroidLogEntry['event']) => {
    switch (event) {
      case 'NOTIFICATION_RECEIVED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">REMOTA</span>;
      case 'BANK_IDENTIFIED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">BANCO</span>;
      case 'VALUE_IDENTIFIED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">VALOR</span>;
      case 'PARSER_ERROR':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">ERRO</span>;
      case 'DUPLICATE_DETECTED':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">DUPLICADO</span>;
      case 'PROCESSING_TIME':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">DESEMPENHO</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-800 text-slate-300">INFO</span>;
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400 text-xl">terminal</span>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Logs do Listener Android
            </h4>
            <p className="text-[11px] text-slate-400">
              Histórico de auditoria, eventos de captura, tempo de resposta e filtros.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reloadLogs}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Atualizar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Limpar Logs
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs font-mono">
          Nenhum log registrado até o momento.
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2">
                  {getEventBadge(log.event)}
                  <span className="text-slate-200 font-medium">{log.message}</span>
                </div>
                {log.details && (
                  <div className="text-[10px] text-slate-400 bg-slate-900/60 p-1.5 rounded border border-slate-800/60 font-mono break-all">
                    {JSON.stringify(log.details)}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400">
                {log.processingTimeMs !== undefined && (
                  <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    ⚡ {log.processingTimeMs}ms
                  </span>
                )}
                <span>{new Date(log.timestamp).toLocaleTimeString('pt-BR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
