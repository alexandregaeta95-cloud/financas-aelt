import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CarServicePerformed, CarServiceScheduled, RegisteredVehicle, BankAccount, Transaction } from '../../../types';

interface CarServicesTabProps {
  performedServices: CarServicePerformed[];
  scheduledServices: CarServiceScheduled[];
  registeredVehicles: RegisteredVehicle[];
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  onAddPerformedService: (service: any) => Promise<void>;
  onEditPerformedService: (id: string, service: any) => Promise<void>;
  onDeletePerformedService: (id: string) => Promise<void>;
  onAddScheduledService: (service: any) => Promise<void>;
  onEditScheduledService: (id: string, service: any) => Promise<void>;
  onDeleteScheduledService: (id: string) => Promise<void>;
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  onAddFuel?: () => void;
  onReindexPerformedServices?: () => void;
  onReindexScheduledServices?: () => void;
}

export default function CarServicesTab({
  performedServices,
  scheduledServices,
  registeredVehicles,
  bankAccounts,
  transactions,
  onAddPerformedService,
  onEditPerformedService,
  onDeletePerformedService,
  onAddScheduledService,
  onEditScheduledService,
  onDeleteScheduledService,
  onAddTransaction,
  showAlert,
  showConfirm
}: CarServicesTabProps) {
  // Safe Array Fallbacks
  const safePerformedServices = Array.isArray(performedServices) ? performedServices.filter(Boolean) : [];
  const safeScheduledServices = Array.isArray(scheduledServices) ? scheduledServices.filter(Boolean) : [];
  const safeRegisteredVehicles = Array.isArray(registeredVehicles) ? registeredVehicles.filter(Boolean) : [];

  const [activeSubTab, setActiveSubTab] = useState<'REALIZADOS' | 'AGENDADOS'>('REALIZADOS');
  const [vehicleFilter, setVehicleFilter] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modais
  const [isPerformedModalOpen, setIsPerformedModalOpen] = useState(false);
  const [editingPerformed, setEditingPerformed] = useState<CarServicePerformed | null>(null);
  
  // Campos do Formulário para bater com a planilha
  const [perfVehicle, setPerfVehicle] = useState('FOX ROCK RIO 1.6');
  const [perfDescription, setPerfDescription] = useState('');
  const [perfDate, setPerfDate] = useState(new Date().toISOString().split('T')[0]);
  const [perfKm, setPerfKm] = useState('');
  const [perfValor, setPerfValor] = useState('');
  const [perfOficina, setPerfOficina] = useState('');
  const [perfObservacoes, setPerfObservacoes] = useState('');

  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState<CarServiceScheduled | null>(null);
  const [schedVehicle, setSchedVehicle] = useState('FOX ROCK RIO 1.6');
  const [schedDescription, setSchedDescription] = useState('');
  const [schedType, setSchedType] = useState<'DATA' | 'KM' | 'DATA_E_KM'>('DATA');
  const [schedDateAlvo, setSchedDateAlvo] = useState('');
  const [schedKmAlvo, setSchedKmAlvo] = useState('');

  const handleOpenAddPerformed = () => {
    setEditingPerformed(null);
    setPerfVehicle(safeRegisteredVehicles[0]?.descricao || 'FOX ROCK RIO 1.6');
    setPerfDescription('');
    setPerfDate(new Date().toISOString().split('T')[0]);
    setPerfKm('');
    setPerfValor('');
    setPerfOficina('');
    setPerfObservacoes('');
    setIsPerformedModalOpen(true);
  };

  const handleOpenEditPerformed = (serv: CarServicePerformed) => {
    setEditingPerformed(serv);
    setPerfVehicle(serv.veiculoDescricao || (serv as any)['Veículo'] || safeRegisteredVehicles[0]?.descricao || 'FOX ROCK RIO 1.6');
    setPerfDescription(serv.descricao || (serv as any)['Descrição do Serviço'] || (serv as any)['Descrição'] || '');
    const rawDate = serv.data || (serv as any)['Data Realização'] || (serv as any)['Data'] || '';
    setPerfDate(rawDate.includes('T') ? rawDate.split('T')[0] : (rawDate || new Date().toISOString().split('T')[0]));
    const rawKm = serv.km ?? (serv as any)['Quilometragem (KM)'] ?? (serv as any)['KM'];
    setPerfKm(rawKm !== undefined && rawKm !== null ? String(rawKm) : '');
    const rawVal = (serv as any)['Valor Pago (R$)'] ?? (serv as any)['Valor (R$)'] ?? serv.valor ?? 0;
    setPerfValor(rawVal ? String(rawVal).replace('.', ',') : '');
    setPerfOficina(serv.oficina || (serv as any)['Oficina/Estabelecimento'] || (serv as any)['Oficina'] || '');
    setPerfObservacoes(serv.observacoes || (serv as any)['Observações'] || '');
    setIsPerformedModalOpen(true);
  };

  const handleDeletePerformed = (serv: CarServicePerformed) => {
    const desc = serv.descricao || (serv as any)['Descrição do Serviço'] || 'este serviço';
    showConfirm(
      "Excluir Serviço 🗑️",
      `Deseja realmente excluir "${desc}" da oficina?`,
      async () => {
        try {
          await onDeletePerformedService(serv.id);
          showAlert("Sucesso 🎉", "Serviço excluído com sucesso!");
        } catch (e) {
          console.error(e);
          showAlert("Erro ❌", "Não foi possível excluir o serviço.");
        }
      }
    );
  };

  const handleOpenAddScheduled = () => {
    setEditingScheduled(null);
    setSchedVehicle(safeRegisteredVehicles[0]?.descricao || 'FOX ROCK RIO 1.6');
    setSchedDescription('');
    setSchedType('DATA');
    setSchedDateAlvo('');
    setSchedKmAlvo('');
    setIsScheduledModalOpen(true);
  };

  const handleOpenEditScheduled = (sched: CarServiceScheduled) => {
    setEditingScheduled(sched);
    setSchedVehicle(sched.veiculoDescricao || (sched as any)['Veículo'] || safeRegisteredVehicles[0]?.descricao || 'FOX ROCK RIO 1.6');
    setSchedDescription(sched.descricao || (sched as any)['Descrição do Serviço'] || '');
    setSchedType(sched.tipoAgendamento || (sched as any)['Tipo Agendamento'] || 'DATA');
    setSchedDateAlvo(sched.dataAlvo || (sched as any)['Data Alvo'] || '');
    const rawKm = sched.kmAlvo ?? (sched as any)['KM Alvo'];
    setSchedKmAlvo(rawKm !== undefined && rawKm !== null ? String(rawKm) : '');
    setIsScheduledModalOpen(true);
  };

  const handleDeleteScheduled = (sched: CarServiceScheduled) => {
    const desc = sched.descricao || (sched as any)['Descrição do Serviço'] || 'este agendamento';
    showConfirm(
      "Excluir Agendamento 🗑️",
      `Deseja realmente excluir o agendamento "${desc}"?`,
      async () => {
        try {
          await onDeleteScheduledService(sched.id);
          showAlert("Sucesso 🎉", "Agendamento excluído com sucesso!");
        } catch (e) {
          console.error(e);
          showAlert("Erro ❌", "Não foi possível excluir o agendamento.");
        }
      }
    );
  };

  const handleSavePerformed = async () => {
    if (!perfDescription.trim()) {
      showAlert("Aviso ⚠️", "Por favor, informe a descrição do serviço.");
      return;
    }

    const cleanValorStr = perfValor.replace(/\./g, "").replace(",", ".");
    const parsedValor = cleanValorStr ? parseFloat(cleanValorStr) : 0;
    const parsedKm = perfKm ? parseInt(perfKm, 10) : "";

    try {
      const payload = {
        // Chaves para a Planilha do Google Apps Script
        "Veículo": (perfVehicle || 'FOX ROCK RIO 1.6').toUpperCase(),
        "Descrição do Serviço": perfDescription.trim(),
        "Data Realização": perfDate,
        "Quilometragem (KM)": parsedKm,
        "Valor Pago (R$)": parsedValor,
        "Oficina/Estabelecimento": perfOficina.trim(),
        "Observações": perfObservacoes.trim(),

        // Chaves internas legadas do React
        veiculoDescricao: (perfVehicle || 'FOX ROCK RIO 1.6').toUpperCase(),
        descricao: perfDescription.trim(),
        data: perfDate,
        km: parsedKm || undefined,
        valor: parsedValor,
        oficina: perfOficina.trim() || undefined,
        observacoes: perfObservacoes.trim() || undefined,
        updatedAt: Date.now()
      };

      if (editingPerformed) {
        await onEditPerformedService(editingPerformed.id, payload);
        showAlert("Sucesso 🎉", "Serviço atualizado com sucesso!");
      } else {
        await onAddPerformedService(payload);
        showAlert("Sucesso 🎉", "Serviço salvo e enviado para a planilha!");
      }

      setIsPerformedModalOpen(false);
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Não foi possível salvar na planilha.");
    }
  };

  const handleSaveScheduled = async () => {
    if (!schedDescription.trim()) {
      showAlert("Aviso ⚠️", "Por favor, informe a descrição do agendamento.");
      return;
    }

    try {
      const payload = {
        "Veículo": (schedVehicle || 'FOX ROCK RIO 1.6').toUpperCase(),
        "Descrição do Serviço": schedDescription.trim(),
        "Data Alvo": schedType !== 'KM' ? schedDateAlvo : "",
        "KM Alvo": schedType !== 'DATA' ? (schedKmAlvo ? parseInt(schedKmAlvo, 10) : "") : "",
        "Tipo Agendamento": schedType,
        "Status": 'PENDENTE',

        veiculoDescricao: (schedVehicle || 'FOX ROCK RIO 1.6').toUpperCase(),
        descricao: schedDescription.trim(),
        tipoAgendamento: schedType,
        dataAlvo: schedType !== 'KM' ? schedDateAlvo : undefined,
        kmAlvo: schedType !== 'DATA' ? (schedKmAlvo ? parseInt(schedKmAlvo, 10) : undefined) : undefined,
        status: 'PENDENTE',
        updatedAt: Date.now()
      };

      if (editingScheduled) {
        await onEditScheduledService(editingScheduled.id, payload);
        showAlert("Sucesso 🎉", "Agendamento atualizado com sucesso!");
      } else {
        await onAddScheduledService(payload);
        showAlert("Sucesso 🎉", "Agendamento salvo na planilha!");
      }

      setIsScheduledModalOpen(false);
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Não foi possível salvar o agendamento.");
    }
  };

  const filteredPerformed = useMemo(() => {
    return safePerformedServices
      .filter(s => {
        if (!s) return false;
        const sVehDesc = (s.veiculoDescricao || (s as any)['Veículo'] || '').toUpperCase();
        const vfUpper = (vehicleFilter || 'TODOS').toUpperCase();
        const matchesVehicle = vfUpper === 'TODOS' || sVehDesc === vfUpper;

        const q = (searchQuery || '').toLowerCase();
        const sDesc = (s.descricao || (s as any)['Descrição do Serviço'] || (s as any)['Descrição'] || '').toLowerCase();
        const sOficina = (s.oficina || (s as any)['Oficina/Estabelecimento'] || (s as any)['Oficina'] || '').toLowerCase();
        const sObs = (s.observacoes || (s as any)['Observações'] || '').toLowerCase();
        const matchesSearch = !q || sDesc.includes(q) || sVehDesc.toLowerCase().includes(q) || sOficina.includes(q) || sObs.includes(q);
        return matchesVehicle && matchesSearch;
      });
  }, [safePerformedServices, vehicleFilter, searchQuery]);

  const filteredScheduled = useMemo(() => {
    return safeScheduledServices
      .filter(s => {
        if (!s) return false;
        const sVehDesc = (s.veiculoDescricao || (s as any)['Veículo'] || '').toUpperCase();
        const vfUpper = (vehicleFilter || 'TODOS').toUpperCase();
        const matchesVehicle = vfUpper === 'TODOS' || sVehDesc === vfUpper;

        const q = (searchQuery || '').toLowerCase();
        const sDesc = (s.descricao || (s as any)['Descrição do Serviço'] || (s as any)['Descrição'] || '').toLowerCase();
        const matchesSearch = !q || sDesc.includes(q) || sVehDesc.toLowerCase().includes(q);
        return matchesVehicle && matchesSearch && s.status !== 'REALIZADO';
      });
  }, [safeScheduledServices, vehicleFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header Visual */}
      <div className="flex justify-between items-center bg-slate-950/40 p-4 border border-slate-900/80 rounded-2xl">
        <div className="space-y-0.5">
          <h2 className="text-sm font-bold text-slate-100 uppercase tracking-widest font-display flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-lg">build_circle</span>
            Manutenção do Carro / Oficina
          </h2>
          <p className="text-[10px] text-slate-400 font-mono">Controle de revisões, trocas de óleo e agendamentos</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={activeSubTab === 'REALIZADOS' ? handleOpenAddPerformed : handleOpenAddScheduled}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] rounded-xl flex items-center gap-1 cursor-pointer transition-colors uppercase tracking-wider active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-xs font-bold">add</span>
            {activeSubTab === 'REALIZADOS' ? 'Novo Serviço' : 'Agendar'}
          </button>
        </div>
      </div>

      {/* Pesquisa e Filtros */}
      <div className="space-y-2">
        <div className="relative flex items-center">
          <span className="material-symbols-outlined absolute left-3 text-slate-500 text-sm">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar por serviço, oficina ou observação..."
            className="w-full bg-slate-950 border border-slate-900 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/50 transition-colors font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 text-slate-500 hover:text-slate-300 p-0.5 rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          )}
        </div>

        {safeRegisteredVehicles.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px] font-mono no-scrollbar">
            <span className="text-slate-500 uppercase font-bold shrink-0">Veículo:</span>
            <button
              type="button"
              onClick={() => setVehicleFilter('TODOS')}
              className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 uppercase font-bold ${
                vehicleFilter === 'TODOS'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-950 text-slate-400 border border-slate-900 hover:text-slate-200'
              }`}
            >
              Todos
            </button>
            {safeRegisteredVehicles.filter(Boolean).map((v) => {
              const vDesc = v.descricao || v.modelo || v.placa || 'VEÍCULO';
              return (
                <button
                  key={v.id || vDesc}
                  type="button"
                  onClick={() => setVehicleFilter(vDesc)}
                  className={`px-2.5 py-1 rounded-lg transition-colors shrink-0 uppercase font-bold ${
                    String(vehicleFilter || '').toUpperCase() === String(vDesc).toUpperCase()
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-950 text-slate-400 border border-slate-900 hover:text-slate-200'
                  }`}
                >
                  {vDesc}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex bg-slate-950 border border-slate-900 rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('REALIZADOS')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'REALIZADOS' ? 'bg-slate-900 text-emerald-400 border border-slate-800' : 'text-slate-450 hover:text-slate-250'
          }`}
        >
          <span className="material-symbols-outlined text-sm">history</span>
          Serviços Realizados ({filteredPerformed.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('AGENDADOS')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeSubTab === 'AGENDADOS' ? 'bg-slate-900 text-amber-400 border border-slate-800' : 'text-slate-450 hover:text-slate-250'
          }`}
        >
          <span className="material-symbols-outlined text-sm">pending_actions</span>
          Cronograma ({filteredScheduled.length})
        </button>
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {activeSubTab === 'REALIZADOS' ? (
          filteredPerformed.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-900 p-8 rounded-2xl text-center space-y-2">
              <span className="material-symbols-outlined text-slate-600 text-3xl">history_toggle_off</span>
              <p className="text-xs text-slate-400 italic">
                {searchQuery ? 'Nenhum serviço atende ao filtro de busca.' : 'Nenhum serviço realizado encontrado.'}
              </p>
            </div>
          ) : (
            filteredPerformed.map((serv, index) => {
              const desc = serv.descricao || (serv as any)['Descrição do Serviço'] || (serv as any)['Descrição'] || 'Serviço sem descrição';
              const veiculo = serv.veiculoDescricao || (serv as any)['Veículo'] || 'FOX ROCK RIO 1.6';
              const rawData = serv.data || (serv as any)['Data Realização'] || (serv as any)['Data'] || '';
              const dataFmt = rawData ? (rawData.includes('T') ? rawData.split('T')[0].split('-').reverse().join('/') : rawData) : 'S/ Data';
              const rawVal = (serv as any)['Valor Pago (R$)'] ?? (serv as any)['Valor (R$)'] ?? serv.valor ?? 0;
              const valNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.')) || 0;
              const oficina = serv.oficina || (serv as any)['Oficina/Estabelecimento'] || (serv as any)['Oficina'] || '';
              const km = serv.km ?? (serv as any)['Quilometragem (KM)'] ?? (serv as any)['KM'] ?? undefined;
              const obs = serv.observacoes || (serv as any)['Observações'] || '';

              return (
                <div key={serv.id || index} className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-2.5 hover:border-slate-800 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">{desc}</h4>
                      <div className="flex items-center gap-2 text-[9.5px] font-mono text-slate-400 mt-1">
                        <span className="text-emerald-400 font-semibold">🚗 {veiculo}</span>
                        <span>•</span>
                        <span>{dataFmt}</span>
                        {km && (
                          <>
                            <span>•</span>
                            <span>{Number(km).toLocaleString('pt-BR')} KM</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {valNum > 0 ? `R$ ${valNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'Grátis'}
                      </span>
                      <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPerformed(serv)}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Editar Serviço"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePerformed(serv)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Serviço"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {oficina && (
                    <p className="text-[9px] text-slate-500 font-mono">🏪 {oficina}</p>
                  )}

                  {obs && (
                    <p className="text-[9.5px] text-slate-400 bg-slate-900/60 p-2 rounded-xl italic font-sans">{obs}</p>
                  )}
                </div>
              );
            })
          )
        ) : (
          filteredScheduled.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-900 p-8 rounded-2xl text-center space-y-2">
              <span className="material-symbols-outlined text-slate-600 text-3xl">calendar_today</span>
              <p className="text-xs text-slate-400 italic">
                {searchQuery ? 'Nenhum agendamento atende ao filtro de busca.' : 'Nenhum agendamento pendente.'}
              </p>
            </div>
          ) : (
            filteredScheduled.map((sched, index) => {
              const desc = sched.descricao || (sched as any)['Descrição do Serviço'] || 'Agendamento sem descrição';
              const veiculo = sched.veiculoDescricao || (sched as any)['Veículo'] || 'FOX ROCK RIO 1.6';
              const alvo = sched.dataAlvo || sched.kmAlvo ? `Alvo: ${sched.dataAlvo || ''} ${sched.kmAlvo ? `${sched.kmAlvo} KM` : ''}` : 'Aguardando data/km';

              return (
                <div key={sched.id || index} className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex justify-between items-center gap-2 hover:border-slate-800 transition-all">
                  <div>
                    <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">{desc}</h4>
                    <p className="text-[10px] text-amber-400 font-mono mt-1">🚗 {veiculo} • {alvo}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (sched.id) {
                          await onEditScheduledService(sched.id, { status: 'REALIZADO' });
                          showAlert("Concluído! 🎉", "Serviço marcado como realizado.");
                        }
                      }}
                      className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] rounded-xl cursor-pointer uppercase transition-colors"
                    >
                      Realizado
                    </button>
                    <div className="flex items-center gap-1 border-l border-slate-800 pl-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditScheduled(sched)}
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="Editar Agendamento"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteScheduled(sched)}
                        className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Agendamento"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Modal Completo: Novo / Editar Serviço Realizado */}
      <AnimatePresence>
        {isPerformedModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsPerformedModalOpen(false)} />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 z-10 max-h-[90vh] overflow-y-auto font-sans">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingPerformed ? 'Editar Serviço Realizado' : 'Novo Serviço Realizado'}
              </h4>
              <div className="space-y-3 text-left">
                
                {/* Veículo */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Veículo</label>
                  {safeRegisteredVehicles.length > 0 ? (
                    <select
                      value={perfVehicle}
                      onChange={(e) => setPerfVehicle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono uppercase"
                    >
                      {safeRegisteredVehicles.filter(Boolean).map((v) => {
                        const val = v.descricao || v.modelo || v.placa || 'VEÍCULO';
                        return (
                          <option key={v.id || val} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={perfVehicle}
                      onChange={(e) => setPerfVehicle(e.target.value)}
                      placeholder="Ex: FOX ROCK RIO 1.6"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono uppercase"
                    />
                  )}
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Descrição do Serviço</label>
                  <input
                    type="text"
                    value={perfDescription}
                    onChange={(e) => setPerfDescription(e.target.value)}
                    placeholder="Ex: Troca de Óleo e Filtro"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Data & KM */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Data Realização</label>
                    <input
                      type="date"
                      value={perfDate}
                      onChange={(e) => setPerfDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Quilometragem (KM)</label>
                    <input
                      type="number"
                      value={perfKm}
                      onChange={(e) => setPerfKm(e.target.value)}
                      placeholder="Ex: 85000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Valor Pago & Oficina */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Valor Pago (R$)</label>
                    <input
                      type="text"
                      value={perfValor}
                      onChange={(e) => setPerfValor(e.target.value)}
                      placeholder="Ex: 250,00"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Oficina / Estabelecimento</label>
                    <input
                      type="text"
                      value={perfOficina}
                      onChange={(e) => setPerfOficina(e.target.value)}
                      placeholder="Ex: Auto Center Gaeta"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Observações</label>
                  <textarea
                    rows={2}
                    value={perfObservacoes}
                    onChange={(e) => setPerfObservacoes(e.target.value)}
                    placeholder="Ex: Óleo Shell Helix 10w40 e filtro Bosch."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-sans"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsPerformedModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl uppercase">Cancelar</button>
                  <button type="button" onClick={handleSavePerformed} className="flex-1 py-2.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl uppercase">
                    {editingPerformed ? 'Atualizar' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Completo: Novo / Editar Agendamento */}
      <AnimatePresence>
        {isScheduledModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsScheduledModalOpen(false)} />
            <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4 z-10 font-sans">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                {editingScheduled ? 'Editar Agendamento' : 'Agendar Serviço'}
              </h4>
              <div className="space-y-3 text-left">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Veículo</label>
                  {safeRegisteredVehicles.length > 0 ? (
                    <select
                      value={schedVehicle}
                      onChange={(e) => setSchedVehicle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono uppercase"
                    >
                      {safeRegisteredVehicles.filter(Boolean).map((v) => {
                        const val = v.descricao || v.modelo || v.placa || 'VEÍCULO';
                        return (
                          <option key={v.id || val} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={schedVehicle}
                      onChange={(e) => setSchedVehicle(e.target.value)}
                      placeholder="Ex: FOX ROCK RIO 1.6"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono uppercase"
                    />
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Descrição do Serviço</label>
                  <input
                    type="text"
                    value={schedDescription}
                    onChange={(e) => setSchedDescription(e.target.value)}
                    placeholder="Ex: Troca de Pastilhas"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Data Alvo</label>
                    <input
                      type="date"
                      value={schedDateAlvo}
                      onChange={(e) => setSchedDateAlvo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">KM Alvo</label>
                    <input
                      type="number"
                      value={schedKmAlvo}
                      onChange={(e) => setSchedKmAlvo(e.target.value)}
                      placeholder="Ex: 90000"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setIsScheduledModalOpen(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl uppercase">Cancelar</button>
                  <button type="button" onClick={handleSaveScheduled} className="flex-1 py-2.5 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl uppercase">
                    {editingScheduled ? 'Atualizar' : 'Agendar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
