import React, { useState, useMemo } from 'react';
import { RegisteredVehicle } from '../types';
import { useVehicles } from '../modules/veiculos/hooks/useVehicles';
import { AnimatePresence, motion } from 'motion/react';

export interface VeiculosPageProps {
  registeredVehicles?: RegisteredVehicle[];
  onAddVehicle?: (vehicle: RegisteredVehicle) => Promise<void>;
  onEditVehicle?: (id: string, updatedFields: Partial<RegisteredVehicle>) => Promise<void>;
  onDeleteVehicle?: (id: string) => Promise<void>;
  onReindexVehicles?: () => Promise<void>;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export const VeiculosPage: React.FC<VeiculosPageProps> = ({
  registeredVehicles: propVehicles,
  onAddVehicle,
  onEditVehicle,
  onDeleteVehicle,
  onReindexVehicles,
  showAlert = (t, m) => alert(`${t}: ${m}`),
  showConfirm = (t, m, c) => { if (confirm(`${t}\n${m}`)) c(); }
}) => {
  const { vehicles: hookVehicles, carregar } = useVehicles();
  const safeVehicles = useMemo(() => {
    if (Array.isArray(propVehicles) && propVehicles.length > 0) return propVehicles;
    return hookVehicles || [];
  }, [propVehicles, hookVehicles]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<RegisteredVehicle | null>(null);

  // Form Fields mapped to 9_Veiculos (Colunas A a J)
  const [formId, setFormId] = useState('');
  const [formDescricao, setFormDescricao] = useState(''); // B: Descrição
  const [formMotorista, setFormMotorista] = useState(''); // C: Motorista
  const [formPlaca, setFormPlaca] = useState(''); // D: Placa
  const [formRenavan, setFormRenavan] = useState(''); // E: Renavan
  const [formChassi, setFormChassi] = useState(''); // F: Chassi
  const [formMarca, setFormMarca] = useState(''); // G: Marca
  const [formModelo, setFormModelo] = useState(''); // H: Modelo
  const [formAno, setFormAno] = useState(''); // I: Ano
  const [formAnoFabricacao, setFormAnoFabricacao] = useState(''); // J: Ano_Fabricação

  const filteredVehicles = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return safeVehicles;
    const words = q.split(/\s+/).filter(Boolean);
    return safeVehicles.filter(v => {
      const combined = `${v.id || ''} ${v.descricao || ''} ${v.motorista || ''} ${v.placa || ''} ${v.renavan || v.renavam || ''} ${v.chassi || ''} ${v.marca || ''} ${v.modelo || ''} ${v.ano || ''} ${v.anoFabricacao || v.Ano_Fabricação || ''}`.toLowerCase();
      return words.every(w => combined.includes(w));
    });
  }, [safeVehicles, searchQuery]);

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setFormId(Date.now().toString());
    setFormDescricao('');
    setFormMotorista('');
    setFormPlaca('');
    setFormRenavan('');
    setFormChassi('');
    setFormMarca('');
    setFormModelo('');
    setFormAno('');
    setFormAnoFabricacao('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (veh: RegisteredVehicle) => {
    setEditingVehicle(veh);
    setFormId(String(veh.id || ''));
    setFormDescricao(veh.descricao || (veh as any).nome || '');
    setFormMotorista(veh.motorista || '');
    setFormPlaca(veh.placa || '');
    setFormRenavan(veh.renavan || veh.renavam || (veh as any).Renavan || (veh as any).Renavam || '');
    setFormChassi(veh.chassi || (veh as any).Chassi || '');
    setFormMarca(veh.marca || (veh as any).Marca || '');
    setFormModelo(veh.modelo || (veh as any).Modelo || '');
    setFormAno(veh.ano !== undefined && veh.ano !== null ? String(veh.ano) : '');
    setFormAnoFabricacao(veh.anoFabricacao !== undefined && veh.anoFabricacao !== null ? String(veh.anoFabricacao) : (veh.Ano_Fabricação !== undefined ? String(veh.Ano_Fabricação) : ''));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescricao.trim()) {
      showAlert('Aviso ⚠️', 'Por favor, informe a descrição do veículo (ex: FOX PRATA 1.6).');
      return;
    }

    const payload: RegisteredVehicle = {
      id: formId || Date.now().toString(),
      descricao: formDescricao.trim().toUpperCase(),
      motorista: formMotorista.trim().toUpperCase(),
      placa: formPlaca.trim().toUpperCase(),
      renavan: formRenavan.trim().toUpperCase(),
      renavam: formRenavan.trim().toUpperCase(),
      chassi: formChassi.trim().toUpperCase(),
      marca: formMarca.trim().toUpperCase(),
      modelo: formModelo.trim().toUpperCase(),
      ano: formAno.trim(),
      anoFabricacao: formAnoFabricacao.trim(),
      Ano_Fabricação: formAnoFabricacao.trim()
    };

