import React, { useState } from 'react';

interface SimulatorCardProps {
  isSimulating: boolean;
  onAddReceita: (valor: number, descricao: string, categoria?: string) => void;
  onAddDespesa: (valor: number, descricao: string, categoria?: string) => void;
  onClear: () => void;
}

export const SimulatorCard: React.FC<SimulatorCardProps> = ({
  isSimulating,
  onAddReceita,
  onAddDespesa,
  onClear
}) => {
  const [valor, setValor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState<'RECEITA' | 'DESPESA'>('DESPESA');

  const handleSimular = (e: React.FormEvent) => {
    e.preventDefault();
    const valNum = parseFloat(valor.replace(',', '.'));
    if (!valNum || isNaN(valNum) || !descricao) return;

    if (tipo === 'RECEITA') {
      onAddReceita(valNum, descricao);
    } else {
      onAddDespesa(valNum, descricao);
    }

    setValor('');
    setDescricao('');
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400 text-2xl">science</span>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              Simulador Financeiro em Tempo Real
              {isSimulating && (
                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  SIMULAÇÃO ATIVA
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Adicione hipóteses de novas receitas, cortes ou parcelas para testar o impacto imediato.
            </p>
          </div>
        </div>

        {isSimulating && (
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono rounded-lg cursor-pointer transition-colors"
          >
            Resetar Simulações
          </button>
        )}
      </div>

      <form onSubmit={handleSimular} className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div>
          <label className="text-slate-400 block mb-1">Tipo de Evento</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
          >
            <option value="DESPESA">Simular Nova Despesa</option>
            <option value="RECEITA">Simular Nova Receita / Aumento</option>
          </select>
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Descrição do Cenário</label>
          <input
            type="text"
            placeholder="Ex: Compra do Notebook / Aumento Salarial"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
            required
          />
        </div>

        <div>
          <label className="text-slate-400 block mb-1">Valor (R$)</label>
          <input
            type="number"
            step="0.01"
            placeholder="250.00"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-white"
            required
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded cursor-pointer transition-colors"
          >
            Simular Impacto IA
          </button>
        </div>
      </form>
    </div>
  );
};
