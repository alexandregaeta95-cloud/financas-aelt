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
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-4 font-sans text-slate-100">
      {/* Header Section */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-3xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-400 text-3xl">directions_car</span>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight font-display uppercase">
                Cadastro de Veículos
              </h1>
              <p className="text-xs text-slate-400 font-mono">
                Mapeado com a aba <span className="text-amber-400 font-bold">9_Veiculos</span> (Colunas A a J)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onReindexVehicles && (
            <button
              type="button"
              onClick={onReindexVehicles}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700 font-mono"
            >
              <span className="material-symbols-outlined text-sm">format_list_numbered</span>
              Renumerar (#1, #2...)
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/10 transition-all cursor-pointer flex items-center gap-2 uppercase tracking-wider font-mono"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Novo Veículo
          </button>
        </div>
      </div>

      {/* Search & Counter Filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950 border border-slate-900 p-3.5 rounded-2xl">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-500 text-lg">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar veículo por descrição, placa, renavan, motorista..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="text-xs font-mono text-slate-400">
          Total: <span className="text-amber-400 font-bold">{filteredVehicles.length}</span> veículo(s)
        </div>
      </div>

      {/* Grid of Vehicles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVehicles.length === 0 ? (
          <div className="col-span-full bg-slate-950/40 border border-slate-900 p-12 rounded-3xl text-center space-y-3">
            <span className="material-symbols-outlined text-slate-700 text-5xl">no_crash</span>
            <p className="text-sm text-slate-400 italic font-mono">
              {searchQuery ? 'Nenhum veículo encontrado para a busca.' : 'Nenhum veículo cadastrado ainda.'}
            </p>
            {!searchQuery && (
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5"
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
                className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 p-5 rounded-2xl flex flex-col justify-between space-y-4 transition-all shadow-md group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2 border-b border-slate-800/80 pb-2.5">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        ID: #{veh.id}
                      </span>
                      <h3 className="font-bold text-white text-sm uppercase tracking-tight font-display mt-1">
                        {labelDesc}
                      </h3>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(veh)}
                        className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Editar Veículo"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(veh)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Veículo"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase">Placa (Col D)</span>
                      <span className="text-white font-bold">{veh.placa || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase">Motorista (Col C)</span>
                      <span className="text-slate-300">{veh.motorista || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase">Renavan (Col E)</span>
                      <span className="text-amber-400/90 font-bold">{renavanVal}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase">Chassi (Col F)</span>
                      <span className="text-slate-300 truncate block">{veh.chassi || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase">Marca / Modelo (G/H)</span>
                      <span className="text-slate-300">{veh.marca || '-'} / {veh.modelo || '-'}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                      <span className="text-slate-500 text-[9px] block uppercase">Ano / Ano Fab (I/J)</span>
                      <span className="text-slate-300">{anoVal} / {anoFabVal}</span>
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
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 font-sans">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4 z-10 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">directions_car</span>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-display">
                    {editingVehicle ? 'Editar Veículo (Aba 9_Veiculos)' : 'Novo Veículo (Aba 9_Veiculos)'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-3.5 text-left text-xs">
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                  />
                </div>

                {/* Motorista (C) & Placa (D) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna C: Motorista
                    </label>
                    <input
                      type="text"
                      value={formMotorista}
                      onChange={(e) => setFormMotorista(e.target.value)}
                      placeholder="Ex: ALEXANDRE"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Renavan (E) & Chassi (F) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-amber-400 font-bold uppercase font-mono block mb-1">
                      Coluna E: Renavan
                    </label>
                    <input
                      type="text"
                      value={formRenavan}
                      onChange={(e) => setFormRenavan(e.target.value)}
                      placeholder="Ex: 00123456789"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-400 outline-none focus:border-amber-500 font-mono font-bold uppercase"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Marca (G) & Modelo (H) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna G: Marca
                    </label>
                    <input
                      type="text"
                      value={formMarca}
                      onChange={(e) => setFormMarca(e.target.value)}
                      placeholder="Ex: VOLKSWAGEN"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 uppercase font-mono"
                    />
                  </div>
                </div>

                {/* Ano (I) & Ano_Fabricação (J) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Coluna I: Ano
                    </label>
                    <input
                      type="text"
                      value={formAno}
                      onChange={(e) => setFormAno(e.target.value)}
                      placeholder="Ex: 2014"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer font-mono uppercase"
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