    try {
      if (editingVehicle) {
        if (onEditVehicle) {
          await onEditVehicle(editingVehicle.id, payload);
        } else {
          // Fallback direct storage
          const stored = localStorage.getItem('wealthflow_registered_vehicles') || '[]';
          const list: RegisteredVehicle[] = JSON.parse(stored);
          const updated = list.map(v => String(v.id) === String(editingVehicle.id) ? { ...v, ...payload } : v);
          localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(updated));
          carregar();
        }
        showAlert('Sucesso 🎉', 'Veículo atualizado com sucesso!');
      } else {
        if (onAddVehicle) {
          await onAddVehicle(payload);
        } else {
          // Fallback direct storage
          const stored = localStorage.getItem('wealthflow_registered_vehicles') || '[]';
          const list: RegisteredVehicle[] = JSON.parse(stored);
          const updated = [payload, ...list];
          localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(updated));
          carregar();
        }
        showAlert('Sucesso 🎉', 'Veículo cadastrado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      console.error(err);
      showAlert('Erro ❌', `Não foi possível salvar o veículo: ${err?.message || err}`);
    }
  };

  const handleDelete = (veh: RegisteredVehicle) => {
    const desc = veh.descricao || veh.modelo || `ID #${veh.id}`;
    showConfirm(
      'Excluir Veículo 🗑️',
      `Deseja realmente excluir o veículo "${desc}"?`,
      async () => {
        try {
          if (onDeleteVehicle) {
            await onDeleteVehicle(veh.id);
          } else {
            const stored = localStorage.getItem('wealthflow_registered_vehicles') || '[]';
            const list: RegisteredVehicle[] = JSON.parse(stored);
            const updated = list.filter(v => String(v.id) !== String(veh.id));
            localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(updated));
            carregar();
          }
          showAlert('Sucesso 🎉', 'Veículo excluído!');
        } catch (e: any) {
          console.error(e);
          showAlert('Erro ❌', 'Não foi possível excluir o veículo.');
        }
      }
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-16 max-w-7xl mx-auto px-2.5 sm:px-4 font-sans text-slate-100">
      {/* Header Section */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 sm:p-6 rounded-2xl sm:rounded-3xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-amber-400 text-2xl sm:text-3xl">directions_car</span>
          </div>
          <div>
            <h1 className="text-base sm:text-xl font-extrabold text-white tracking-tight font-display uppercase">
              Cadastro de Veículos
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 font-mono">
              Planilha Finança Data <span className="text-amber-400 font-bold">Aba 9_Veiculos</span> (Colunas A a J)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {onReindexVehicles && (
            <button
              type="button"
              onClick={onReindexVehicles}
              className="flex-1 sm:flex-initial px-3 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-slate-700 font-mono"
            >
              <span className="material-symbols-outlined text-sm">format_list_numbered</span>
              Renumerar (#1, #2...)
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider font-mono"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Novo Veículo
          </button>
        </div>
      </div>

      {/* Search & Counter Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-slate-950 border border-slate-900 p-3 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-lg pointer-events-none">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por descrição, placa, renavan, motorista..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-8 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white p-0.5 rounded"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-slate-400 self-end sm:self-center">
          Total: <span className="text-amber-400 font-bold">{filteredVehicles.length}</span> veículo(s)
        </div>
      </div>

      {/* Grid of Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full bg-slate-950/40 border border-slate-900 p-8 sm:p-12 rounded-2xl sm:rounded-3xl text-center space-y-3">
            <span className="material-symbols-outlined text-slate-700 text-5xl">no_crash</span>
            <p className="text-xs sm:text-sm text-slate-400 italic font-mono">
              {searchQuery ? 'Nenhum veículo encontrado para a busca.' : 'Nenhum veículo cadastrado ainda.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Cadastrar Primeiro Veículo
              </button>
            )}
          </div>
        ) : (
          filteredVehicles.map((veh, index) => {
            const labelDesc = veh.descricao || (veh as any).nome || `${veh.marca || ''} ${veh.modelo || ''}`.trim() || `Veículo ${index + 1}`;
            const renavanVal = veh.renavan || veh.renavam || (veh as any).Renavan || (veh as any).Renavam || '-';
            const anoVal = veh.ano || '-';
            const anoFabVal = veh.anoFabricacao || veh.Ano_Fabricação || '-';

            return (
              <div
                key={veh.id || index}
                className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 p-4 sm:p-5 rounded-2xl flex flex-col justify-between space-y-3.5 transition-all shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-block mb-1">
                        A: ID #{veh.id}
                      </span>
                      <h3 className="font-bold text-white text-sm uppercase tracking-tight font-display truncate">
                        {labelDesc}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(veh)}
                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer active:scale-95"
                        title="Editar Veículo"
                      >
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(veh)}
                        className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer active:scale-95"
                        title="Excluir Veículo"
                      >
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase font-bold">Col D • Placa</span>
                      <span className="text-white font-bold text-xs">{veh.placa || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase font-bold">Col C • Motorista</span>
                      <span className="text-slate-300 truncate block text-xs">{veh.motorista || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase font-bold">Col E • Renavan</span>
                      <span className="text-amber-400/90 font-bold text-xs">{renavanVal}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase font-bold">Col F • Chassi</span>
                      <span className="text-slate-300 truncate block text-xs">{veh.chassi || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase font-bold">Cols G/H • Marca / Modelo</span>
                      <span className="text-slate-300 truncate block text-xs">{veh.marca || '-'} / {veh.modelo || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase font-bold">Cols I/J • Ano / Fab</span>
                      <span className="text-slate-300 text-xs">{anoVal} / {anoFabVal}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Cadastro / Edição de Veículo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4 font-sans">
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-lg p-4 sm:p-6 shadow-2xl space-y-4 z-10 max-h-[92vh] flex flex-col justify-between">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">directions_car</span>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider font-display">
                    {editingVehicle ? 'Editar Veículo (Aba 9_Veiculos)' : 'Novo Veículo (Aba 9_Veiculos)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3 text-left text-xs overflow-y-auto pr-1 flex-1 custom-scrollbar">
                {/* ID (A) */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                    Coluna A: ID (Gerado Automaticamente)
                  </label>
                  <input
                    type="text"
                    value={formId}
                    readOnly
                    className="w-full bg-slate-950/60 border border-slate-850 rounded-xl p-2.5 text-xs text-amber-400 font-mono outline-none cursor-not-allowed"
                  />
                </div>

                {/* Descrição (B) */}
                <div>
                  <label className="text-[10px] text-slate-300 font-bold uppercase font-mono block mb-1">
                    Coluna B: Descrição * (ex: Nome/Apelido do Veículo)
                  </label>
                  <input
                    type="text"
                    value={formDescricao}
                    onChange={(e) => setFormDescricao(e.target.value)}
                    placeholder="Ex: FOX ROCK RIO 1.6"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                  />
                </div>

                {/* Motorista (C) & Placa (D) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna C: Motorista
                    </label>
                    <input
                      type="text"
                      value={formMotorista}
                      onChange={(e) => setFormMotorista(e.target.value)}
                      placeholder="Ex: ALEXANDRE"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna D: Placa
                    </label>
                    <input
                      type="text"
                      value={formPlaca}
                      onChange={(e) => setFormPlaca(e.target.value)}
                      placeholder="Ex: ABC-1234"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Renavan (E) & Chassi (F) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-amber-400 font-bold uppercase font-mono block mb-1">
                      Coluna E: Renavan
                    </label>
                    <input
                      type="text"
                      value={formRenavan}
                      onChange={(e) => setFormRenavan(e.target.value)}
                      placeholder="Ex: 00123456789"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-amber-400 outline-none focus:border-amber-500 font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna F: Chassi
                    </label>
                    <input
                      type="text"
                      value={formChassi}
                      onChange={(e) => setFormChassi(e.target.value)}
                      placeholder="Ex: 9BWZZZ..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Marca (G) & Modelo (H) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna G: Marca
                    </label>
                    <input
                      type="text"
                      value={formMarca}
                      onChange={(e) => setFormMarca(e.target.value)}
                      placeholder="Ex: VOLKSWAGEN"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna H: Modelo
                    </label>
                    <input
                      type="text"
                      value={formModelo}
                      onChange={(e) => setFormModelo(e.target.value)}
                      placeholder="Ex: FOX"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Ano (I) & Ano_Fabricação (J) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna I: Ano
                    </label>
                    <input
                      type="text"
                      value={formAno}
                      onChange={(e) => setFormAno(e.target.value)}
                      placeholder="Ex: 2014"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna J: Ano_Fabricação
                    </label>
                    <input
                      type="text"
                      value={formAnoFabricacao}
                      onChange={(e) => setFormAnoFabricacao(e.target.value)}
                      placeholder="Ex: 2013"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm sm:text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer font-mono uppercase"
                  >
                    Salvar Veículo
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VeiculosPage;
