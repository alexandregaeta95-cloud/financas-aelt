import React, { useState, useEffect } from 'react';
import { PixHistory } from '../types';
import { pixHistoryService } from './pixHistoryService';
import { formatarPix } from '../utils/pixUtils';

export function PixHistoryView() {
  const [history, setHistory] = useState<PixHistory[]>([]);
  const [filter, setFilter] = useState<string>('TODOS');
  const [search, setSearch] = useState<string>('');

  const carregar = () => {
    setHistory(pixHistoryService.obterHistorico());
  };

  useEffect(() => {
    carregar();
  }, []);

  const handleLimpar = () => {
    if (confirm('Deseja realmente limpar todo o histórico do Assistente PIX?')) {
      pixHistoryService.limparHistorico();
      carregar();
    }
  };

  const filteredHistory = history.filter(item => {
    if (filter !== 'TODOS' && item.status !== filter) return false;
    if (search) {
      const low = (search || '').toLowerCase();
      const matchBanco = (item.banco || '').toLowerCase().includes(low);
      const matchTexto = (item.textoRecebido || '').toLowerCase().includes(low);
      if (!matchBanco && !matchTexto) return false;
    }
    return true;
  });

  return {
    history: filteredHistory,
    totalCount: history.length,
    filter,
    setFilter,
    search,
    setSearch,
    carregar,
    handleLimpar
  };
}

export function PixHistoryComponent() {
  const {
    history,
    totalCount,
    filter,
    setFilter,
    search,
    setSearch,
    carregar,
    handleLimpar
  } = PixHistoryView();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📜 Histórico de Detecções PIX
          </h3>
          <p className="text-xs text-slate-400">
            Registro detalhado de todas as notificações e comprovantes PIX processados pelo assistente.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={carregar}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition"
          >
            🔄 Atualizar
          </button>
          {totalCount > 0 && (
            <button
              onClick={handleLimpar}
              className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold transition"
            >
              🗑️ Limpar
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Buscar por banco ou texto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <select
          value={filter}
          onChange={e => setFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
        >
          <option value="TODOS">Todos os Status</option>
          <option value="CONFIRMADO">Confirmados</option>
          <option value="IGNORADO">Ignorados</option>
          <option value="DUPLICADO">Duplicados</option>
          <option value="ERRO">Erros</option>
        </select>
      </div>

      {/* Table / List */}
      {history.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">
          Nenhum registro encontrado no histórico.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Data/Hora</th>
                <th className="py-2.5 px-3">Banco</th>
                <th className="py-2.5 px-3">Valor</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Texto Processado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {history.map(item => {
                let badgeBg = 'bg-slate-800 text-slate-300 border-slate-700';
                if (item.status === 'CONFIRMADO') badgeBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
                if (item.status === 'IGNORADO') badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
                if (item.status === 'DUPLICADO') badgeBg = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
                if (item.status === 'ERRO') badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                return (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-400">
                      {new Date(item.dataHora).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {item.banco}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-100">
                      {formatarPix(item.valor)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${badgeBg}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-xs truncate text-slate-400">
                      {item.textoRecebido}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PixHistoryComponent;
