import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CarServicePerformed, CarServiceScheduled, RegisteredVehicle, BankAccount, Transaction } from '../types';
import { useVehicles } from '../modules/veiculos/hooks/useVehicles';
import { vehicleService } from '../modules/veiculos/services/vehicleService';

interface CarServicesTabProps {
  performedServices: CarServicePerformed[];
  scheduledServices: CarServiceScheduled[];
  registeredVehicles?: RegisteredVehicle[];
  vehicles?: RegisteredVehicle[];
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

// Formata string numérica ou valor para exibição de moeda BRL em tempo real (ex: "25000" -> "250,00")
const formatBRLCurrencyInput = (val: string | number): string => {
  if (val === undefined || val === null || val === '') return '0,00';
  const raw = String(val).replace(/\D/g, "");
  if (!raw) return '0,00';
  const numeric = parseInt(raw, 10) / 100;
  return numeric.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Formata valor bruto vindo do objeto de dados/DB (ex: 250 -> "250,00")
const formatValueForInput = (val: any): string => {
  if (val === undefined || val === null || val === '') return '0,00';
  let num = 0;
  if (typeof val === 'number') {
    num = val;
  } else {
    const clean = String(val).replace(/\./g, '').replace(',', '.');
    num = parseFloat(clean) || 0;
  }
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Converte string formatada ("250,00" ou "1.250,50") para Number JS (250 ou 1250.50)
const parseBRLCurrencyToNumber = (valStr: string | number): number => {
  if (typeof valStr === 'number') return isNaN(valStr) ? 0 : valStr;
  if (!valStr) return 0;
  const raw = String(valStr).replace(/\D/g, "");
  if (!raw) return 0;
  return parseInt(raw, 10) / 100;
};

export default function CarServicesTab({
  performedServices,
  scheduledServices,
  registeredVehicles,
  vehicles,
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
  // Consumir hook global de veículos
  const { vehicles: hookVehicles, loading: hookLoading } = useVehicles();

  // Estados locais para carregamento assíncrono e tratamento de erros
  const [asyncVehicles, setAsyncVehicles] = useState<RegisteredVehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState<boolean>(true);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  // Carregamento assíncrono robusto com try/catch
  const loadVehiclesAsync = useCallback(async () => {
    setIsLoadingVehicles(true);
    setVehiclesError(null);
    try {
      // 1. Prioriza veículos passados por props se existirem
      if (Array.isArray(registeredVehicles) && registeredVehicles.length > 0) {
        setAsyncVehicles(registeredVehicles);
        setIsLoadingVehicles(false);
        return;
      }
      if (Array.isArray(vehicles) && vehicles.length > 0) {
        setAsyncVehicles(vehicles);
        setIsLoadingVehicles(false);
        return;
      }

      // 2. Tenta buscar via vehicleService
      const serviceData = await vehicleService.listarVeiculos();
      if (Array.isArray(serviceData) && serviceData.length > 0) {
        setAsyncVehicles(serviceData);
      } else if (Array.isArray(hookVehicles) && hookVehicles.length > 0) {
        setAsyncVehicles(hookVehicles);
      } else {
        // 3. Fallback no localStorage
        const stored = localStorage.getItem('wealthflow_registered_vehicles') || localStorage.getItem('registered_vehicles');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAsyncVehicles(parsed);
          } else {
            setAsyncVehicles([]);
          }
        } else {
          setAsyncVehicles([]);
        }
      }
    } catch (err: any) {
      console.error('Erro ao carregar lista de veículos:', err);
      setVehiclesError('Não foi possível carregar a lista de veículos.');

      // Tenta recuperar do localStorage em caso de erro na API/DB
      try {
        const stored = localStorage.getItem('wealthflow_registered_vehicles') || localStorage.getItem('registered_vehicles');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAsyncVehicles(parsed);
            setVehiclesError(null); // Recuperado com sucesso
          }
        }
      } catch (e) {
        // ignorar erro secundário
      }
    } finally {
      setIsLoadingVehicles(false);
    }
  }, [registeredVehicles, vehicles, hookVehicles]);

  useEffect(() => {
    loadVehiclesAsync();
  }, [loadVehiclesAsync]);

  // Consolidar a lista de veículos final garantindo segurança de arrays
  const safeRegisteredVehicles = useMemo(() => {
    let list: any[] = [];
    if (asyncVehicles.length > 0) {
      list = asyncVehicles;
    } else if (Array.isArray(registeredVehicles) && registeredVehicles.length > 0) {
      list = registeredVehicles;
    } else if (Array.isArray(vehicles) && vehicles.length > 0) {
      list = vehicles;
    } else if (Array.isArray(hookVehicles) && hookVehicles.length > 0) {
      list = hookVehicles;
    } else {
      try {
        const stored = localStorage.getItem('wealthflow_registered_vehicles') || localStorage.getItem('registered_vehicles');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) list = parsed;
        }
      } catch (e) {
        // ignore
      }
    }
    return list.filter(Boolean);
  }, [asyncVehicles, registeredVehicles, vehicles, hookVehicles]);

  // Lista de exibição garantida com fallback "FOX ROCK RIO 1.6"
  const displayVehicles = useMemo(() => {
    if (safeRegisteredVehicles && safeRegisteredVehicles.length > 0) {
      return safeRegisteredVehicles;
    }
    return [{ id: 'FOX ROCK RIO 1.6', nome: 'FOX ROCK RIO 1.6', modelo: 'FOX ROCK RIO 1.6', placa: 'FOX ROCK RIO 1.6', descricao: 'FOX ROCK RIO 1.6' }];
  }, [safeRegisteredVehicles]);

  // Safe Array Fallbacks
  const safePerformedServices = Array.isArray(performedServices) ? performedServices.filter(Boolean) : [];
  const safeScheduledServices = Array.isArray(scheduledServices) ? scheduledServices.filter(Boolean) : [];

  const [activeSubTab, setActiveSubTab] = useState<'REALIZADOS' | 'AGENDADOS'>('REALIZADOS');
  const [vehicleFilter, setVehicleFilter] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modais
  const [isPerformedModalOpen, setIsPerformedModalOpen] = useState(false);
  const [editingPerformed, setEditingPerformed] = useState<CarServicePerformed | null>(null);
  
  // 10 Colunas de Oficina (Aba 14_Oficina):
  // A: ID | B: Data | C: Descrição | D: KM | E: Valor_A_PG | F: Valor_Pago | G: Oficina_Nome | H: Comprovante_Url | I: Observações | J: VeiculoID

  const [perfVehicle, setPerfVehicle] = useState('');
  const [perfDescription, setPerfDescription] = useState('');
  const [perfDate, setPerfDate] = useState(new Date().toISOString().split('T')[0]);
  const [perfKm, setPerfKm] = useState('');
  const [perfValorAPG, setPerfValorAPG] = useState('');
  const [perfValorPago, setPerfValorPago] = useState('');
  const [perfOficina, setPerfOficina] = useState('');
  const [perfComprovanteUrl, setPerfComprovanteUrl] = useState('');
  const [perfObservacoes, setPerfObservacoes] = useState('');

  const [isScheduledModalOpen, setIsScheduledModalOpen] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState<CarServiceScheduled | null>(null);
  const [schedVehicle, setSchedVehicle] = useState('');
  const [schedDescription, setSchedDescription] = useState('');
  const [schedType, setSchedType] = useState<'DATA' | 'KM' | 'DATA_E_KM'>('DATA');
  const [schedDateAlvo, setSchedDateAlvo] = useState('');
  const [schedKmAlvo, setSchedKmAlvo] = useState('');

  // Seleção Padrão / Auto-seleção: Ao carregar ou abrir o modal, se nenhum estiver selecionado, seleciona o primeiro por padrão
  useEffect(() => {
    if (displayVehicles.length > 0) {
      const firstVeh = displayVehicles[0];
      const defaultVal = firstVeh.id || firstVeh.descricao || (firstVeh as any).nome || firstVeh.modelo || firstVeh.placa || 'FOX ROCK RIO 1.6';
      if (!perfVehicle) {
        setPerfVehicle(defaultVal);
      }
      if (!schedVehicle) {
        setSchedVehicle(defaultVal);
      }
    }
  }, [displayVehicles]);

  const handleOpenAddPerformed = () => {
    setEditingPerformed(null);
    const firstVeh = displayVehicles[0];
    const defaultVal = firstVeh ? String(firstVeh.id) : '';
    setPerfVehicle(defaultVal);
    const defaultDesc = firstVeh ? (firstVeh.descricao || (firstVeh as any).nome || firstVeh.modelo || '') : '';
    setPerfDescription(defaultDesc);
    setPerfDate(new Date().toISOString().split('T')[0]);
    setPerfKm('');
    setPerfValorAPG('0,00');
    setPerfValorPago('0,00');
    setPerfOficina('');
    setPerfComprovanteUrl('');
    setPerfObservacoes('');
    setIsPerformedModalOpen(true);
  };

  const handleOpenEditPerformed = (serv: CarServicePerformed) => {
    setEditingPerformed(serv);
    const rawVeh = serv.veiculoId || serv.veiculoDescricao || (serv as any)['VeiculoID'] || (serv as any)['Veículo'] || '';
    const matchedVeh = displayVehicles.find(v =>
      (v.id && String(v.id).toUpperCase() === String(rawVeh).toUpperCase()) ||
      (v.descricao && String(v.descricao).toUpperCase() === String(rawVeh).toUpperCase()) ||
      ((v as any).nome && String((v as any).nome).toUpperCase() === String(rawVeh).toUpperCase()) ||
      (v.modelo && String(v.modelo).toUpperCase() === String(rawVeh).toUpperCase())
    );
    const selectedVeh = matchedVeh ? String(matchedVeh.id) : (rawVeh || String(displayVehicles[0]?.id || ''));
    setPerfVehicle(selectedVeh);
    setPerfDescription(serv.descricao || (serv as any)['Descrição'] || (serv as any)['Descrição do Serviço'] || '');
    
    const rawDate = serv.data || (serv as any)['Data'] || (serv as any)['Data Realização'] || '';
    let dateForInput = new Date().toISOString().split('T')[0];
    if (rawDate.includes('/')) {
      const parts = rawDate.split('/');
      if (parts.length === 3) dateForInput = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    } else if (rawDate.includes('T')) {
      dateForInput = rawDate.split('T')[0];
    } else if (rawDate.includes('-')) {
      dateForInput = rawDate;
    }
    setPerfDate(dateForInput);

    const rawKm = serv.km ?? (serv as any)['KM'] ?? (serv as any)['Quilometragem (KM)'];
    setPerfKm(rawKm !== undefined && rawKm !== null ? String(rawKm) : '');

    const rawValAPG = serv.valorAPG ?? (serv as any)['Valor_A_PG'] ?? (serv as any)['Valor A Pagar'] ?? 0;
    setPerfValorAPG(formatValueForInput(rawValAPG));

    const rawValPago = serv.valorPago ?? serv.valor ?? (serv as any)['Valor_Pago'] ?? (serv as any)['Valor Pago (R$)'] ?? 0;
    setPerfValorPago(formatValueForInput(rawValPago));

    setPerfOficina(serv.oficinaNome || serv.oficina || (serv as any)['Oficina_Nome'] || (serv as any)['Oficina/Estabelecimento'] || '');
    setPerfComprovanteUrl(serv.comprovanteUrl || (serv as any)['Comprovante_Url'] || '');
    setPerfObservacoes(serv.observacoes || serv.obs || (serv as any)['Observações'] || '');
    setIsPerformedModalOpen(true);
  };

  const handleDeletePerformed = (serv: CarServicePerformed) => {
    const desc = serv.descricao || (serv as any)['Descrição do Serviço'] || (serv as any)['Descrição'] || 'este registro';
    showConfirm(
      "Excluir Registro da Oficina 🗑️",
      `Deseja realmente excluir "${desc}" da oficina?`,
      async () => {
        try {
          await onDeletePerformedService(serv.id);
          showAlert("Sucesso 🎉", "Registro excluído da oficina!");
        } catch (e) {
          console.error(e);
          showAlert("Erro ❌", "Não foi possível excluir o registro.");
        }
      }
    );
  };

  const handleOpenAddScheduled = () => {
    setEditingScheduled(null);
    const firstVeh = displayVehicles[0];
    const defaultVal = firstVeh
      ? (firstVeh.id || firstVeh.descricao || (firstVeh as any).nome || firstVeh.modelo || firstVeh.placa || 'FOX ROCK RIO 1.6')
      : 'FOX ROCK RIO 1.6';
    setSchedVehicle(schedVehicle || defaultVal);
    setSchedDescription('');
    setSchedType('DATA');
    setSchedDateAlvo('');
    setSchedKmAlvo('');
    setIsScheduledModalOpen(true);
  };

  const handleOpenEditScheduled = (sched: CarServiceScheduled) => {
    setEditingScheduled(sched);
    const rawVeh = sched.veiculoDescricao || (sched as any)['Veículo'] || '';
    const matchedVeh = safeRegisteredVehicles.find(v =>
      (v.id && String(v.id).toUpperCase() === String(rawVeh).toUpperCase()) ||
      (v.descricao && String(v.descricao).toUpperCase() === String(rawVeh).toUpperCase()) ||
      ((v as any).nome && String((v as any).nome).toUpperCase() === String(rawVeh).toUpperCase()) ||
      (v.modelo && String(v.modelo).toUpperCase() === String(rawVeh).toUpperCase())
    );
    const selectedVeh = matchedVeh ? (matchedVeh.id || matchedVeh.descricao) : (rawVeh || safeRegisteredVehicles[0]?.id || safeRegisteredVehicles[0]?.descricao || '');
    setSchedVehicle(selectedVeh);
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

    const numValorAPG = parseBRLCurrencyToNumber(perfValorAPG);
    const numValorPago = parseBRLCurrencyToNumber(perfValorPago);

    const parsedKm = perfKm.trim() ? (isNaN(Number(perfKm)) ? perfKm.trim() : parseInt(perfKm, 10)) : "";

    let dateDDMMYYYY = perfDate;
    if (perfDate.includes('-')) {
      const parts = perfDate.split('-');
      if (parts.length === 3) dateDDMMYYYY = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const itemId = editingPerformed ? editingPerformed.id : Date.now().toString();
    const selectedVehicleObj = displayVehicles.find(v =>
      String(v.id) === String(perfVehicle) ||
      String(v.descricao).toUpperCase() === String(perfVehicle).toUpperCase() ||
      String((v as any).nome).toUpperCase() === String(perfVehicle).toUpperCase()
    );
    const veiculoIdVal = selectedVehicleObj && selectedVehicleObj.id !== undefined && selectedVehicleObj.id !== null
      ? String(selectedVehicleObj.id)
      : (perfVehicle || String(displayVehicles[0]?.id || '1'));
    const veiculoDescVal = selectedVehicleObj
      ? (selectedVehicleObj.descricao || (selectedVehicleObj as any).nome || selectedVehicleObj.modelo || '')
      : perfVehicle;

    // Objeto base da Oficina com as 10 propriedades exatas para a aba 14_Oficina:
    const workshopData = {
      id: itemId,
      data: dateDDMMYYYY,
      descricao: perfDescription.trim(),
      km: parsedKm,
      valorAPG: Number(numValorAPG),
      valorPago: Number(numValorPago),
      oficinaNome: perfOficina.trim(),
      comprovanteUrl: perfComprovanteUrl.trim() || '',
      observacoes: perfObservacoes.trim() || '',
      veiculoId: veiculoIdVal
    };

    const payload: any = {
      ...workshopData,
      // Aliases e compatibilidade legada:
      "VeiculoID": veiculoIdVal,
      "Veículo": veiculoDescVal || veiculoIdVal,
      "Descrição": perfDescription.trim(),
      "Descrição do Serviço": perfDescription.trim(),
      "Data": dateDDMMYYYY,
      "Data Realização": perfDate,
      "KM": parsedKm,
      "Quilometragem (KM)": parsedKm,
      "Valor_A_PG": Number(numValorAPG),
      "Valor_Pago": Number(numValorPago),
      "Valor Pago (R$)": Number(numValorPago),
      "valor": Number(numValorPago),
      "Oficina_Nome": perfOficina.trim(),
      "Oficina/Estabelecimento": perfOficina.trim(),
      "oficina": perfOficina.trim(),
      "Comprovante_Url": perfComprovanteUrl.trim(),
      "Observações": perfObservacoes.trim(),
      "obs": perfObservacoes.trim(),
      "veiculoDescricao": veiculoDescVal || veiculoIdVal,
      updatedAt: Date.now()
    };

    try {
      if (editingPerformed) {
        await onEditPerformedService(editingPerformed.id, payload);
        showAlert("Sucesso 🎉", "Registro de oficina atualizado!");
      } else {
        await onAddPerformedService(payload);
        showAlert("Sucesso 🎉", "Registro salvo na oficina!");
      }
      setIsPerformedModalOpen(false);
    } catch (e) {
      console.error(e);
      showAlert("Erro", "Não foi possível salvar os dados da oficina.");
    }
  };

  const handleSaveScheduled = async () => {
    if (!schedDescription.trim()) {
      showAlert("Aviso ⚠️", "Por favor, informe a descrição do agendamento.");
      return;
    }

    try {
      const selectedVehicleObj = safeRegisteredVehicles.find(v =>
        v.id === schedVehicle ||
        v.descricao === schedVehicle ||
        (v as any).nome === schedVehicle
      );
      const veiculoIdVal = (
        selectedVehicleObj
          ? (selectedVehicleObj.descricao || selectedVehicleObj.id || schedVehicle)
          : (schedVehicle || safeRegisteredVehicles[0]?.descricao || safeRegisteredVehicles[0]?.id || '')
      ).toUpperCase();

      const payload = {
        "Veículo": veiculoIdVal,
        "Descrição do Serviço": schedDescription.trim(),
        "Data Alvo": schedType !== 'KM' ? schedDateAlvo : "",
        "KM Alvo": schedType !== 'DATA' ? (schedKmAlvo ? parseInt(schedKmAlvo, 10) : "") : "",
        "Tipo Agendamento": schedType,
        "Status": 'PENDENTE',

        veiculoDescricao: veiculoIdVal,
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
        const sVehDesc = (s.veiculoId || s.veiculoDescricao || (s as any)['VeiculoID'] || (s as any)['Veículo'] || '').toString().toUpperCase();
        const vfUpper = (vehicleFilter || 'TODOS').toString().toUpperCase();
        const matchesVehicle = vfUpper === 'TODOS' || sVehDesc === vfUpper || (sVehDesc && sVehDesc.includes(vfUpper)) || (vfUpper && vfUpper.includes(sVehDesc));

        const rawQ = (searchQuery || '').toString().toLowerCase().trim();
        if (!rawQ) return matchesVehicle;

        const sDesc = (s.descricao || (s as any)['Descrição'] || (s as any)['Descrição do Serviço'] || '').toString().toLowerCase();
        const sOficina = (s.oficinaNome || s.oficina || (s as any)['Oficina_Nome'] || (s as any)['Oficina/Estabelecimento'] || '').toString().toLowerCase();
        const sObs = (s.observacoes || s.obs || (s as any)['Observações'] || '').toString().toLowerCase();
        const sVeh = sVehDesc.toLowerCase();
        const sKm = (s.km ?? (s as any)['KM'] ?? (s as any)['Quilometragem (KM)'] ?? '').toString().toLowerCase();
        const sData = (s.data || (s as any)['Data'] || (s as any)['Data Realização'] || '').toString().toLowerCase();
        const sId = (s.id || '').toString().toLowerCase();
        const sValAPG = (s.valorAPG ?? (s as any)['Valor_A_PG'] ?? '').toString().toLowerCase();
        const sValPago = (s.valorPago ?? s.valor ?? (s as any)['Valor_Pago'] ?? '').toString().toLowerCase();

        const qWords = rawQ.split(/\s+/).filter(Boolean);
        const combinedText = `${sDesc} ${sOficina} ${sObs} ${sVeh} ${sKm} ${sData} ${sId} ${sValAPG} ${sValPago}`;

        const matchesSearch = qWords.every(word => combinedText.includes(word));
        return matchesVehicle && matchesSearch;
      });
  }, [safePerformedServices, vehicleFilter, searchQuery]);

  const filteredScheduled = useMemo(() => {
    return safeScheduledServices
      .filter(s => {
        if (!s) return false;
        const sVehDesc = (s.veiculoDescricao || (s as any)['Veículo'] || '').toString().toUpperCase();
        const vfUpper = (vehicleFilter || 'TODOS').toString().toUpperCase();
        const matchesVehicle = vfUpper === 'TODOS' || sVehDesc === vfUpper || (sVehDesc && sVehDesc.includes(vfUpper)) || (vfUpper && vfUpper.includes(sVehDesc));

        const rawQ = (searchQuery || '').toString().toLowerCase().trim();
        if (!rawQ) return matchesVehicle && s.status !== 'REALIZADO';

        const sDesc = (s.descricao || (s as any)['Descrição do Serviço'] || (s as any)['Descrição'] || '').toString().toLowerCase();
        const sObs = ((s as any).observacoes || (s as any)['Observações'] || '').toString().toLowerCase();
        const sVeh = sVehDesc.toLowerCase();
        const sAlvo = (s.dataAlvo || s.kmAlvo || '').toString().toLowerCase();

        const qWords = rawQ.split(/\s+/).filter(Boolean);
        const combinedText = `${sDesc} ${sObs} ${sVeh} ${sAlvo}`;

        const matchesSearch = qWords.every(word => combinedText.includes(word));
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
                    (vehicleFilter || '').toString().toUpperCase() === (vDesc || '').toString().toUpperCase()
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
              const veiculo = serv.veiculoId || serv.veiculoDescricao || (serv as any)['VeiculoID'] || (serv as any)['Veículo'] || 'FOX ROCK RIO 1.6';
              const rawData = serv.data || (serv as any)['Data Realização'] || (serv as any)['Data'] || '';
              const dataFmt = rawData ? (rawData.includes('T') ? rawData.split('T')[0].split('-').reverse().join('/') : rawData) : 'S/ Data';

              const valAPG = serv.valorAPG ?? (serv as any)['Valor_A_PG'] ?? (serv as any)['Valor A Pagar'] ?? 0;
              const valPago = serv.valorPago ?? serv.valor ?? (serv as any)['Valor_Pago'] ?? (serv as any)['Valor Pago (R$)'] ?? 0;

              const valAPGNum = typeof valAPG === 'number' ? valAPG : parseFloat(String(valAPG).replace(/\./g, '').replace(',', '.')) || 0;
              const valPagoNum = typeof valPago === 'number' ? valPago : parseFloat(String(valPago).replace(/\./g, '').replace(',', '.')) || 0;

              const oficina = serv.oficinaNome || serv.oficina || (serv as any)['Oficina_Nome'] || (serv as any)['Oficina/Estabelecimento'] || '';
              const km = serv.km ?? (serv as any)['Quilometragem (KM)'] ?? (serv as any)['KM'] ?? undefined;
              const comprovante = serv.comprovanteUrl || (serv as any)['Comprovante_Url'] || '';
              const obs = serv.observacoes || serv.obs || (serv as any)['Observações'] || '';

              return (
                <div key={serv.id || index} className="bg-slate-950 border border-slate-900 p-4 rounded-2xl flex flex-col justify-between gap-2.5 hover:border-slate-800 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-slate-100 uppercase tracking-tight">{desc}</h4>
                        {serv.id && (
                          <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                            ID: {serv.id}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[9.5px] font-mono text-slate-400 mt-1 flex-wrap">
                        <span className="text-emerald-400 font-semibold">🚗 {veiculo}</span>
                        <span>•</span>
                        <span>📅 {dataFmt}</span>
                        {km !== undefined && km !== null && km !== '' && (
                          <>
                            <span>•</span>
                            <span>⚡ {Number(km).toLocaleString('pt-BR')} KM</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-right font-mono">
                        <div className="text-[10px] text-slate-400">
                          A Pagar: <span className="text-amber-400 font-bold">R$ {valAPGNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Pago: <span className="text-emerald-400 font-bold">R$ {valPagoNum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPerformed(serv)}
                          className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Editar Registro da Oficina"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePerformed(serv)}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Excluir Registro da Oficina"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-[9.5px] font-mono text-slate-400 flex-wrap">
                    {oficina && (
                      <span className="bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                        🏪 Oficina: {oficina}
                      </span>
                    )}
                    {comprovante && (
                      <a
                        href={comprovante.startsWith('http') ? comprovante : `https://${comprovante}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-emerald-500/10 text-emerald-400 hover:underline px-2 py-0.5 rounded-lg border border-emerald-500/20 flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-xs">link</span>
                        Ver Comprovante
                      </a>
                    )}
                  </div>

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
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-400 uppercase font-mono block">Veículo</label>
                    {isLoadingVehicles && (
                      <span className="text-[9px] text-amber-400 font-mono animate-pulse">Carregando...</span>
                    )}
                    {vehiclesError && !isLoadingVehicles && safeRegisteredVehicles.length === 0 && (
                      <button
                        type="button"
                        onClick={() => loadVehiclesAsync()}
                        className="text-[9px] text-rose-400 hover:underline font-mono uppercase cursor-pointer"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                  <select
                    value={perfVehicle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPerfVehicle(val);
                      const selected = displayVehicles.find(v => String(v.id) === String(val) || String(v.descricao).toUpperCase() === String(val).toUpperCase());
                      if (selected) {
                        const autoDesc = selected.descricao || (selected as any).nome || selected.modelo || '';
                        if (autoDesc) setPerfDescription(autoDesc);
                      }
                    }}
                    disabled={isLoadingVehicles && displayVehicles.length === 0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono uppercase disabled:opacity-50"
                  >
                    <option value="">Selecione um Veículo...</option>
                    {displayVehicles && displayVehicles.length > 0 ? (
                      displayVehicles.filter(Boolean).map((v, idx) => {
                        const val = String(v.id !== undefined && v.id !== null ? v.id : (v.descricao || idx));
                        const label = v.descricao || (v as any).nome || `${v.marca || ''} ${v.modelo || ''}`.trim() || `Veículo ${v.id || idx + 1}`;
                        return (
                          <option key={v.id || idx} value={val}>
                            {label} {v.placa ? `(${v.placa})` : ''}
                          </option>
                        );
                      })
                    ) : (
                      <option value="1">FOX ROCK RIO 1.6</option>
                    )}
                  </select>
                  {vehiclesError && safeRegisteredVehicles.length === 0 && (
                    <p className="text-[10px] text-rose-400 mt-1 font-mono">{vehiclesError}</p>
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

                {/* Valor A Pagar & Valor Pago (Moeda BRL em Tempo Real) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Valor a Pagar (R$)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-mono text-amber-500 font-bold">R$</span>
                      <input
                        type="text"
                        value={perfValorAPG}
                        onChange={(e) => setPerfValorAPG(formatBRLCurrencyInput(e.target.value))}
                        placeholder="0,00"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-8 pr-2 text-xs text-amber-400 outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">
                      Valor Pago (R$)
                    </label>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-mono text-emerald-500 font-bold">R$</span>
                      <input
                        type="text"
                        value={perfValorPago}
                        onChange={(e) => setPerfValorPago(formatBRLCurrencyInput(e.target.value))}
                        placeholder="0,00"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-8 pr-2 text-xs text-emerald-400 outline-none focus:border-emerald-500 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                {/* Oficina & Link Comprovante */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Nome da Oficina (Oficina_Nome)</label>
                    <input
                      type="text"
                      value={perfOficina}
                      onChange={(e) => setPerfOficina(e.target.value)}
                      placeholder="Ex: Auto Center Gaeta"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Link Comprovante (Comprovante_Url)</label>
                    <input
                      type="url"
                      value={perfComprovanteUrl}
                      onChange={(e) => setPerfComprovanteUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Observações (OBS)</label>
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
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] text-slate-400 uppercase font-mono block">Veículo</label>
                    {isLoadingVehicles && (
                      <span className="text-[9px] text-amber-400 font-mono animate-pulse">Carregando...</span>
                    )}
                    {vehiclesError && !isLoadingVehicles && safeRegisteredVehicles.length === 0 && (
                      <button
                        type="button"
                        onClick={() => loadVehiclesAsync()}
                        className="text-[9px] text-rose-400 hover:underline font-mono uppercase cursor-pointer"
                      >
                        Tentar Novamente
                      </button>
                    )}
                  </div>
                  <select
                    value={schedVehicle}
                    onChange={(e) => setSchedVehicle(e.target.value)}
                    disabled={isLoadingVehicles && safeRegisteredVehicles.length === 0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-amber-500 font-mono uppercase disabled:opacity-50"
                  >
                    <option value="">Selecione um Veículo...</option>
                    {safeRegisteredVehicles && safeRegisteredVehicles.length > 0 ? (
                      safeRegisteredVehicles.filter(Boolean).map((v, idx) => {
                        const val = v.id || v.descricao || (v as any).nome || v.modelo || v.placa || `veh_${idx}`;
                        const label = (v as any).nome || v.modelo || v.placa || v.descricao || `Veículo ${idx + 1}`;
                        return (
                          <option key={v.id || idx} value={val}>
                            {label}
                          </option>
                        );
                      })
                    ) : (
                      <option value="FOX ROCK RIO 1.6">FOX ROCK RIO 1.6</option>
                    )}
                  </select>
                  {vehiclesError && safeRegisteredVehicles.length === 0 && (
                    <p className="text-[10px] text-rose-400 mt-1 font-mono">{vehiclesError}</p>
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
