import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, RiskZone, Infraction, MedicalAppointment, MedicalPrescription, BankAccount, CreditCard, RegisteredVehicle, Compromisso, CarServicePerformed, CarServiceScheduled, SecurityConfig, GroceryItem, PendingChange } from './types';
import { initialTransactions, bankAccounts, creditCards } from './data/transactions';
import { initialRiskZones } from './data/riskZones';
import { initialInfractions, nonAppealedInfractions } from './data/infractions';

// Pages
import { 
  Abastecimento, 
  Dashboard as DashboardPage, 
  Financeiro, 
  Oficina, 
  Agenda, 
  ZonasDeRisco, 
  Consultas, 
  Receitas, 
  Despesas, 
  Perfil, 
  AssistenteIA, 
  Comprovantes, 
  ListaMercado, 
  Indicacoes, 
  Analise,
  Veiculos
} from './pages';

// Tab imports & Utilities
import { isNotificationPeriod } from './pages/Consultas';
import TransactionsTab from './modules/financeiro/components/TransactionsTab';
import ErrorBoundary from './components/ErrorBoundary';
import LockScreen from './components/LockScreen';
import { checkIpvaAlerts } from './lib/ipvaUtils';
import GoogleDriveModal from './components/GoogleDriveModal';

// Domain Custom Hooks
import { useTransactionsState, useBanksAndCardsState } from './modules/financeiro/hooks';
import { useVehiclesState } from './modules/veiculos/hooks';
import { useAgendaState } from './modules/agenda/hooks';
import { useRiskAndInfractionsState } from './modules/risco/hooks';
import { useGroceryState } from './modules/mercado/hooks';
import { useProfileSettingsState } from './modules/profile/hooks';
import { useGoogleSyncState } from './hooks/useGoogleSyncState';
import { cleanDuplicateTransactions } from './modules/financeiro/utils/transactionUtils';

// Database Sync API
import { 
  getTransactionsFromDb, 
  saveTransactionToDb, 
  deleteTransactionFromDb, 
  getRiskZonesFromDb, 
  saveRiskZoneToDb, 
  deleteRiskZoneFromDb, 
  getInfractionsFromDb, 
  saveInfractionToDb, 
  deleteInfractionFromDb,
  getNonAppealedFromDb, 
  deleteNonAppealedFromDb, 
  getAvatarUrlFromDb, 
  saveAvatarUrlToDb,
  getMedicalAppointmentsFromDb,
  saveMedicalAppointmentToDb,
  deleteMedicalAppointmentFromDb,
  getMedicalPrescriptionsFromDb,
  saveMedicalPrescriptionToDb,
  deleteMedicalPrescriptionFromDb,
  getRegisteredVehiclesFromDb,
  saveRegisteredVehicleToDb,
  deleteRegisteredVehicleFromDb,
  getSyncTimestampFromDb,
  saveSyncTimestampToDb,
  getCompromissosFromDb,
  saveCompromissoToDb,
  deleteCompromissoFromDb,
  getCustomCategoriesFromDb,
  saveCustomCategoriesToDb,
  getSecurityConfigFromDb,
  saveSecurityConfigToDb,
  getPerformedServicesFromDb,
  savePerformedServiceToDb,
  deletePerformedServiceFromDb,
  getScheduledServicesFromDb,
  saveScheduledServiceToDb,
  deleteScheduledServiceFromDb,
  getGroceryItemsFromDb,
  saveGroceryItemToDb,
  saveAllGroceryItemsToDb,
  deleteGroceryItemFromDb
} from './lib/localSync';

// Centralized Services (Sheets, Auth)
import { sheetsService } from './services/sheets';
import { authService } from './services/auth';

import { normalizeTransactionObject, DEFAULT_SPREADSHEET_ID, DEFAULT_SPREADSHEET_URL, DEFAULT_APPS_SCRIPT_URL } from './lib/googleAuth';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam) {
        if (tabParam === "lancamentos" || tabParam === "transactions" || tabParam === "transacoes") {
          return "transactions";
        }
        return tabParam;
      }
    }
    return 'analysis';
  });
  const [showAddTxForm, setShowAddTxForm] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("add") === "true";
    }
    return false;
  });
  const [isMaisMenuOpen, setIsMaisMenuOpen] = useState<boolean>(false);
  const [isDbLoaded, setIsDbLoaded] = useState<boolean>(false);

  // Synchronization locking references to prevent race conditions and loops
  const syncLockRef = React.useRef<boolean>(false);
  const lastSyncedTxRef = React.useRef<string>('');
  const syncPendingRef = React.useRef<boolean>(false);
  const lastWebhookTimeRef = React.useRef<number>(Date.now());
  const pendingSyncParamsRef = React.useRef<{
    tokenToUse?: string;
    isBackground?: boolean;
    overrideTxs?: Transaction[];
    overrideInfracs?: Infraction[];
    overrideZones?: RiskZone[];
    overrideAppts?: MedicalAppointment[];
    overridePrescs?: MedicalPrescription[];
    forceOverwriteSpreadsheet?: boolean;
    overrideCompromissos?: Compromisso[];
    overrideVehicles?: RegisteredVehicle[];
    overridePerfServices?: CarServicePerformed[];
    overrideSchedServices?: CarServiceScheduled[];
    overrideBanks?: BankAccount[];
    overrideCards?: CreditCard[];
    overrideGroceryItems?: GroceryItem[];
    origem?: string;
  } | null>(null);

  // Live state synchronized lists (backed by domain custom hooks)
  const { transactions, setTransactions } = useTransactionsState();
  const { riskZones, setRiskZones, infractions, setInfractions, nonAppealed, setNonAppealed } = useRiskAndInfractionsState();
  const { compromissos, setCompromissos, appointments, setAppointments, prescriptions, setPrescriptions } = useAgendaState();
  const { registeredVehicles, setRegisteredVehicles, performedServices, setPerformedServices, scheduledServices, setScheduledServices } = useVehiclesState();
  const { groceryItems, setGroceryItems } = useGroceryState();
  const { bankAccountsState, setBankAccountsState, creditCardsState, setCreditCardsState } = useBanksAndCardsState();

  const handleAddGroceryItem = async (itemData: Omit<GroceryItem, 'id'>) => {
    const newItem: GroceryItem = {
      ...itemData,
      id: `g_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      updatedAt: Date.now()
    };
    const updated = [newItem, ...groceryItems];
    setGroceryItems(updated);
    await saveGroceryItemToDb(newItem);

    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      await triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, updated);
    }
  };

  const handleEditGroceryItem = async (id: string, updatedFields: Partial<GroceryItem>) => {
    let updatedItem: GroceryItem | null = null;
    const updated = groceryItems.map(item => {
      if (item.id === id) {
        updatedItem = { ...item, ...updatedFields, updatedAt: Date.now() };
        return updatedItem;
      }
      return item;
    });
    setGroceryItems(updated);
    if (updatedItem) {
      await saveGroceryItemToDb(updatedItem);
    }

    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      await triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, updated);
    }
  };

  const handleDeleteGroceryItem = async (id: string) => {
    const updated = groceryItems.filter(item => item.id !== id);
    setGroceryItems(updated);
    await deleteGroceryItemFromDb(id);

    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      await triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, updated);
    }
  };

  const handleClearPurchasedItems = async () => {
    const remaining = groceryItems.filter(item => !item.comprado);
    setGroceryItems(remaining);
    await saveAllGroceryItemsToDb(remaining);

    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      await triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, remaining);
    }
  };
  const {
    avatarUrl, setAvatarUrl,
    customCategories, setCustomCategories,
    categoryBudgets, setCategoryBudgets,
    ipvaLeadDays, setIpvaLeadDays,
    ipvaClosingDay, setIpvaClosingDay,
    ipvaNotificationColor, setIpvaNotificationColor,
    dailyCheckInTime, setDailyCheckInTime,
    medicalAppointmentLeadDays, setMedicalAppointmentLeadDays,
    notifyIpva, setNotifyIpva,
    defaultVehicleId, setDefaultVehicleId,
    licensingReminderDay, setLicensingReminderDay,
    notifyLicensing, setNotifyLicensing,
    notifyBudget, setNotifyBudget,
    notifyAppointments, setNotifyAppointments,
    notifyCarServices, setNotifyCarServices,
    notifyMedical, setNotifyMedical,
    notifyRiskZones, setNotifyRiskZones,
    securityConfig, setSecurityConfig,
    isAppLocked, setIsAppLocked,
  } = useProfileSettingsState();
  const {
    googleUser, setGoogleUser,
    googleToken, setGoogleToken,
    isSyncing, setIsSyncing,
    isImporting, setIsImporting,
    spreadsheetUrl, setSpreadsheetUrl,
    syncError, setSyncError,
    lastSyncedTime, setLastSyncedTime,
    autoSync, setAutoSync,
    isGoogleDriveModalOpen, setIsGoogleDriveModalOpen,
    pendingChanges, setPendingChanges,
    isOnline, setIsOnline,
    showSyncQueueModal, setShowSyncQueueModal,
  } = useGoogleSyncState();

  const isDbLoadedRef = useRef<boolean>(false);
  useEffect(() => {
    isDbLoadedRef.current = isDbLoaded;
  }, [isDbLoaded]);

  // Load live data from Google Sheets SSOT & Cache on mount
  const loadDataFromSheets = async (showToast = false) => {
    try {
      // 1. Always load local IndexedDB data FIRST to ensure offline-first UI & selects (drivers, vehicles, categories, etc) are populated instantly
      const localTxs = await getTransactionsFromDb();
      if (Array.isArray(localTxs) && localTxs.length > 0) {
        setTransactions(cleanDuplicateTransactions(localTxs));
      }

      const vehicleList = await getRegisteredVehiclesFromDb();
      if (Array.isArray(vehicleList) && vehicleList.length > 0) {
        const safeVehs = vehicleList.filter(Boolean).map((v: any) => ({
          ...v,
          descricao: (v.descricao || v.modelo || v.nome || '').toString().toUpperCase(),
          placa: (v.placa || '').toString().toUpperCase(),
          motorista: (v.motorista || '').toString().toUpperCase(),
          marca: (v.marca || '').toString().toUpperCase(),
          modelo: (v.modelo || '').toString().toUpperCase()
        }));
        setRegisteredVehicles(safeVehs);
      }

      const zoneList = await getRiskZonesFromDb();
      if (Array.isArray(zoneList) && zoneList.length > 0) setRiskZones(zoneList);

      const infList = await getInfractionsFromDb();
      if (Array.isArray(infList) && infList.length > 0) setInfractions(infList);

      const nonAppList = await getNonAppealedFromDb();
      if (Array.isArray(nonAppList) && nonAppList.length > 0) setNonAppealed(nonAppList);

      const apptList = await getMedicalAppointmentsFromDb();
      if (Array.isArray(apptList) && apptList.length > 0) setAppointments(apptList);

      const prescriptionList = await getMedicalPrescriptionsFromDb();
      if (Array.isArray(prescriptionList) && prescriptionList.length > 0) setPrescriptions(prescriptionList);

      const compList = await getCompromissosFromDb();
      if (Array.isArray(compList) && compList.length > 0) setCompromissos(compList);

      const dbPerfList = await getPerformedServicesFromDb();
      if (Array.isArray(dbPerfList) && dbPerfList.length > 0) setPerformedServices(dbPerfList);

      const dbSchedList = await getScheduledServicesFromDb();
      if (Array.isArray(dbSchedList) && dbSchedList.length > 0) setScheduledServices(dbSchedList);

      const dbGrocList = await getGroceryItemsFromDb();
      if (Array.isArray(dbGrocList) && dbGrocList.length > 0) setGroceryItems(dbGrocList);

      const avatar = await getAvatarUrlFromDb();
      if (avatar) setAvatarUrl(avatar);

      const customCats = await getCustomCategoriesFromDb();
      if (Array.isArray(customCats) && customCats.length > 0) setCustomCategories(customCats);

      const secConfig = await getSecurityConfigFromDb();
      if (secConfig) {
        setSecurityConfig(secConfig);
        setIsAppLocked(!!secConfig.enabled);
      }

      // Mark local DB as ready so all dropdowns, selects, and local mutations proceed immediately
      setIsDbLoaded(true);
      isDbLoadedRef.current = true;

      // 2. Perform remote Google Sheets fetch using default or configured connection
      let loadedFromSheets = false;
      const activeToken = googleToken || DEFAULT_APPS_SCRIPT_URL;
      
      try {
        let sheetId = await sheetsService.obterOuCriarPlanilha(activeToken);
        if (!sheetId || sheetId === 'active_sheet' || sheetId.trim() === '') {
          sheetId = DEFAULT_SPREADSHEET_ID;
        }
        
        const sheetData = await sheetsService.buscarTodosDados(activeToken, sheetId);
            
            const sdAny = sheetData as any;
            const rawTxs = Array.isArray(sdAny?.data?.transactions)
              ? sdAny.data.transactions
              : Array.isArray(sdAny?.transactions)
                ? sdAny.transactions
                : Array.isArray(sdAny?.data)
                  ? sdAny.data
                  : Array.isArray(sdAny)
                    ? sdAny
                    : [];
            if (rawTxs.length > 0) {
              const cleanList = cleanDuplicateTransactions(rawTxs);
              setTransactions(cleanList);
              localStorage.setItem('wealthflow_transactions', JSON.stringify(cleanList));
            }
            if (sheetData && Array.isArray(sheetData.riskZones) && sheetData.riskZones.length > 0) {
              setRiskZones(sheetData.riskZones);
              localStorage.setItem('wealthflow_riskzones', JSON.stringify(sheetData.riskZones));
            }
            const rawAppointments = (sheetData && Array.isArray(sheetData.appointments) && sheetData.appointments.length > 0)
              ? sheetData.appointments
              : (sheetData && Array.isArray(sheetData.consultas) && sheetData.consultas.length > 0)
                ? sheetData.consultas
                : (sheetData && Array.isArray(sheetData.consultasMedicas) && sheetData.consultasMedicas.length > 0)
                  ? sheetData.consultasMedicas
                  : (sheetData && Array.isArray(sheetData["6_Consultas_Médicas"]) && sheetData["6_Consultas_Médicas"].length > 0)
                    ? sheetData["6_Consultas_Médicas"]
                    : null;

            if (rawAppointments && rawAppointments.length > 0) {
              const parsedAppointments: MedicalAppointment[] = rawAppointments.filter(Boolean).map((item: any) => {
                let rawDate = item.data || item.Data || '';
                if (rawDate && rawDate.includes('/')) {
                  const parts = rawDate.split('/');
                  if (parts.length === 3) {
                    rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                }
                const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : (item.ID ? String(item.ID) : String(Date.now()));
                const espStr = item.especialidade || item.Especialidade || '';
                const medStr = item.medico || item.Medico || item.Médico || '';
                const horaStr = item.hora || item.Hora || item.horas || item.Horas || item.horario || item.Horario || '';
                const localStr = item.local || item.Local || '';
                const lembreteVal = item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM' || String(item['Lembrete_Ativo']).toUpperCase() === 'SIM' || String(item.lembreteAtivo) === 'true';
                const statusStr = item.status || item.Status || 'Agendada';
                const obsStr = item.observacoes || item.observacao || item['Observação'] || item['Observações'] || item.obs || item.OBS || '';

                return {
                  id: idStr,
                  especialidade: espStr,
                  medico: medStr,
                  data: rawDate,
                  hora: horaStr,
                  local: localStr,
                  observacoes: obsStr,
                  status: (statusStr === 'Realizada' || statusStr === 'Cancelada') ? statusStr : 'Agendada',
                  lembreteAtivo: lembreteVal,
                  updatedAt: item.updatedAt ? Number(item.updatedAt) : Date.now()
                };
              });
              setAppointments(parsedAppointments);
              localStorage.setItem('wealthflow_appointments', JSON.stringify(parsedAppointments));
            }
            if (sheetData && Array.isArray(sheetData.prescriptions) && sheetData.prescriptions.length > 0) {
              setPrescriptions(sheetData.prescriptions);
              localStorage.setItem('wealthflow_prescriptions', JSON.stringify(sheetData.prescriptions));
            }
            const rawCompromissos = (sheetData && Array.isArray(sheetData.compromissos) && sheetData.compromissos.length > 0)
              ? sheetData.compromissos
              : (sheetData && Array.isArray(sheetData.agenda) && sheetData.agenda.length > 0)
                ? sheetData.agenda
                : (sheetData && Array.isArray(sheetData["19_Agenda_E_Compromissos"]) && sheetData["19_Agenda_E_Compromissos"].length > 0)
                  ? sheetData["19_Agenda_E_Compromissos"]
                  : null;

            if (rawCompromissos && rawCompromissos.length > 0) {
              const parsedCompromissos: Compromisso[] = rawCompromissos.filter(Boolean).map((item: any) => {
                let rawDate = item.data || item.Data || '';
                if (rawDate && rawDate.includes('/')) {
                  const parts = rawDate.split('/');
                  if (parts.length === 3) {
                    rawDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                }
                const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : (item.ID ? String(item.ID) : String(Date.now()));
                const tituloStr = item.titulo || item.Titulo || item.title || '';
                const horaStr = item.hora || item.Hora || item.horario || item.Horario || '';
                const descStr = item.descricao || item['Descrição'] || item.Descricao || item.description || '';
                const corStr = item.cor || item.Cor || item.Cor_De_Identificação || item['Cor_De_Identificação'] || '#22c55e';
                const piscandoVal = item.piscando === true || String(item.piscando).toUpperCase() === 'SIM' || String(item['Efeito_Alerta_(Piscando)']).toUpperCase() === 'SIM' || String(item.piscando) === 'true';
                const lembreteVal = item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM' || String(item['Lembrete_Ativo']).toUpperCase() === 'SIM' || String(item.lembreteAtivo) === 'true';
                const diasVal = item.diasAntecedencia !== undefined && item.diasAntecedencia !== null ? Number(item.diasAntecedencia) : (Number(item['Dias_De_Antecedência']) || 2);

                return {
                  id: idStr,
                  titulo: tituloStr,
                  data: rawDate,
                  hora: horaStr,
                  descricao: descStr,
                  cor: corStr,
                  piscando: piscandoVal,
                  lembreteAtivo: lembreteVal,
                  diasAntecedencia: diasVal,
                  concluido: item.concluido === true || String(item.concluido) === 'true' || String(item.Status).toUpperCase() === 'CONCLUÍDO',
                  updatedAt: item.updatedAt ? Number(item.updatedAt) : Date.now()
                };
              });
              setCompromissos(parsedCompromissos);
              localStorage.setItem('wealthflow_compromissos', JSON.stringify(parsedCompromissos));
            }
            const rawVehicles = (sheetData && Array.isArray(sheetData.registeredVehicles) && sheetData.registeredVehicles.length > 0)
              ? sheetData.registeredVehicles
              : (sheetData && Array.isArray(sheetData.veiculos) && sheetData.veiculos.length > 0)
                ? sheetData.veiculos
                : (sheetData && Array.isArray(sheetData["9_Veiculos"]) && sheetData["9_Veiculos"].length > 0)
                  ? sheetData["9_Veiculos"]
                  : null;

            if (rawVehicles && rawVehicles.length > 0) {
              const safeVehs: RegisteredVehicle[] = rawVehicles.filter(Boolean).map((v: any) => {
                const idStr = v.id !== undefined && v.id !== null && String(v.id).trim() !== '' ? String(v.id) : (v.ID ? String(v.ID) : String(Date.now()));
                const descStr = (v.descricao || v['Descrição'] || v.modelo || v.nome || '').toString().toUpperCase();
                const motStr = (v.motorista || v['Motorista'] || '').toString().toUpperCase();
                const placaStr = (v.placa || v['Placa'] || '').toString().toUpperCase();
                const renavanStr = (v.renavan || v.renavam || v['Renavan'] || v['Renavam'] || '').toString().toUpperCase();
                const chassiStr = (v.chassi || v['Chassi'] || '').toString().toUpperCase();
                const marcaStr = (v.marca || v['Marca'] || '').toString().toUpperCase();
                const modeloStr = (v.modelo || v['Modelo'] || '').toString().toUpperCase();
                const anoVal = v.ano !== undefined && v.ano !== null ? String(v.ano) : (v['Ano'] ? String(v['Ano']) : '');
                const anoFabVal = v.anoFabricacao !== undefined && v.anoFabricacao !== null ? String(v.anoFabricacao) : (v['Ano_Fabricação'] ? String(v['Ano_Fabricação']) : (v['Ano_Fabricacao'] ? String(v['Ano_Fabricacao']) : ''));

                return {
                  id: idStr,
                  descricao: descStr,
                  motorista: motStr,
                  placa: placaStr,
                  renavan: renavanStr,
                  renavam: renavanStr,
                  chassi: chassiStr,
                  marca: marcaStr,
                  modelo: modeloStr,
                  ano: anoVal,
                  anoFabricacao: anoFabVal,
                  Ano_Fabricação: anoFabVal
                };
              });
              setRegisteredVehicles(safeVehs);
              localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(safeVehs));
            }
            if (sheetData && Array.isArray(sheetData.performedServices) && sheetData.performedServices.length > 0) {
              setPerformedServices(sheetData.performedServices);
              localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(sheetData.performedServices));
            }
            if (sheetData && Array.isArray(sheetData.scheduledServices) && sheetData.scheduledServices.length > 0) {
              setScheduledServices(sheetData.scheduledServices);
              localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(sheetData.scheduledServices));
            }
            if (sheetData && sheetData.categoryBudgets && typeof sheetData.categoryBudgets === 'object' && Object.keys(sheetData.categoryBudgets).length > 0) {
              setCategoryBudgets(sheetData.categoryBudgets as Record<string, number>);
              localStorage.setItem('wealthflow_category_budgets', JSON.stringify(sheetData.categoryBudgets));
            }
            if (sheetData && Array.isArray(sheetData.groceryItems) && sheetData.groceryItems.length > 0) {
              setGroceryItems(sheetData.groceryItems);
              localStorage.setItem('wealthflow_grocery_items', JSON.stringify(sheetData.groceryItems));
            }
            loadedFromSheets = true;
        } catch (e) {
          console.warn("Falha ao buscar dados da planilha, utilizando cache local:", e);
        }
      
      if (showToast) {
        if (loadedFromSheets) {
          showAlert("Planilha Finanças Gaeta Carregada 📊", "Todos os dados foram atualizados diretamente da planilha do Google Sheets.");
        } else {
          showAlert("Modo Offline 📱", "Dados recarregados do armazenamento local do dispositivo.");
        }
      }
    } catch (e) {
      console.error("Erro ao carregar dados:", e);
    } finally {
      setIsDbLoaded(true);
      isDbLoadedRef.current = true;
    }
  };

  useEffect(() => {
    const handleGoogleAuthError = (e: Event) => {
      const customEv = e as CustomEvent;
      const detailMsg = customEv.detail?.message || "Sua sessão do Google Drive expirou ou as credenciais são inválidas (Erro 401). Por favor, reautentique com o Google nas Configurações do aplicativo.";
      setGoogleUser(null);
      setGoogleToken(null);
      setSpreadsheetUrl('');
      setLastSyncedTime('');
      try {
        localStorage.removeItem('wealthflow_spreadsheet_url');
        localStorage.removeItem('wealthflow_last_synced_time');
        localStorage.removeItem('wealthflow_google_access_token');
        sessionStorage.removeItem('wealthflow_google_access_token');
      } catch (err) {}
      showAlert("Reautenticação Necessária ⚠️", detailMsg);
    };

    window.addEventListener('google_auth_error', handleGoogleAuthError);
    return () => {
      window.removeEventListener('google_auth_error', handleGoogleAuthError);
    };
  }, []);

  useEffect(() => {
    loadDataFromSheets();
  }, [googleToken]);

  // Sync customCategories to localStorage & local DB when it changes
  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_custom_categories', JSON.stringify(customCategories));
      saveCustomCategoriesToDb(customCategories);
    } catch (e) {
      console.warn("Failed to save custom categories:", e);
    }
  }, [customCategories]);

  // Sync securityConfig to localStorage & local DB when it changes
  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_security_config', JSON.stringify(securityConfig));
      saveSecurityConfigToDb(securityConfig);
    } catch (e) {
      console.warn("Failed to save security configuration:", e);
    }
  }, [securityConfig]);

  // Restaurar e aplicar o tema salvo no localStorage na inicialização do aplicativo (com suporte a alternância automática por horário)
  useEffect(() => {
    try {
      const isAutoTheme = localStorage.getItem('wealthflow_auto_theme_enabled') === 'true';
      let themeToApply = localStorage.getItem('wealthflow_theme') || 'dark';

      if (isAutoTheme) {
        const startDay = parseInt(localStorage.getItem('wealthflow_auto_theme_start_day') || '6', 10);
        const startNight = parseInt(localStorage.getItem('wealthflow_auto_theme_start_night') || '18', 10);
        const currentHour = new Date().getHours();
        const isDayTime = currentHour >= startDay && currentHour < startNight;
        themeToApply = isDayTime ? 'light' : 'dark';
        localStorage.setItem('wealthflow_theme', themeToApply);
      }

      if (themeToApply === 'dark') {
        document.documentElement.className = '';
      } else {
        document.documentElement.className = 'theme-' + themeToApply;
      }
    } catch (e) {
      console.warn("Failed to load theme from localStorage:", e);
    }
  }, []);

  // Save to Local Storage when states change as active offline cache
  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_transactions', JSON.stringify(transactions));
    } catch (e) {
      console.warn("Failed to save transactions to localStorage:", e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_riskzones', JSON.stringify(riskZones));
    } catch (e) {
      console.warn("Failed to save riskzones to localStorage:", e);
    }
  }, [riskZones]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_infractions', JSON.stringify(infractions));
    } catch (e) {
      console.warn("Failed to save infractions to localStorage:", e);
    }
  }, [infractions]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_nonappealed', JSON.stringify(nonAppealed));
    } catch (e) {
      console.warn("Failed to save nonappealed infractions to localStorage:", e);
    }
  }, [nonAppealed]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_appointments', JSON.stringify(appointments));
    } catch (e) {
      console.warn("Failed to save appointments to localStorage:", e);
    }
  }, [appointments]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_prescriptions', JSON.stringify(prescriptions));
    } catch (e) {
      console.warn("Failed to save prescriptions to localStorage:", e);
    }
  }, [prescriptions]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_avatarurl', avatarUrl);
    } catch (e) {
      console.warn("Failed to save avatarurl to localStorage:", e);
    }
  }, [avatarUrl]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(registeredVehicles));
    } catch (e) {
      console.warn("Failed to save registered vehicles to localStorage:", e);
    }
  }, [registeredVehicles]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_compromissos', JSON.stringify(compromissos));
    } catch (e) {
      console.warn("Failed to save compromissos to localStorage:", e);
    }
  }, [compromissos]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(performedServices));
    } catch (e) {
      console.warn("Failed to save performed services to localStorage:", e);
    }
  }, [performedServices]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(scheduledServices));
    } catch (e) {
      console.warn("Failed to save scheduled services to localStorage:", e);
    }
  }, [scheduledServices]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_grocery_items', JSON.stringify(groceryItems));
    } catch (e) {
      console.warn("Failed to save grocery items to localStorage:", e);
    }
  }, [groceryItems]);

  // Bank accounts & credit cards state managed by useBanksAndCardsState

  const hasExpiringTransactions = React.useMemo(() => {
    return transactions.some(t => {
      if (t.tipo === 'CONTAS BANCARIAS' || t.tipo === 'CARTÃO DE CRÉDITO') return false;
      const statusUpper = String(t.status || '').trim().toUpperCase();
      if (statusUpper === 'PAGO' || statusUpper === 'RECEBIDO') return false;
      
      let day = 0, month = 0, year = 0;
      if (t.data.includes('/')) {
        const parts = t.data.split('/');
        if (parts.length === 3) {
          day = parseInt(parts[0], 10);
          month = parseInt(parts[1], 10) - 1;
          year = parseInt(parts[2], 10);
        } else return false;
      } else if (t.data.includes('-')) {
        const parts = t.data.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
          }
        } else return false;
      } else {
        return false;
      }
      
      const txDate = new Date(year, month, day);
      txDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      return txDate.getTime() === today.getTime() || txDate.getTime() === tomorrow.getTime();
    });
  }, [transactions]);

  const hasActiveAppointments = React.useMemo(() => {
    return appointments.some(appt => {
      if (appt.status !== 'Agendada') return false;
      const { active } = isNotificationPeriod(appt.data, medicalAppointmentLeadDays);
      return active;
    });
  }, [appointments, medicalAppointmentLeadDays]);

  const hasActiveCompromissos = React.useMemo(() => {
    return compromissos.some(c => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let year = 0, month = 0, day = 0;
      const cleanStr = (c.data || '').trim();
      if (cleanStr.includes('-')) {
        const parts = cleanStr.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          } else {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
          }
        }
      } else if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            year = parseInt(parts[2], 10);
          } else if (parts[0].length === 4) {
            year = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10) - 1;
            day = parseInt(parts[2], 10);
          }
        }
      }

      if (!year || isNaN(year) || isNaN(month) || isNaN(day)) {
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) {
          year = d.getFullYear();
          month = d.getMonth();
          day = d.getDate();
        } else {
          return false;
        }
      }

      const compDate = new Date(year, month, day);
      compDate.setHours(0, 0, 0, 0);
      const diff = Math.ceil((compDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= (c.diasAntecedencia ?? 2);
    });
  }, [compromissos]);

  const hasOverdueServices = React.useMemo(() => {
    return scheduledServices.some(s => {
      if (s.status === 'REALIZADO' || !s.dataAlvo) return false;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [y, m, d] = s.dataAlvo.split('-').map(Number);
      const targetDate = new Date(y, m - 1, d);
      targetDate.setHours(0, 0, 0, 0);
      return targetDate.getTime() < today.getTime();
    });
  }, [scheduledServices]);

  const hasUrgentIpva = React.useMemo(() => {
    const alerts = checkIpvaAlerts(registeredVehicles, new Date(), transactions, ipvaLeadDays);
    return alerts.some(alert => alert.daysRemaining < 10);
  }, [registeredVehicles, transactions, ipvaLeadDays, ipvaClosingDay]);

  // Notifications state
  interface SimulatedNotification {
    id: string;
    banco: string;
    tipo: 'RECEITA' | 'DESPESA' | 'PAGO' | 'ETANOL' | 'GAS. COMUM' | string;
    valor: number;
    descricao: string;
    categoria: string;
    accountId: number;
    isCreditCard: boolean;
    cardId?: number;
  }

  const [activeNotification, setActiveNotification] = useState<SimulatedNotification | null>(null);
  const [bankIntegrationNotification, setBankIntegrationNotification] = useState<{
    id: string;
    bancoNome: string;
    bancoId: number;
    valor: number;
    descricao: string;
    suggestedCategory?: string;
    suggestedJustification?: string;
    isLoadingSuggestion?: boolean;
  } | null>(null);
  const [isSelectingTransferDest, setIsSelectingTransferDest] = useState<boolean>(false);
  const [selectedTransferDestId, setSelectedTransferDestId] = useState<number | null>(null);

  // Sync Queue states and helpers managed by useGoogleSyncState

  // Run an operation and track its sync status in the queue
  const runTrackedSync = async <T,>(
    type: string,
    title: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const changeId = Date.now().toString() + '_' + Math.random().toString(36).substring(2, 5);
    const newChange: PendingChange = {
      id: changeId,
      type,
      title,
      timestamp: Date.now(),
      status: 'PENDING'
    };
    
    setPendingChanges(prev => [newChange, ...prev].slice(0, 50));

    // If offline, mark as pending with connection error and execute local fallback
    if (!navigator.onLine) {
      setPendingChanges(prev => prev.map(c => c.id === changeId ? { ...c, status: 'PENDING', error: 'Modo offline - Salvo localmente' } : c));
      try {
        const res = await operation();
        return res;
      } catch (err: any) {
        return null as any;
      }
    }

    // If online, transition to SYNCING
    setPendingChanges(prev => prev.map(c => c.id === changeId ? { ...c, status: 'SYNCING' } : c));

    try {
      const result = await operation();
      setPendingChanges(prev => prev.map(c => c.id === changeId ? { ...c, status: 'SYNCED', error: undefined } : c));
      
      // Auto-remove SYNCED items after a brief moment (1.5 seconds) so queue doesn't stay full
      setTimeout(() => {
        setPendingChanges(prev => prev.filter(c => c.id !== changeId && c.status !== 'SYNCED'));
      }, 1500);

      return result;
    } catch (err: any) {
      const errMsg = err.message || String(err);
      setPendingChanges(prev => prev.map(c => c.id === changeId ? { ...c, status: 'FAILED', error: errMsg } : c));
      throw err;
    }
  };

  const handleRetryAllSync = async () => {
    const changesToRetry = pendingChanges.filter(c => c.status === 'FAILED' || c.status === 'PENDING');
    if (changesToRetry.length === 0) {
      showAlert("Fila Vazia", "Não há alterações pendentes ou com falha para sincronizar.");
      return;
    }

    setPendingChanges(prev => prev.map(c => c.status === 'FAILED' || c.status === 'PENDING' ? { ...c, status: 'SYNCING' } : c));

    try {
      const promises: Promise<any>[] = [];

      if (googleToken) {
        promises.push(triggerSync(googleToken, false, transactions, [], riskZones, appointments, prescriptions, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'handleRetryAllSync'));
      }

      // Re-save critical collections to ensure local storage is up to date
      transactions.forEach(t => promises.push(saveTransactionToDb(t)));
      compromissos.forEach(c => promises.push(saveCompromissoToDb(c)));
      riskZones.forEach(z => promises.push(saveRiskZoneToDb(z)));

      await Promise.all(promises);

      setPendingChanges(prev => prev.map(c => c.status === 'SYNCING' ? { ...c, status: 'SYNCED', error: undefined } : c));
      showAlert("Sincronização Concluída", "Todas as alterações pendentes foram sincronizadas com sucesso com o banco de dados!");
    } catch (err: any) {
      console.error("Retrying sync failed:", err);
      setPendingChanges(prev => prev.map(c => c.status === 'SYNCING' ? { ...c, status: 'FAILED', error: err.message || 'Falha ao re-tentar' } : c));
      showAlert("Erro na Sincronização", "Ocorreu um erro ao sincronizar. Certifique-se de que está online.");
    }
  };

  const handleClearSyncHistory = () => {
    setPendingChanges(prev => prev.filter(c => c.status !== 'SYNCED'));
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto retry on internet restoration
      handleRetryAllSync();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingChanges]);

  const handleTriggerNotification = async (moduleTitle: string, customMessage: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showAlert('Não Suportado', 'Notificações de desktop não são suportadas neste navegador.');
      return;
    }

    let currentPerm = Notification.permission;

    if (currentPerm === 'default') {
      try {
        currentPerm = await Notification.requestPermission();
      } catch (e) {
        console.error('Erro ao solicitar permissão de notificação:', e);
      }
    }

    if (currentPerm === 'denied') {
      showAlert(
        'Permissão Bloqueada',
        'As notificações estão bloqueadas no seu navegador. Acesse as configurações de privacidade do navegador para permitir alertas do WealthFlow.'
      );
      return;
    }

    if (currentPerm !== 'granted') {
      showAlert('Permissão Pendente', 'Autorização de notificação não concedida.');
      return;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then(reg => {
          reg.showNotification(`WealthFlow • ${moduleTitle}`, {
            body: customMessage,
            icon: '/favicon.ico',
            tag: `test-${Date.now()}`
          });
        }).catch(() => {
          new Notification(`WealthFlow • ${moduleTitle}`, { body: customMessage, icon: '/favicon.ico' });
        });
      } else {
        new Notification(`WealthFlow • ${moduleTitle}`, { body: customMessage, icon: '/favicon.ico' });
      }
      showAlert('Notificação Enviada!', `Alerta de teste enviado para a área de trabalho para o módulo "${moduleTitle}". Verifique se o pop-up apareceu na tela.`);
    } catch (e) {
      console.error('Erro ao disparar notificação:', e);
      showAlert('Erro ao Disparar', 'Ocorreu uma falha ao enviar a notificação de desktop.');
    }
  };

  const triggerSimulationNotification = (notif: Omit<SimulatedNotification, 'id'>) => {
    const id = Date.now().toString();
    const fullNotif = { id, ...notif };
    setActiveNotification(fullNotif);

    // Play push notification sound
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      osc.frequency.setValueAtTime(987.77, audioCtx.currentTime + 0.08); // B5
      osc.frequency.setValueAtTime(1318.51, audioCtx.currentTime + 0.16); // E6
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}
  };

  const triggerBankIntegration = (bancoId: number, valor: number, descricao: string) => {
    const bankObj = bankAccountsState.find(b => b.id === bancoId);
    const bancoNome = bankObj ? bankObj.nome : "BANCO DE TESTE";
    
    setBankIntegrationNotification({
      id: Date.now().toString(),
      bancoNome,
      bancoId,
      valor,
      descricao: descricao || "Nova transação Pix recebida"
    });

    // Play banking notification ring
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.16); // A5
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch (e) {}
  };

  const fetchAiCategorySuggestion = async (webhookId: string, desc: string, val: number, bNome: string) => {
    // Take recent transactions for reference
    const recentTxs = transactions.slice(0, 50).map(t => ({
      descricao: t.descricao,
      categoria: t.categoria,
      tipo: t.tipo,
      valor: t.valor
    }));

    try {
      const response = await fetch("/api/ai/suggest-category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          descricao: desc,
          valor: val,
          bancoNome: bNome,
          historico: recentTxs
        })
      });

      if (!response.ok) throw new Error("HTTP error " + response.status);
      const data = await response.json();
      
      setBankIntegrationNotification(prev => {
        if (prev && prev.id === webhookId) {
          return {
            ...prev,
            suggestedCategory: data.categoria || 'OUTROS',
            suggestedJustification: data.justificativa,
            isLoadingSuggestion: false
          };
        }
        return prev;
      });
    } catch (err) {
      console.error("Failed to fetch AI category suggestion:", err);
      setBankIntegrationNotification(prev => {
        if (prev && prev.id === webhookId) {
          return {
            ...prev,
            suggestedCategory: 'OUTROS',
            suggestedJustification: 'Não foi possível obter sugestão da IA.',
            isLoadingSuggestion: false
          };
        }
        return prev;
      });
    }
  };

  const handleImportBankIntegration = async (tipo: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA', destBancoId?: number) => {
    if (!bankIntegrationNotification) return;
    const { bancoNome, bancoId, valor, descricao, suggestedCategory } = bankIntegrationNotification;
         
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${year}-${month}-${day}`; // Formato ISO para o input de data
    
    let txTipo = 'DESPESA';
    if (tipo === 'RECEITA') txTipo = 'RECEITA';
    if (tipo === 'TRANSFERENCIA') txTipo = 'TRANSFERÊNCIA';

    // Salva os dados do Pix no rascunho temporário do rascunho do formulário
    localStorage.setItem('draft_txType', txTipo);
    localStorage.setItem('draft_category', suggestedCategory && suggestedCategory !== "OUTROS" ? suggestedCategory : (tipo === 'RECEITA' ? 'TRABALHO' : 'ABASTECIMENTO'));
    localStorage.setItem('draft_valor', String(valor));
    localStorage.setItem('draft_descricao', `${descricao} (via ${bancoNome})`);
    localStorage.setItem('draft_data', formattedDate);
    localStorage.setItem('draft_bancoId', String(bancoId));
    if (destBancoId) localStorage.setItem('draft_destBancoId', String(destBancoId));

    // Fecha o banner flutuante da notificação
    setBankIntegrationNotification(null);
    setIsSelectingTransferDest(false);
    setSelectedTransferDestId(null);

    // Redireciona para a aba de Finanças e abre o formulário de edição/adição com os campos liberados!
    setCurrentTab('transactions');
    setShowAddTxForm(true);

    showAlert("Editar Pix", "Os dados do Pix foram carregados no formulário. Ajuste a categoria ou descrição e clique em Salvar!");
  };

  const handleRecordSimulatedTransaction = async (notification: SimulatedNotification) => {
    // 1. Format date as "DD/MM/YYYY"
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const formattedDate = `${day}/${month}/${year}`;

    // 2. Add to transactions list
    const id = transactions.length ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
    const txObj: Transaction = {
      id,
      data: formattedDate,
      valor: notification.valor,
      tipo: notification.tipo,
      descricao: notification.descricao,
      categoria: notification.categoria,
      status: "PAGO", // Automatically marked as PAGO
      updatedAt: Date.now()
    };

    setTransactions(prev => [txObj, ...prev]);
    await saveTransactionToDb(txObj);

    // 3. Update balances
    if (notification.isCreditCard) {
      setCreditCardsState(prev => prev.map(card => {
        if (card.id === notification.cardId) {
          return {
            ...card,
            gasto: card.gasto + notification.valor
          };
        }
        return card;
      }));
    } else {
      setBankAccountsState(prev => prev.map(acc => {
        if (acc.id === notification.accountId) {
          const isIncome = notification.tipo === 'RECEITA';
          return {
            ...acc,
            saldoInicial: isIncome ? acc.saldoInicial + notification.valor : acc.saldoInicial - notification.valor
          };
        }
        return acc;
      }));
    }

    // 4. Clear notification
    setActiveNotification(null);

    // 5. Alert user with sound and message
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
      osc.frequency.setValueAtTime(1174.66, audioCtx.currentTime + 0.2); // D6
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.4);
    } catch (e) {}

    showAlert("Sucesso", `Transação de "${notification.descricao}" gravada com sucesso nas suas finanças e o saldo foi atualizado!`);
  };

  // Custom dialog/confirmation state (avoids blocking alert/confirm iframe errors)
  const [modalInputVal, setModalInputVal] = useState<string>('');
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isConfirm: boolean;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    requireInputText?: string;
  }>({
    isOpen: false,
    title: '',
    message: '',
    isConfirm: false,
  });

  const showAlert = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      title,
      message,
      isConfirm: false,
    });
  };

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    requireInputText?: string
  ) => {
    setModalInputVal('');
    setDialog({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      onConfirm,
      requireInputText,
    });
  };

  // Listen to Google authentication lifecycle
  useEffect(() => {
    authService.initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
  }, []);

  // Network Listener & Auto-sync processing for Offline Queue
  useEffect(() => {
    const processOfflineQueue = async () => {
      if (!navigator.onLine) return;
      const activeToken = googleToken || 
                          localStorage.getItem('wealthflow_apps_script_url') || 
                          localStorage.getItem('wealthflow_google_access_token');
      if (!activeToken) return;

      const queuedSync = localStorage.getItem('wealthflow_sync_queue');
      if (queuedSync) {
        console.log("Conexão com a internet restabelecida. Processando fila de sincronização pendente...");
        try {
          await triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'processOfflineQueue');
          localStorage.removeItem('wealthflow_sync_queue');
        } catch (e) {
          console.error("Erro ao sincronizar fila offline:", e);
        }
      }
    };

    window.addEventListener('online', processOfflineQueue);
    if (navigator.onLine) {
      processOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', processOfflineQueue);
    };
  }, [googleToken]);

  // Periodic background auto-sync & foreground pull from Google Sheets
  useEffect(() => {
    const activeToken = googleToken || 
                        localStorage.getItem('wealthflow_apps_script_url') || 
                        localStorage.getItem('wealthflow_spreadsheet_url') || 
                        localStorage.getItem('wealthflow_google_access_token');
    if (!activeToken) return;

    // Trigger sync when app becomes visible / focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'visibilityChange');
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Periodic interval every 2 minutes while app is running
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'autoSyncInterval');
      }
    }, 2 * 60 * 1000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(syncInterval);
    };
  }, [googleToken]);

  // Auto-sync other collections to Google Sheets whenever they change
  useEffect(() => {
    if (googleToken && isDbLoaded && autoSync) {
      triggerSync(googleToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'autoSyncStateEffect');
    }
  }, [
    compromissos,
    registeredVehicles,
    performedServices,
    scheduledServices,
    bankAccountsState,
    creditCardsState,
    groceryItems,
    googleToken,
    isDbLoaded,
    autoSync
  ]);

  // Automated Periodic Backups to Google Drive
  useEffect(() => {
    if (!googleToken) return;

    const checkAndRunAutomatedBackup = async () => {
      try {
        const scheduleEnabled = localStorage.getItem('wealthflow_backup_schedule_enabled') === 'true';
        if (!scheduleEnabled) return;

        const freq = localStorage.getItem('wealthflow_backup_frequency') || 'semanal';
        let intervalMs = 7 * 24 * 60 * 60 * 1000; // default 7 days
        if (freq === 'diario') {
          intervalMs = 1 * 24 * 60 * 60 * 1000;
        } else if (freq === 'mensal') {
          intervalMs = 30 * 24 * 60 * 60 * 1000;
        }

        const lastBackupStr = localStorage.getItem('wealthflow_last_backup_time');
        const now = Date.now();

        if (lastBackupStr) {
          const lastBackupTime = new Date(lastBackupStr).getTime();
          if (now - lastBackupTime < intervalMs) {
            // Not time yet
            return;
          }
        }

        console.log(`Iniciando backup automático (${freq}) para o Google Drive...`);
        
        // Obter todos os dados do aplicativo
        const keys = [
          'wealthflow_transactions',
          'wealthflow_riskzones',
          'wealthflow_infractions',
          'wealthflow_nonappealed',
          'wealthflow_appointments',
          'wealthflow_prescriptions',
          'wealthflow_registered_vehicles',
          'wealthflow_compromissos',
          'wealthflow_car_services_performed',
          'wealthflow_car_services_scheduled',
          'wealthflow_bank_accounts',
          'wealthflow_credit_cards',
          'wealthflow_custom_categories',
          'wealthflow_category_budgets',
          'wealthflow_security_config',
          'wealthflow_savings_goals',
          'wealthflow_custom_ipva_dates'
        ];
        const backupData: Record<string, any> = {};
        keys.forEach(key => {
          try {
            const val = localStorage.getItem(key);
            backupData[key] = val ? JSON.parse(val) : null;
          } catch (e) {
            backupData[key] = null;
          }
        });
        backupData.exported_at = new Date().toISOString();
        backupData.app_name = "WealthFlow";

        const fileName = await authService.uploadBackupToDrive(googleToken, backupData);
        
        localStorage.setItem('wealthflow_last_backup_time', new Date().toISOString());
        localStorage.setItem('wealthflow_last_backup_filename', fileName);
        console.log(`Backup automático (${freq}) '${fileName}' enviado com sucesso para o Google Drive.`);
      } catch (err) {
        console.error("Erro no backup automático:", err);
      }
    };

    // Run on startup (after token loaded)
    const timer = setTimeout(() => {
      checkAndRunAutomatedBackup();
    }, 10000); // Wait 10 seconds after load to not block UI startup

    return () => clearTimeout(timer);
  }, [googleToken]);

  // Browser Notification system for compromissos and due dates
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const checkAndNotifyCompromissos = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const notified = JSON.parse(localStorage.getItem('wealthflow_notified_compromissos') || '{}');
      let updatedNotified = { ...notified };
      let hasNewNotifications = false;

      compromissos.forEach(c => {
        if (!c.lembreteAtivo) return;

        // Calculate days difference
        let year = 0, month = 0, day = 0;
        const cleanStr = (c.data || '').trim();
        if (cleanStr.includes('-')) {
          const parts = cleanStr.split('-');
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              year = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              day = parseInt(parts[2], 10);
            } else {
              day = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              year = parseInt(parts[2], 10);
            }
          }
        } else if (cleanStr.includes('/')) {
          const parts = cleanStr.split('/');
          if (parts.length === 3) {
            if (parts[2].length === 4) {
              day = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              year = parseInt(parts[2], 10);
            } else if (parts[0].length === 4) {
              year = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10) - 1;
              day = parseInt(parts[2], 10);
            }
          }
        }

        if (!year || isNaN(year) || isNaN(month) || isNaN(day)) {
          const d = new Date(cleanStr);
          if (!isNaN(d.getTime())) {
            year = d.getFullYear();
            month = d.getMonth();
            day = d.getDate();
          } else {
            return;
          }
        }

        const compDate = new Date(year, month, day);
        compDate.setHours(0, 0, 0, 0);
        const diff = Math.ceil((compDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        // Within warning window
        if (diff >= 0 && diff <= (c.diasAntecedencia ?? 2)) {
          if (!notifyAppointments) return;
          const notificationKey = `${c.id}_${diff}`;

          // If not notified yet for this specific day difference state
          if (!notified[notificationKey]) {
            const title = `Lembrete: ${c.titulo}`;
            let body = '';
            if (diff === 0) {
              body = `É hoje! ${c.hora ? `Às ${c.hora}.` : ''} ${c.descricao || ''}`;
            } else if (diff === 1) {
              body = `Amanhã! ${c.hora ? `Às ${c.hora}.` : ''} ${c.descricao || ''}`;
            } else {
              body = `Faltam ${diff} dias. ${c.hora ? `Às ${c.hora}.` : ''} ${c.descricao || ''}`;
            }

            // Trigger notification
            try {
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(reg => {
                  reg.showNotification(title, {
                    body,
                    icon: '/favicon.ico',
                    tag: `comp-${c.id}-${diff}`,
                  });
                }).catch(() => {
                  new Notification(title, { body, icon: '/favicon.ico' });
                });
              } else {
                new Notification(title, { body, icon: '/favicon.ico' });
              }
            } catch (err) {
              console.error('Error showing web notification:', err);
              new Notification(title, { body, icon: '/favicon.ico' });
            }

            updatedNotified[notificationKey] = Date.now();
            hasNewNotifications = true;
          }
        }
      });

      if (hasNewNotifications) {
        localStorage.setItem('wealthflow_notified_compromissos', JSON.stringify(updatedNotified));
      }
    };

    // Run initially and then every 15 minutes to check
    checkAndNotifyCompromissos();
    const interval = setInterval(checkAndNotifyCompromissos, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [compromissos, notifyAppointments]);

  // Browser Notification system for category budget limits (90% and 100%)
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!notifyBudget) return;

    const checkAndNotifyBudgetLimits = () => {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const monthYearKey = `${currentYear}-${currentMonth}`;

      const notified = (() => {
        try {
          const saved = localStorage.getItem('wealthflow_budget_notified_90_100');
          return saved ? JSON.parse(saved) : {};
        } catch {
          return {};
        }
      })();
      let updatedNotified = { ...notified };
      let hasNewNotifications = false;

      // Helper to parse dates in DD/MM/YYYY or YYYY-MM-DD
      const parseDateHelper = (dateStr: string): Date | null => {
        if (!dateStr) return null;
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const year = parseInt(parts[2], 10);
            return new Date(year, month, day);
          }
        }
        if (dateStr.includes('-')) {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
          }
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      };

      const budgetsEntries = Object.entries(categoryBudgets || {}).filter(([_, limit]) => Number(limit) > 0);

      budgetsEntries.forEach(([catName, annualLimitVal]) => {
        const annualLimit = Number(annualLimitVal);
        const monthlyLimit = annualLimit / 12;
        const catUpper = (catName || '').toString().toUpperCase();

        const spentInCatThisMonth = transactions
          .filter(t => {
            const pDate = parseDateHelper(t.data);
            if (!pDate) return false;
            const isCurrentMonthAndYear = pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
            const isExpense = String(t.tipo || '').trim().toUpperCase() !== 'RECEITA' && String(t.tipo || '').trim().toUpperCase() !== 'RECEBIDO';
            const matchesCategory = String(t.categoria || '').trim().toUpperCase() === catUpper;
            return isCurrentMonthAndYear && isExpense && matchesCategory;
          })
          .reduce((sum, t) => sum + t.valor, 0);

        const pct = monthlyLimit > 0 ? (spentInCatThisMonth / monthlyLimit) * 100 : 0;

        const formatCurrency = (val: number) => {
          return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        };

        if (pct >= 100) {
          const notificationKey = `${catUpper}_100_${monthYearKey}`;
          if (!notified[notificationKey]) {
            const title = `🚨 Limite Excedido: ${catUpper}`;
            const body = `Os gastos em ${catUpper} atingiram ${formatCurrency(spentInCatThisMonth)}, superando o limite de ${formatCurrency(monthlyLimit)} (100% atingido).`;
            
            triggerPushNotification(title, body, `budget-100-${catUpper}`);
            updatedNotified[notificationKey] = Date.now();
            hasNewNotifications = true;
          }
        } else if (pct >= 90) {
          const notificationKey = `${catUpper}_90_${monthYearKey}`;
          if (!notified[notificationKey]) {
            const title = `⚠️ Alerta de Orçamento: ${catUpper}`;
            const body = `Seus gastos em ${catUpper} atingiram ${formatCurrency(spentInCatThisMonth)}, o que representa ${Math.round(pct)}% do seu limite mensal de ${formatCurrency(monthlyLimit)}.`;
            
            triggerPushNotification(title, body, `budget-90-${catUpper}`);
            updatedNotified[notificationKey] = Date.now();
            hasNewNotifications = true;
          }
        }
      });

      if (hasNewNotifications) {
        localStorage.setItem('wealthflow_budget_notified_90_100', JSON.stringify(updatedNotified));
      }
    };

    const triggerPushNotification = (title: string, body: string, tag: string) => {
      try {
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon: '/favicon.ico',
              tag,
            });
          }).catch(() => {
            new Notification(title, { body, icon: '/favicon.ico' });
          });
        } else {
          new Notification(title, { body, icon: '/favicon.ico' });
        }
      } catch (err) {
        console.error('Error showing web notification:', err);
        new Notification(title, { body, icon: '/favicon.ico' });
      }
    };

    checkAndNotifyBudgetLimits();
  }, [transactions, categoryBudgets, notifyBudget]);

  // Browser Notification system for tire calibration limits
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    if (!notifyCarServices) return;

    const checkAndNotifyTireCalibrations = () => {
      try {
        const saved = localStorage.getItem('wealthflow_tire_calibrations');
        if (!saved) return;
        const calibrations = JSON.parse(saved);
        if (!calibrations || typeof calibrations !== 'object') return;

        const notified = JSON.parse(localStorage.getItem('wealthflow_notified_tire_calibrations') || '{}');
        let updatedNotified = { ...notified };
        let hasNewNotifications = false;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        Object.keys(calibrations).forEach(vKey => {
          const config = calibrations[vKey];
          if (!config || !config.nextCalibrationDate) return;

          const targetDate = new Date(config.nextCalibrationDate + 'T00:00:00');
          targetDate.setHours(0, 0, 0, 0);

          const diffTime = targetDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // If overdue or due today/tomorrow, notify
          if (daysRemaining <= 0) {
            // Check if notified today for this vehicle
            const notificationKey = `${vKey}_overdue_${today.toISOString().split('T')[0]}`;
            if (!notified[notificationKey]) {
              const title = `🚨 Calibragem Vencida: ${vKey}`;
              const body = `Os pneus do veículo ${vKey} necessitam de calibragem periódica! Próxima data agendada era em ${new Date(config.nextCalibrationDate + 'T12:00:00').toLocaleDateString('pt-BR')}.`;
              
              // Trigger notification
              try {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, {
                      body,
                      icon: '/favicon.ico',
                      tag: `tire-${vKey}-overdue`,
                    });
                  }).catch(() => {
                    new Notification(title, { body, icon: '/favicon.ico' });
                  });
                } else {
                  new Notification(title, { body, icon: '/favicon.ico' });
                }
              } catch (err) {
                new Notification(title, { body, icon: '/favicon.ico' });
              }

              updatedNotified[notificationKey] = Date.now();
              hasNewNotifications = true;
            }
          }
        });

        if (hasNewNotifications) {
          localStorage.setItem('wealthflow_notified_tire_calibrations', JSON.stringify(updatedNotified));
        }
      } catch (e) {
        console.error("Error in checkAndNotifyTireCalibrations:", e);
      }
    };

    // Run on startup and every 30 minutes
    checkAndNotifyTireCalibrations();
    const interval = setInterval(checkAndNotifyTireCalibrations, 30 * 60 * 1000);

    // Also listen to storage events to immediately trigger check if calibration dates change
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'wealthflow_tire_calibrations' || !e.key) {
        checkAndNotifyTireCalibrations();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Helper to reliably get active Google Token or Web App URL
  const getEffectiveGoogleToken = (): string | null => {
    return googleToken || 
           localStorage.getItem('wealthflow_apps_script_url') || 
           localStorage.getItem('wealthflow_spreadsheet_url') || 
           localStorage.getItem('wealthflow_google_access_token') || 
           null;
  };

  // Shared Google Sync logic
  const triggerSync = async (
    tokenToUse?: string, 
    isBackground = false,
    overrideTxs?: Transaction[],
    overrideInfracs?: Infraction[],
    overrideZones?: RiskZone[],
    overrideAppts?: MedicalAppointment[],
    overridePrescs?: MedicalPrescription[],
    forceOverwriteSpreadsheet = false,
    overrideCompromissos?: Compromisso[],
    overrideVehicles?: RegisteredVehicle[],
    overridePerfServices?: CarServicePerformed[],
    overrideSchedServices?: CarServiceScheduled[],
    overrideBanks?: BankAccount[],
    overrideCards?: CreditCard[],
    overrideGroceryItems?: GroceryItem[],
    origem: string = 'triggerSync'
  ) => {
    const activeToken = tokenToUse || getEffectiveGoogleToken();
    if (!activeToken) return;

    if (!isDbLoadedRef.current) {
      console.log("Aguardando inicialização do banco de dados local...");
      let waitCount = 0;
      while (!isDbLoadedRef.current && waitCount < 50) {
        await new Promise(r => setTimeout(r, 100));
        waitCount++;
      }
    }

    // Offline-first check: if device is offline, store sync queue locally
    if (!navigator.onLine) {
      console.log("Modo offline ativo. Gravando na fila de sincronização pendente...");
      localStorage.setItem('wealthflow_sync_queue', JSON.stringify({ timestamp: Date.now() }));
      return;
    }

    const currentTxs = overrideTxs || transactions;
    const currentInfracs = overrideInfracs || infractions;
    const currentZones = overrideZones || riskZones;
    const currentAppts = overrideAppts || appointments;
    const currentPrescs = overridePrescs || prescriptions;
    const currentCompromissos = overrideCompromissos || compromissos;
    const currentVehicles = overrideVehicles || registeredVehicles;
    const currentPerfServices = overridePerfServices || performedServices;
    const currentSchedServices = overrideSchedServices || scheduledServices;
    const currentBanks = overrideBanks || bankAccountsState;
    const currentCards = overrideCards || creditCardsState;
    const currentGroceryItems = overrideGroceryItems || groceryItems;

    const syncStartTime = Date.now();

    // Check concurrency lock to avoid simultaneous sync requests (race conditions)
    if (syncLockRef.current) {
      // Queue the sync request for execution as soon as current sync finishes
      pendingSyncParamsRef.current = {
        tokenToUse,
        isBackground,
        overrideTxs: currentTxs,
        overrideInfracs: currentInfracs,
        overrideZones: currentZones,
        overrideAppts: currentAppts,
        overridePrescs: currentPrescs,
        forceOverwriteSpreadsheet: forceOverwriteSpreadsheet || pendingSyncParamsRef.current?.forceOverwriteSpreadsheet || false,
        overrideCompromissos: currentCompromissos,
        overrideVehicles: currentVehicles,
        overridePerfServices: currentPerfServices,
        overrideSchedServices: currentSchedServices,
        overrideBanks: currentBanks,
        overrideCards: currentCards,
        overrideGroceryItems: currentGroceryItems,
        origem: `${origem} (Queued)`
      };
      syncPendingRef.current = true;
      return;
    }
    syncLockRef.current = true;
    setIsSyncing(true);

    if (!isBackground) {
      setSyncError(null);
    }
    try {
      let sheetId = await sheetsService.obterOuCriarPlanilha(activeToken);
      if (!sheetId || sheetId === 'active_sheet' || sheetId.trim() === '') {
        sheetId = DEFAULT_SPREADSHEET_ID;
      }
      
      // 1. Always fetch complete spreadsheet data to treat Google Sheets as official source of truth
      console.log('=== [DIAGNOSTIC LOG - STEP 1] Lendo dados da Google Sheets ===');
      console.log('[SYNC LOG] Buscando dados completos da planilha ID:', sheetId);

      let sheetData: any = {};
      try {
        sheetData = await sheetsService.buscarTodosDados(activeToken, sheetId);
      } catch (fetchErr) {
        console.warn("[SYNC LOG] Aviso ao buscar todos os dados da planilha durante sincronização:", fetchErr);
        sheetData = {};
      }

      // Load deleted transaction IDs
      let deletedIds: (number | string)[] = [];
      try {
        const deletedIdsStr = localStorage.getItem('wealthflow_deleted_tx_ids') || '[]';
        deletedIds = JSON.parse(deletedIdsStr);
      } catch (e) {}

      const lastSyncedTimestampStr = localStorage.getItem('wealthflow_last_synced_timestamp') || '0';
      const lastSyncedTimestamp = parseInt(lastSyncedTimestampStr, 10);

      const rawSheetTxs = Array.isArray(sheetData?.transactions) 
        ? sheetData.transactions 
        : (Array.isArray(sheetData?.abastecimentos) ? sheetData.abastecimentos : []);

      if (import.meta.env.DEV) {
        console.log('=== [ETAPA 1] Registros retornados por buscarTodosDados() ===', rawSheetTxs);
      }

      const validSheetTxs = rawSheetTxs.map((st: any, idx: number) => {
        const norm = normalizeTransactionObject(st);
        if (!norm.id) {
          norm.id = Date.now() + Math.floor(Math.random() * 100000) + idx;
          console.log(`[SYNC LOG] Item da planilha sem ID recebeu ID gerado: ${norm.id} (${norm.descricao})`);
        }
        return norm;
      });

      if (import.meta.env.DEV) {
        console.log('=== [ETAPA 2] Registros após normalizeTransactionObject() ===', validSheetTxs);
      }

      console.log(`[SYNC LOG - LOCAL BEFORE MERGE] Total de lançamentos locais na memória do app: ${currentTxs?.length || 0}`);
      console.log('[SYNC LOG - LOCAL BEFORE MERGE] IDs locais:', (currentTxs || []).map(t => t.id));
      console.log('[SYNC LOG - LOCAL BEFORE MERGE] IDs excluídos no app (deletedIds):', deletedIds);
      console.log(`[SYNC LOG - LOCAL BEFORE MERGE] Last synced timestamp: ${lastSyncedTimestamp}`);

      // --- MERGE TRANSACTIONS ---
      let cleanMergedTxs = currentTxs;
      let hasAppChanges = forceOverwriteSpreadsheet || Boolean(overrideTxs || overrideInfracs || overrideZones || overrideAppts || overridePrescs || overrideCompromissos || overrideVehicles || overridePerfServices || overrideSchedServices || overrideBanks || overrideCards || overrideGroceryItems);

      if (deletedIds.length > 0) {
        hasAppChanges = true;
      }

      if (!forceOverwriteSpreadsheet) {
        const txMap = new Map<string, any>();
        (Array.isArray(currentTxs) ? currentTxs : []).forEach(t => {
          if (t && typeof t === 'object' && t.id !== undefined && t.id !== null) {
            const key = String(t.id).trim();
            if (key) {
              txMap.set(key, t);
              if ((t.updatedAt || 0) > lastSyncedTimestamp) {
                hasAppChanges = true;
              }
            }
          }
        });

        let hasNewOrUpdatedFromSheet = false;
        const txsToSaveDb: any[] = [];

        validSheetTxs.forEach((st: any) => {
          if (!st || typeof st !== 'object' || st.id === undefined || st.id === null) return;
          const stIdKey = String(st.id).trim();
          if (!stIdKey) return;

          if (deletedIds.includes(stIdKey) || deletedIds.includes(st.id)) {
            console.log(`[SYNC LOG - MERGE] Ignorando registro da planilha (ID ${stIdKey} - ${st.descricao}) pois foi excluído pelo usuário no aplicativo`);
            return;
          }

          const localTx = txMap.get(stIdKey);
          if (!localTx) {
            // New record pasted/added directly in Google Sheets!
            console.log(`[SYNC LOG - MERGE] NOVO registro detectado da planilha! ID: ${stIdKey}, Descrição: ${st.descricao}, Valor: ${st.valor}`);
            txMap.set(stIdKey, st);
            txsToSaveDb.push(st);
            hasNewOrUpdatedFromSheet = true;
          } else {
            // Compare fields to detect manual edits in Google Sheets
            const isDifferent = 
              String(localTx.descricao || '').trim() !== String(st.descricao || '').trim() ||
              Number(localTx.valor || 0) !== Number(st.valor || 0) ||
              String(localTx.categoria || '').trim() !== String(st.categoria || '').trim() ||
              String(localTx.data || '').trim() !== String(st.data || '').trim() ||
              String(localTx.status || '').trim() !== String(st.status || '').trim() ||
              String(localTx.tipo || '').trim() !== String(st.tipo || '').trim() ||
              String(localTx.obs || '').trim() !== String(st.obs || '').trim() ||
              Number(localTx.km || 0) !== Number(st.km || 0) ||
              Number(localTx.litros || 0) !== Number(st.litros || 0) ||
              Number(localTx.precoLitro || 0) !== Number(st.precoLitro || 0) ||
              String(localTx.veiculo || '').trim() !== String(st.veiculo || '').trim();

            if (isDifferent) {
              const localUpdatedAt = localTx.updatedAt || 0;
              const isLocalNewer = localUpdatedAt > lastSyncedTimestamp;

              if (!isLocalNewer) {
                console.log(`[SYNC LOG - MERGE] Alteração detectada na planilha para ID ${stIdKey}! Atualizando dados locais.`);
                const updatedTx = { ...localTx, ...st, updatedAt: 0 };
                txMap.set(stIdKey, updatedTx);
                txsToSaveDb.push(updatedTx);
                hasNewOrUpdatedFromSheet = true;
              } else {
                console.log(`[SYNC LOG - MERGE] ID ${stIdKey} foi alterado localmente mais recentemente no aplicativo. Mantendo local.`);
                hasAppChanges = true;
              }
            }
          }
        });

        const mergedTxsList = Array.from(txMap.values()).sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
        cleanMergedTxs = cleanDuplicateTransactions(mergedTxsList);
        const hasDuplicatesCleaned = cleanMergedTxs.length < mergedTxsList.length;

        console.log(`[SYNC LOG - APÓS MESCLAGEM] Total de lançamentos após mesclagem: ${cleanMergedTxs.length}`);

        if (hasNewOrUpdatedFromSheet || hasDuplicatesCleaned) {
          setTransactions(cleanMergedTxs);
          localStorage.setItem('wealthflow_transactions', JSON.stringify(cleanMergedTxs));

          for (const tx of txsToSaveDb) {
            if (cleanMergedTxs.some(t => String(t.id) === String(tx.id))) {
              await saveTransactionToDb(tx);
            }
          }

          if (hasDuplicatesCleaned) {
            const cleanIds = new Set(cleanMergedTxs.map(t => String(t.id)));
            const duplicateTxs = mergedTxsList.filter(t => !cleanIds.has(String(t.id)));
            for (const dup of duplicateTxs) {
              await deleteTransactionFromDb(Number(dup.id) || dup.id);
            }
          }
        }
      } else {
        console.log(`[SYNC LOG - FORCE OVERWRITE] Sobrescrevendo planilha com dados locais. Lançamentos: ${cleanMergedTxs.length}`);
      }

      // --- GENERIC TWO-WAY MERGE HELPER FOR ALL OTHER MODULES ---
      const mergeModuleArray = <T extends { id?: any; updatedAt?: number }>(
        localList: T[],
        sheetList: any[],
        storageKey: string,
        setStateFn: (val: T[]) => void
      ): T[] => {
        if (!Array.isArray(sheetList) || sheetList.length === 0) {
          return Array.isArray(localList) ? localList : [];
        }

        const map = new Map<string, T>();
        (Array.isArray(localList) ? localList : []).forEach(item => {
          if (!item) return;
          const raw = item.id || (item as any).Id || (item as any).ID;
          if (raw !== undefined && raw !== null && raw !== '') {
            map.set(String(raw).trim(), item);
          }
        });

        let changed = false;

        sheetList.forEach((st: any, idx: number) => {
          if (!st || typeof st !== 'object') return;
          let rawId = st.id || st.Id || st.ID;
          if (rawId === undefined || rawId === null || rawId === '') {
            rawId = 'MOD_' + Date.now() + '_' + Math.floor(Math.random() * 1000) + '_' + idx;
            st.id = rawId;
          }
          const idKey = String(rawId).trim();

          const existing = map.get(idKey);
          if (!existing) {
            map.set(idKey, st);
            changed = true;
          } else {
            const localUp = (existing as any).updatedAt || 0;
            if (localUp <= lastSyncedTimestamp) {
              map.set(idKey, { ...existing, ...st });
              changed = true;
            }
          }
        });

        const result = Array.from(map.values());
        if (changed) {
          setStateFn(result);
          try {
            localStorage.setItem(storageKey, JSON.stringify(result));
          } catch (e) {}
        }
        return result;
      };

      const mergedInfracs = mergeModuleArray(currentInfracs, sheetData?.infractions || [], 'wealthflow_infractions', setInfractions);
      const mergedZones = mergeModuleArray(currentZones, sheetData?.riskZones || [], 'wealthflow_riskzones', setRiskZones);
      const mergedAppts = mergeModuleArray(currentAppts, sheetData?.appointments || sheetData?.consultas || [], 'wealthflow_appointments', setAppointments);
      const mergedPrescs = mergeModuleArray(currentPrescs, sheetData?.prescriptions || [], 'wealthflow_prescriptions', setPrescriptions);
      const mergedCompromissos = mergeModuleArray(currentCompromissos, sheetData?.compromissos || sheetData?.agenda || [], 'wealthflow_compromissos', setCompromissos);
      const mergedVehicles = mergeModuleArray(currentVehicles, sheetData?.registeredVehicles || sheetData?.veiculos || [], 'wealthflow_registered_vehicles', setRegisteredVehicles);
      const mergedPerfServices = mergeModuleArray(currentPerfServices, sheetData?.performedServices || sheetData?.workshop || [], 'wealthflow_car_services_performed', setPerformedServices);
      const mergedSchedServices = mergeModuleArray(currentSchedServices, sheetData?.scheduledServices || [], 'wealthflow_car_services_scheduled', setScheduledServices);
      const mergedBanks = mergeModuleArray(currentBanks, sheetData?.bankAccounts || [], 'wealthflow_bank_accounts', setBankAccountsState);
      const mergedCards = mergeModuleArray(currentCards, sheetData?.creditCards || [], 'wealthflow_credit_cards', setCreditCardsState);
      const mergedGroceryItems = mergeModuleArray(currentGroceryItems, sheetData?.groceryItems || [], 'wealthflow_grocery_items', setGroceryItems);

      // Update stable reference
      const finalTxsJson = JSON.stringify(cleanMergedTxs);
      const finalInfsJson = JSON.stringify(mergedInfracs);
      const finalZonesJson = JSON.stringify(mergedZones);
      const finalApptsJson = JSON.stringify(mergedAppts);
      const finalPrescsJson = JSON.stringify(mergedPrescs);
      const finalCompJson = JSON.stringify(mergedCompromissos);
      const finalVehJson = JSON.stringify(mergedVehicles);
      const finalPerfJson = JSON.stringify(mergedPerfServices);
      const finalSchedJson = JSON.stringify(mergedSchedServices);
      const finalBankJson = JSON.stringify(mergedBanks);
      const finalCardJson = JSON.stringify(mergedCards);
      const finalGrocJson = JSON.stringify(mergedGroceryItems);
      lastSyncedTxRef.current = `${finalTxsJson}_${finalInfsJson}_${finalZonesJson}_${finalApptsJson}_${finalPrescsJson}_${finalCompJson}_${finalVehJson}_${finalPerfJson}_${finalSchedJson}_${finalBankJson}_${finalCardJson}_${finalGrocJson}`;

      const generatedUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
      const nowStr = new Date().toLocaleString('pt-BR');

      // ALTERAÇÃO 1: Se a alteração veio da Google Sheets (hasAppChanges === false), Apenas atualizar a memória do aplicativo, NÃO gravar na planilha.
      if (!hasAppChanges) {
        console.log('=== [SYNC LOG - ALTERAÇÃO 1] Nenhuma alteração realizada pelo aplicativo. Memória local atualizada a partir do Google Sheets. Gravação na planilha ignorada. ===');
        setSpreadsheetUrl(generatedUrl);
        setLastSyncedTime(nowStr);
        localStorage.setItem('wealthflow_spreadsheet_url', generatedUrl);
        localStorage.setItem('wealthflow_last_synced_time', nowStr);
        localStorage.setItem('wealthflow_last_synced_timestamp', String(syncStartTime));
        await saveSyncTimestampToDb(syncStartTime);
        return;
      }

      if (import.meta.env.DEV) {
        console.log('=== [ETAPA 3] Conteúdo completo do txMap / cleanMergedTxs imediatamente antes de chamar sincronizarTudo() ===', cleanMergedTxs);
      }

      const stackTrace = new Error().stack || '';
      const formattedNow = new Date().toLocaleString('pt-BR');
      const totalCount = Array.isArray(cleanMergedTxs) ? cleanMergedTxs.length : 0;

      console.log('=========================');
      console.log(`ORIGEM: ${origem}`);
      console.log(`Quantidade de registros: ${totalCount}`);
      console.log(`Horário: ${formattedNow}`);
      if (import.meta.env.DEV) {
        console.log(`Call Stack completo:\n${stackTrace}`);
      }
      console.log('====================');

      // 3. Somente se houver alteração feita PELO APLICATIVO chamar sincronizarTudo()
      const url = await sheetsService.sincronizarTudo(
        activeToken, 
        sheetId, 
        cleanMergedTxs, 
        mergedInfracs,
        mergedZones,
        mergedAppts,
        mergedPrescs,
        mergedCompromissos,
        mergedVehicles,
        mergedPerfServices,
        mergedSchedServices,
        mergedBanks,
        mergedCards,
        categoryBudgets,
        [],
        mergedGroceryItems,
        forceOverwriteSpreadsheet,
        validSheetTxs.length,
        deletedIds,
        origem
      );
      
      setSpreadsheetUrl(url);
      setLastSyncedTime(nowStr);
      
      localStorage.setItem('wealthflow_spreadsheet_url', url);
      localStorage.setItem('wealthflow_last_synced_time', nowStr);
      localStorage.setItem('wealthflow_last_synced_timestamp', String(syncStartTime));
      if (deletedIds.length > 0) {
        localStorage.setItem('wealthflow_deleted_tx_ids', '[]');
      }
      await saveSyncTimestampToDb(syncStartTime);

      // Auto-clear pending changes queue after successful sync to Google Sheets
      setPendingChanges(prev => {
        const updated = prev.map(c => (c.status === 'PENDING' || c.status === 'SYNCING') ? { ...c, status: 'SYNCED' as const, error: undefined } : c);
        return updated;
      });
      setTimeout(() => {
        setPendingChanges(prev => prev.filter(c => c.status !== 'SYNCED'));
      }, 1500);
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido durante a sincronização.";
      const isAuthError = errMsg.includes("Sessão expirada") || errMsg.includes("401") || errMsg.includes("unauthorized") || errMsg.includes("expired");
      const errMsgStr = (errMsg || '').toString().toLowerCase();
      const isOfflineError = !navigator.onLine || errMsgStr.includes("failed to fetch") || errMsgStr.includes("network") || errMsgStr.includes("offline");
      
      if (isOfflineError) {
        console.log("Falha de conexão durante a sincronização. Dados salvos na fila local para envio automático ao reconectar.");
        localStorage.setItem('wealthflow_sync_queue', JSON.stringify({ timestamp: Date.now() }));
        setSyncError(null);
      } else if (isAuthError) {
        console.warn("Google Sync Warn (Auth/Session Expired): ", errMsg);
        setGoogleUser(null);
        setGoogleToken(null);
        setSpreadsheetUrl('');
        setLastSyncedTime('');
        localStorage.removeItem('wealthflow_spreadsheet_url');
        localStorage.removeItem('wealthflow_last_synced_time');
        setSyncError(null);
        showAlert("Reautenticação Necessária ⚠️", "Sua sessão do Google Drive expirou ou as credenciais são inválidas (Erro 401). Por favor, reautentique com o Google nas Configurações para continuar sincronizando.");
        authService.logout().catch(() => {});
      } else {
        console.error("Google Sync Error: ", err);
        setSyncError(errMsg);
      }
    } finally {
      setIsSyncing(false);
      syncLockRef.current = false;

      // If a sync was queued while we were syncing, run it now!
      if (syncPendingRef.current && pendingSyncParamsRef.current) {
        const params = pendingSyncParamsRef.current;
        syncPendingRef.current = false;
        pendingSyncParamsRef.current = null;
        triggerSync(
          params.tokenToUse,
          params.isBackground,
          params.overrideTxs,
          params.overrideInfracs,
          params.overrideZones,
          params.overrideAppts,
          params.overridePrescs,
          params.forceOverwriteSpreadsheet || false,
          params.overrideCompromissos,
          params.overrideVehicles,
          params.overridePerfServices,
          params.overrideSchedServices,
          params.overrideBanks,
          params.overrideCards,
          params.overrideGroceryItems,
          params.origem || 'triggerSync (Queued)'
        );
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleDriveModalOpen(true);
  };

  const handleConnectGoogleDrive = async (urlOrToken: string) => {
    let trimmed = urlOrToken.trim();

    // Auto-formatting if user pastes a raw Apps Script deployment ID like 'AKfycbx...'
    if (trimmed && !trimmed.startsWith('http') && !trimmed.includes('script.google.com') && !trimmed.includes('docs.google.com')) {
      if (trimmed.startsWith('AKfy')) {
        trimmed = `https://script.google.com/macros/s/${trimmed}/exec`;
      }
    }

    const finalVal = trimmed || 'wealthflow_direct_sheets_connected';

    // Store in localStorage IMMEDIATELY so link/ID is persisted
    if (finalVal.includes('script.google.com')) {
      localStorage.setItem('wealthflow_apps_script_url', finalVal);
    } else if (finalVal.includes('docs.google.com/spreadsheets/d/')) {
      localStorage.setItem('wealthflow_spreadsheet_url', finalVal);
    }
    localStorage.setItem('wealthflow_google_access_token', finalVal);

    setGoogleToken(finalVal);

    // Perform test request safely with timeout and null/empty handling
    let testData: any = null;

    try {
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ timeout: true }), 8000));
      const fetchPromise = (async () => {
        try {
          const sheetId = await sheetsService.obterOuCriarPlanilha(finalVal);
          if (sheetId && sheetId !== 'active_sheet') {
            localStorage.setItem('wealthflow_sheet_id', sheetId);
          }
          return await sheetsService.buscarTodosDados(finalVal, sheetId);
        } catch (e) {
          console.warn("Aviso ao buscar dados no Apps Script:", e);
          return null;
        }
      })();

      testData = await Promise.race([fetchPromise, timeoutPromise]);
    } catch (err) {
      console.warn("Conexão com o Apps Script falhou ou expirou tempo limite:", err);
    }

    // Set auth state so user remains connected
    const result = await authService.googleSignIn(finalVal);
    if (result) {
      setGoogleUser(result.user);
      setGoogleToken(result.token);
    } else {
      setGoogleUser({
        displayName: 'Google Apps Script Conectado',
        email: 'appsscript@wealthflow.app',
        photoURL: ''
      });
    }

    let importedCount = 0;
    if (testData && typeof testData === 'object' && !(testData as any).timeout) {
      const tdAny = testData as any;
      const testRawTxs = Array.isArray(tdAny?.data?.transactions)
        ? tdAny.data.transactions
        : Array.isArray(tdAny?.transactions)
          ? tdAny.transactions
          : Array.isArray(tdAny?.data)
            ? tdAny.data
            : Array.isArray(tdAny)
              ? tdAny
              : [];

      if (testRawTxs.length > 0) {
        const cleanList = cleanDuplicateTransactions(testRawTxs);
        await handleImportTransactions(cleanList);
        importedCount = cleanList.length;
      }

      if (Array.isArray(tdAny.riskZones) && tdAny.riskZones.length > 0) {
        setRiskZones(tdAny.riskZones);
        localStorage.setItem('wealthflow_riskzones', JSON.stringify(tdAny.riskZones));
      }
      if (Array.isArray(tdAny.appointments) && tdAny.appointments.length > 0) {
        setAppointments(tdAny.appointments);
        localStorage.setItem('wealthflow_appointments', JSON.stringify(tdAny.appointments));
      }
      if (Array.isArray(tdAny.prescriptions) && tdAny.prescriptions.length > 0) {
        setPrescriptions(tdAny.prescriptions);
        localStorage.setItem('wealthflow_prescriptions', JSON.stringify(tdAny.prescriptions));
      }
      if (Array.isArray(tdAny.compromissos) && tdAny.compromissos.length > 0) {
        setCompromissos(tdAny.compromissos);
        localStorage.setItem('wealthflow_compromissos', JSON.stringify(tdAny.compromissos));
      }
      if (Array.isArray(tdAny.registeredVehicles) && tdAny.registeredVehicles.length > 0) {
        const safeVehs = tdAny.registeredVehicles.filter(Boolean).map((v: any) => ({
          ...v,
          descricao: (v.descricao || v.modelo || v.nome || '').toString().toUpperCase(),
          placa: (v.placa || '').toString().toUpperCase(),
          motorista: (v.motorista || '').toString().toUpperCase(),
          marca: (v.marca || '').toString().toUpperCase(),
          modelo: (v.modelo || '').toString().toUpperCase()
        }));
        setRegisteredVehicles(safeVehs);
        localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(safeVehs));
      }
      if (Array.isArray(tdAny.performedServices) && tdAny.performedServices.length > 0) {
        setPerformedServices(tdAny.performedServices);
        localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(tdAny.performedServices));
      }
      if (Array.isArray(tdAny.scheduledServices) && tdAny.scheduledServices.length > 0) {
        setScheduledServices(tdAny.scheduledServices);
        localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(tdAny.scheduledServices));
      }
      if (Array.isArray(tdAny.groceryItems) && tdAny.groceryItems.length > 0) {
        setGroceryItems(tdAny.groceryItems);
        localStorage.setItem('wealthflow_grocery_items', JSON.stringify(tdAny.groceryItems));
      }
    }

    const nowStr = new Date().toLocaleString('pt-BR');
    setLastSyncedTime(nowStr);
    localStorage.setItem('wealthflow_last_synced_time', nowStr);
    setSyncError(null);

    const msg = importedCount > 0
      ? `Conectado com sucesso à planilha! ${importedCount} lançamentos e abas sincronizados.`
      : `Link da planilha salvo no localStorage e vinculado com sucesso! Pronto para sincronizar.`;

    showAlert("Sincronizado com Sucesso 📊", msg);
    setIsGoogleDriveModalOpen(false);
  };

  const handleGoogleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.error(e);
    }
    setGoogleUser(null);
    setGoogleToken(null);
    setSpreadsheetUrl('');
    setLastSyncedTime('');
    localStorage.removeItem('wealthflow_spreadsheet_url');
    localStorage.removeItem('wealthflow_apps_script_url');
    localStorage.removeItem('wealthflow_google_access_token');
    localStorage.removeItem('wealthflow_last_synced_time');
  };

  const handleToggleAutoSync = (checked: boolean) => {
    setAutoSync(checked);
    localStorage.setItem('wealthflow_auto_sync', String(checked));
  };

  const triggerImport = async () => {
    let activeToken = googleToken || 
                      localStorage.getItem('wealthflow_apps_script_url') || 
                      localStorage.getItem('wealthflow_spreadsheet_url') || 
                      localStorage.getItem('wealthflow_google_access_token');
    if (!activeToken) {
      setIsGoogleDriveModalOpen(true);
      return;
    }

    setIsImporting(true);
    setSyncError(null);
    try {
      const sheetId = await sheetsService.obterOuCriarPlanilha(activeToken);
      const sheetData = await sheetsService.buscarTodosDados(activeToken, sheetId);

      let importedTxCount = 0;
      const sdImportAny = sheetData as any;
      const importRawTxs = Array.isArray(sdImportAny?.data?.transactions)
        ? sdImportAny.data.transactions
        : Array.isArray(sdImportAny?.transactions)
          ? sdImportAny.transactions
          : Array.isArray(sdImportAny?.data)
            ? sdImportAny.data
            : Array.isArray(sdImportAny)
              ? sdImportAny
              : [];
      if (importRawTxs.length > 0) {
        const cleanList = cleanDuplicateTransactions(importRawTxs);
        await handleImportTransactions(cleanList);
        importedTxCount = cleanList.length;
      }

      if (sheetData && Array.isArray(sheetData.riskZones) && sheetData.riskZones.length > 0) {
        setRiskZones(sheetData.riskZones);
        localStorage.setItem('wealthflow_riskzones', JSON.stringify(sheetData.riskZones));
      }
      if (sheetData && Array.isArray(sheetData.appointments) && sheetData.appointments.length > 0) {
        setAppointments(sheetData.appointments);
        localStorage.setItem('wealthflow_appointments', JSON.stringify(sheetData.appointments));
      }
      if (sheetData && Array.isArray(sheetData.prescriptions) && sheetData.prescriptions.length > 0) {
        setPrescriptions(sheetData.prescriptions);
        localStorage.setItem('wealthflow_prescriptions', JSON.stringify(sheetData.prescriptions));
      }
      if (sheetData && Array.isArray(sheetData.compromissos) && sheetData.compromissos.length > 0) {
        setCompromissos(sheetData.compromissos);
        localStorage.setItem('wealthflow_compromissos', JSON.stringify(sheetData.compromissos));
      }
      if (sheetData && Array.isArray(sheetData.registeredVehicles) && sheetData.registeredVehicles.length > 0) {
        const safeVehs = sheetData.registeredVehicles.filter(Boolean).map((v: any) => ({
          ...v,
          descricao: (v.descricao || v.modelo || v.nome || '').toString().toUpperCase(),
          placa: (v.placa || '').toString().toUpperCase(),
          motorista: (v.motorista || '').toString().toUpperCase(),
          marca: (v.marca || '').toString().toUpperCase(),
          modelo: (v.modelo || '').toString().toUpperCase()
        }));
        setRegisteredVehicles(safeVehs);
        localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(safeVehs));
      }
      if (sheetData && Array.isArray(sheetData.performedServices) && sheetData.performedServices.length > 0) {
        setPerformedServices(sheetData.performedServices);
        localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(sheetData.performedServices));
      }
      if (sheetData && Array.isArray(sheetData.scheduledServices) && sheetData.scheduledServices.length > 0) {
        setScheduledServices(sheetData.scheduledServices);
        localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(sheetData.scheduledServices));
      }
      if (sheetData && sheetData.categoryBudgets && typeof sheetData.categoryBudgets === 'object' && Object.keys(sheetData.categoryBudgets).length > 0) {
        setCategoryBudgets(sheetData.categoryBudgets as Record<string, number>);
        localStorage.setItem('wealthflow_category_budgets', JSON.stringify(sheetData.categoryBudgets));
      }

      showAlert("Sincronizado com Sucesso 📊", `Sincronização realizada com sucesso! ${importedTxCount} lançamentos e abas da planilha foram atualizados.`);
      
      const nowStr = new Date().toLocaleString('pt-BR');
      setLastSyncedTime(nowStr);
      localStorage.setItem('wealthflow_last_synced_time', nowStr);
      localStorage.setItem('wealthflow_last_synced_timestamp', String(Date.now()));
    } catch (err: any) {
      const errMsg = err.message || "Erro desconhecido durante a importação.";
      const isAuthError = errMsg.includes("Sessão expirada") || errMsg.includes("401") || errMsg.includes("unauthorized") || errMsg.includes("expired");
      
      if (isAuthError) {
        console.warn("Google Import Warn (Auth/Session Expired): ", errMsg);
        setGoogleUser(null);
        setGoogleToken(null);
        setSpreadsheetUrl('');
        setLastSyncedTime('');
        localStorage.removeItem('wealthflow_spreadsheet_url');
        localStorage.removeItem('wealthflow_last_synced_time');
        setSyncError(null);
        showAlert("Sessão Expirada ⚠️", "Por favor, conecte sua conta do Google Drive novamente para renovar o acesso.");
        authService.logout().catch(() => {});
      } else {
        console.error("Google Import Error: ", err);
        setSyncError(errMsg);
        showAlert("Erro na Sincronização ⚠️", `Não foi possível ler os dados mais recentes da planilha:\n${errMsg}`);
      }
    } finally {
      setIsImporting(false);
    }
  };

  // Time state for mobile bar
  const [timeStr, setTimeStr] = useState<string>('12:34');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Shared handlers
  const handleAddTransaction = async (newTx: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => {
    const activeToken = googleToken || 
                        localStorage.getItem('wealthflow_apps_script_url') || 
                        localStorage.getItem('wealthflow_spreadsheet_url') || 
                        localStorage.getItem('wealthflow_google_access_token');

    // Update bank account balances if bancoId is set
    const txsList = Array.isArray(newTx) ? newTx : [newTx];
    setBankAccountsState(prevBanks => {
      let updated = [...prevBanks];
      let changed = false;
      for (const tx of txsList) {
        if (tx.bancoId) {
          const val = Number(tx.valor) || 0;
          const isIncome = tx.tipo === 'RECEITA';
          updated = updated.map(b => {
            if (b.id === tx.bancoId) {
              changed = true;
              return {
                ...b,
                saldoInicial: isIncome ? b.saldoInicial + val : b.saldoInicial - val
              };
            }
            return b;
          });
        }
      }
      return changed ? updated : prevBanks;
    });

    if (Array.isArray(newTx)) {
      let currentTransactions = [...transactions];
      const addedObjects: Transaction[] = [];
      for (const tx of newTx) {
        const id = currentTransactions.length ? Math.max(...currentTransactions.map(t => t.id)) + 1 : 1;
        const txObj = { id, ...tx, updatedAt: Date.now() };
        currentTransactions = [txObj, ...currentTransactions];
        addedObjects.push(txObj);
      }
      setTransactions(currentTransactions);
      
      await runTrackedSync('Adição de Lançamentos', `${addedObjects.length} Lançamentos`, async () => {
        for (const txObj of addedObjects) {
          await saveTransactionToDb(txObj);
        }
        if (activeToken) {
          await triggerSync(activeToken, true, currentTransactions, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'handleAddTransactionMultiple');
        }
      });
    } else {
      const id = transactions.length ? Math.max(...transactions.map(t => t.id)) + 1 : 1;
      const txObj = { id, ...newTx, updatedAt: Date.now() };
      const updated = [txObj, ...transactions];
      setTransactions(updated);

      await runTrackedSync('Adição de Lançamento', `${txObj.descricao || 'Lançamento'} (R$ ${txObj.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, async () => {
        await saveTransactionToDb(txObj);
        if (activeToken) {
          await triggerSync(activeToken, true, updated, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'handleAddTransaction');
        }
      });
    }
  };

  const handleEditTransaction = async (id: number, updatedFields: Partial<Transaction>) => {
    const activeToken = googleToken || 
                        localStorage.getItem('wealthflow_apps_script_url') || 
                        localStorage.getItem('wealthflow_spreadsheet_url') || 
                        localStorage.getItem('wealthflow_google_access_token');

    const updated = transactions.map(t => t.id === id ? { ...t, ...updatedFields, updatedAt: Date.now() } : t);
    setTransactions(updated);
    const item = updated.find(t => t.id === id);

    await runTrackedSync('Edição de Lançamento', `${item?.descricao || 'Lançamento'} (R$ ${item?.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, async () => {
      if (item) {
        await saveTransactionToDb(item);
      }
      if (activeToken) {
        await triggerSync(activeToken, true, updated, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'handleEditTransaction');
      }
    });
  };

  const handleDeleteTransaction = async (id: number) => {
    const activeToken = googleToken || 
                        localStorage.getItem('wealthflow_apps_script_url') || 
                        localStorage.getItem('wealthflow_spreadsheet_url') || 
                        localStorage.getItem('wealthflow_google_access_token');

    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    localStorage.setItem('wealthflow_transactions', JSON.stringify(updated));
    
    // Track deleted transaction ID to prevent two-way sync from re-importing it
    try {
      const deletedIdsStr = localStorage.getItem('wealthflow_deleted_tx_ids') || '[]';
      const deletedIds: number[] = JSON.parse(deletedIdsStr);
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('wealthflow_deleted_tx_ids', JSON.stringify(deletedIds));
      }
    } catch (e) {}

    const txToDelete = transactions.find(t => t.id === id);
    const txDesc = txToDelete ? `${txToDelete.descricao} (R$ ${txToDelete.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : `ID #${id}`;

    await runTrackedSync('Remoção de Lançamento', txDesc, async () => {
      await deleteTransactionFromDb(id);
      if (activeToken) {
        await triggerSync(activeToken, true, updated, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'handleDeleteTransaction');
      }
    });
  };

  const handleImportTransactions = async (importedTxs: Transaction[]) => {
    const txMap = new Map<number, Transaction>();
    transactions.forEach(t => txMap.set(t.id, t));
    importedTxs.forEach(t => txMap.set(t.id, t));
    
    const merged = Array.from(txMap.values()).sort((a, b) => b.id - a.id);
    setTransactions(merged);
    localStorage.setItem('wealthflow_transactions', JSON.stringify(merged));
    
    for (const t of importedTxs) {
      await runTrackedSync('Importação de Lançamento', `${t.descricao} (R$ ${t.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`, () => saveTransactionToDb(t));
    }
  };

  const handleWipeTransactions = async () => {
    showConfirm(
      "⚠️ ATENÇÃO - OPERAÇÃO IRREVERSÍVEL",
      "Isso irá APAGAR COMPLETAMENTE todos os lançamentos financeiros (planilha finanças) do aplicativo. Deseja realmente continuar?",
      async () => {
        try {
          setTransactions([]);
          localStorage.removeItem('wealthflow_transactions');
          localStorage.removeItem('wealthflow_deleted_tx_ids');
          localStorage.removeItem('wealthflow_last_synced_timestamp');
          
          const activeToken = getEffectiveGoogleToken();
          if (activeToken) {
            await triggerSync(activeToken, true, [], undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'handleWipeTransactions');
          }

          showAlert("Sucesso", "Planilha de finanças limpa completamente do aplicativo!");
        } catch (error: any) {
          console.error(error);
          showAlert("Erro", `Erro ao limpar transações: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexTransactions = async () => {
    if (!transactions.length) {
      showAlert("Sem Lançamentos", "Não há lançamentos para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Lançamentos",
      "Deseja realmente renumerar e ordenar todos os lançamentos financeiros? Isso organizará os registros de forma cronológica e reatribuirá os IDs sequencialmente a partir de #1 (sem deixar furos de numeração).",
      async () => {
        try {
          setIsSyncing(true);
          
          // Helper to parse date
          const parseTxDateLocal = (dateStr: string): Date => {
            if (!dateStr) return new Date(0);
            const raw = String(dateStr).trim().replace(/^["']|["']$/g, '');
            const str = raw.split(' ')[0].split('T')[0].trim();
            if (str.includes('/')) {
              const parts = str.split('/');
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                let year = parseInt(parts[2], 10);
                if (year < 100) year += 2000;
                const d = new Date(year, month, day);
                d.setHours(0, 0, 0, 0);
                return d;
              }
            } else if (str.includes('-')) {
              const parts = str.split('-');
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                  d.setHours(0, 0, 0, 0);
                  return d;
                } else {
                  let year = parseInt(parts[2], 10);
                  if (year < 100) year += 2000;
                  const d = new Date(year, parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                  d.setHours(0, 0, 0, 0);
                  return d;
                }
              }
            }
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
              d.setHours(0, 0, 0, 0);
              return d;
            }
            return new Date(0);
          };

          // Sort chronologically (oldest to newest)
          const sorted = [...transactions].sort((a, b) => {
            const timeA = parseTxDateLocal(a.data).getTime();
            const timeB = parseTxDateLocal(b.data).getTime();
            if (timeA !== timeB) return timeA - timeB;
            return a.id - b.id; // stable tie-breaker
          });

          // Assign new IDs from 1 to N
          const reindexed = sorted.map((t, index) => {
            const newId = index + 1;
            return {
              ...t,
              id: newId,
              updatedAt: Date.now()
            };
          });

          // Save new IDs
          for (const tx of reindexed) {
            await saveTransactionToDb(tx);
          }

          // Update local state and localStorage
          setTransactions(reindexed);
          localStorage.setItem('wealthflow_transactions', JSON.stringify(reindexed));
          localStorage.removeItem('wealthflow_deleted_tx_ids'); // Reset deletions because IDs are recalculated

          setIsSyncing(false);
          showAlert("Sucesso", `Todos os ${reindexed.length} lançamentos foram reordenados e renumerados a partir de #1 com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, reindexed, undefined, undefined, undefined, undefined, true);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar transações:", error);
          showAlert("Erro", `Não foi possível renumerar as transações: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexRiskZones = async () => {
    if (!riskZones.length) {
      showAlert("Sem Registros", "Não há zonas de risco para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Zonas de Risco",
      "Deseja realmente renumerar e organizar todas as zonas de risco? Os IDs serão organizados sequencialmente a partir de #1.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...riskZones].sort((a, b) => a.id - b.id);

          const reindexed = sorted.map((z, index) => ({
            ...z,
            id: index + 1,
            updatedAt: Date.now()
          }));

          for (const zone of reindexed) {
            await saveRiskZoneToDb(zone);
          }

          setRiskZones(reindexed);
          localStorage.setItem('wealthflow_risk_zones', JSON.stringify(reindexed));
          setIsSyncing(false);
          showAlert("Sucesso", `Todas as ${reindexed.length} zonas de risco foram reordenadas e renumeradas com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, undefined, undefined, reindexed);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar zonas de risco:", error);
          showAlert("Erro", `Não foi possível renumerar as zonas de risco: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexAppointments = async () => {
    if (!appointments.length) {
      showAlert("Sem Registros", "Não há consultas médicas para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Consultas",
      "Deseja realmente renumerar todas as consultas médicas? Elas serão organizadas em ordem cronológica e receberão novos IDs sequenciais a partir de #1.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...appointments].sort((a, b) => {
            const dateCompare = a.data.localeCompare(b.data);
            if (dateCompare !== 0) return dateCompare;
            return a.hora.localeCompare(b.hora);
          });

          const reindexed = sorted.map((appt, index) => ({
            ...appt,
            id: String(index + 1),
            updatedAt: Date.now()
          }));

          for (const appt of reindexed) {
            await saveMedicalAppointmentToDb(appt);
          }

          setAppointments(reindexed);
          localStorage.setItem('wealthflow_appointments', JSON.stringify(reindexed));
          setIsSyncing(false);
          showAlert("Sucesso", `Todas as ${reindexed.length} consultas foram reordenadas e renumeradas com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, undefined, undefined, undefined, reindexed);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar consultas:", error);
          showAlert("Erro", `Não foi possível renumerar as consultas: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexPrescriptions = async () => {
    if (!prescriptions.length) {
      showAlert("Sem Registros", "Não há receitas médicas para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Receitas Médicas",
      "Deseja realmente renumerar todas as receitas médicas? Elas receberão novos IDs sequenciais a partir de #1.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...prescriptions];

          const reindexed = sorted.map((presc, index) => ({
            ...presc,
            id: String(index + 1),
            updatedAt: Date.now()
          }));

          for (const presc of reindexed) {
            await saveMedicalPrescriptionToDb(presc);
          }

          setPrescriptions(reindexed);
          localStorage.setItem('wealthflow_prescriptions', JSON.stringify(reindexed));
          setIsSyncing(false);
          showAlert("Sucesso", `Todas as ${reindexed.length} receitas médicas foram renumeradas com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, undefined, undefined, undefined, undefined, reindexed);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar receitas médicas:", error);
          showAlert("Erro", `Não foi possível renumerar as receitas médicas: ${error.message || error}`);
        }
      }
    );
  };

  const handleAddVehicle = async (vehicle: RegisteredVehicle) => {
    const updated = [vehicle, ...registeredVehicles];
    setRegisteredVehicles(updated);
    localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(updated));
    try {
      await runTrackedSync('Cadastro de Veículo', vehicle.descricao || vehicle.modelo || 'Novo Veículo', async () => {
        await saveRegisteredVehicleToDb(vehicle);
      });
    } catch (e) {
      console.error('Erro ao salvar veículo no DB:', e);
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, updated);
    }
  };

  const handleEditVehicle = async (id: string, updatedFields: Partial<RegisteredVehicle>) => {
    const updated = registeredVehicles.map(v => String(v.id) === String(id) ? { ...v, ...updatedFields, id: v.id } : v);
    setRegisteredVehicles(updated);
    localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(updated));
    const item = updated.find(v => String(v.id) === String(id));
    if (item) {
      try {
        await runTrackedSync('Edição de Veículo', item.descricao || item.modelo || 'Veículo', async () => {
          await saveRegisteredVehicleToDb(item);
        });
      } catch (e) {
        console.error('Erro ao atualizar veículo no DB:', e);
      }
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, updated);
    }
  };

  const handleDeleteVehicle = async (id: string) => {
    const updated = registeredVehicles.filter(v => String(v.id) !== String(id));
    setRegisteredVehicles(updated);
    localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(updated));
    try {
      await runTrackedSync('Exclusão de Veículo', `ID #${id}`, async () => {
        await deleteRegisteredVehicleFromDb(id);
      });
    } catch (e) {
      console.error('Erro ao excluir veículo no DB:', e);
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, updated);
    }
  };

  const handleReindexVehicles = async () => {
    if (!registeredVehicles.length) {
      showAlert("Sem Registros", "Não há veículos cadastrados para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Veículos",
      "Deseja realmente renumerar os veículos cadastrados? Eles receberão novos IDs sequenciais a partir de #1.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...registeredVehicles];

          const reindexed = sorted.map((vehicle, index) => ({
            ...vehicle,
            id: String(index + 1)
          }));

          for (const vehicle of reindexed) {
            await saveRegisteredVehicleToDb(vehicle);
          }

          setRegisteredVehicles(reindexed);
          localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(reindexed));
          setIsSyncing(false);
          showAlert("Sucesso", `Todos os ${reindexed.length} veículos foram renumerados com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, reindexed);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar veículos:", error);
          showAlert("Erro", `Não foi possível renumerar os veículos: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexPerformedServices = async () => {
    if (!performedServices.length) {
      showAlert("Sem Registros", "Não há serviços realizados para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Serviços Realizados",
      "Deseja realmente renumerar os serviços realizados? Eles serão organizados em ordem cronológica e receberão novos IDs sequenciais a partir de #1.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...performedServices].sort((a, b) => a.data.localeCompare(b.data));

          const reindexed = sorted.map((service, index) => ({
            ...service,
            id: `p${index + 1}`,
            updatedAt: Date.now()
          }));

          for (const service of reindexed) {
            await savePerformedServiceToDb(service);
          }

          setPerformedServices(reindexed);
          localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(reindexed));
          setIsSyncing(false);
          showAlert("Sucesso", `Todos os ${reindexed.length} serviços realizados foram reordenados e renumerados com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, reindexed);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar serviços realizados:", error);
          showAlert("Erro", `Não foi possível renumerar os serviços realizados: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexScheduledServices = async () => {
    if (!scheduledServices.length) {
      showAlert("Sem Registros", "Não há serviços agendados para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Cronograma de Oficina",
      "Deseja realmente renumerar os agendamentos da oficina? Eles serão organizados em ordem cronológica e receberão novos IDs sequenciais a partir de #1.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...scheduledServices].sort((a, b) => {
            const dateA = a.dataAlvo || '9999-12-31';
            const dateB = b.dataAlvo || '9999-12-31';
            return dateA.localeCompare(dateB);
          });

          const reindexed = sorted.map((service, index) => ({
            ...service,
            id: `s${index + 1}`,
            updatedAt: Date.now()
          }));

          for (const service of reindexed) {
            await saveScheduledServiceToDb(service);
          }

          setScheduledServices(reindexed);
          localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(reindexed));
          setIsSyncing(false);
          showAlert("Sucesso", `Todos os ${reindexed.length} agendamentos da oficina foram reordenados e renumerados com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, reindexed);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar agendamentos da oficina:", error);
          showAlert("Erro", `Não foi possível renumerar os agendamentos da oficina: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexBankAccounts = async () => {
    if (!bankAccountsState.length) {
      showAlert("Sem Registros", "Não há contas bancárias cadastradas para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Contas Bancárias",
      "Deseja realmente renumerar as contas bancárias cadastradas? Isso organizará os IDs de forma sequencial a partir de #1 e atualizará automaticamente todas as referências nos lançamentos financeiros.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...bankAccountsState].sort((a, b) => a.id - b.id);

          const idMap: { [oldId: number]: number } = {};
          const reindexed = sorted.map((acc, index) => {
            const newId = index + 1;
            idMap[acc.id] = newId;
            return { ...acc, id: newId };
          });

          let hasUpdatedTxs = false;
          const updatedTransactions = transactions.map(t => {
            let updated = false;
            let newBancoId = t.bancoId;
            let newDestBancoId = t.destBancoId;

            if (t.bancoId !== undefined && idMap[t.bancoId] && t.bancoId !== idMap[t.bancoId]) {
              newBancoId = idMap[t.bancoId];
              updated = true;
            }
            if (t.destBancoId !== undefined && idMap[t.destBancoId] && t.destBancoId !== idMap[t.destBancoId]) {
              newDestBancoId = idMap[t.destBancoId];
              updated = true;
            }

            if (updated) {
              hasUpdatedTxs = true;
              return { ...t, bancoId: newBancoId, destBancoId: newDestBancoId, updatedAt: Date.now() };
            }
            return t;
          });

          setBankAccountsState(reindexed);
          localStorage.setItem('wealthflow_bank_accounts', JSON.stringify(reindexed));

          if (hasUpdatedTxs) {
            for (const tx of updatedTransactions) {
              await saveTransactionToDb(tx);
            }

            setTransactions(updatedTransactions);
            localStorage.setItem('wealthflow_transactions', JSON.stringify(updatedTransactions));
          }

          setIsSyncing(false);
          showAlert("Sucesso", `Todas as ${reindexed.length} contas bancárias foram renumeradas e sincronizadas com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(
              syncToken, 
              true, 
              hasUpdatedTxs ? updatedTransactions : undefined, 
              undefined, 
              undefined, 
              undefined, 
              undefined, 
              true, 
              undefined, 
              undefined, 
              undefined, 
              undefined, 
              reindexed
            );
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar contas bancárias:", error);
          showAlert("Erro", `Não foi possível renumerar as contas bancárias: ${error.message || error}`);
        }
      }
    );
  };

  const handleReindexCreditCards = async () => {
    if (!creditCardsState.length) {
      showAlert("Sem Registros", "Não há cartões de crédito para renumerar.");
      return;
    }

    showConfirm(
      "Renumerar Cartões de Crédito",
      "Deseja realmente renumerar os cartões de crédito? Os IDs serão organizados sequencialmente a partir de #1.",
      async () => {
        try {
          setIsSyncing(true);
          const sorted = [...creditCardsState].sort((a, b) => a.id - b.id);

          const reindexed = sorted.map((card, index) => ({
            ...card,
            id: index + 1
          }));

          setCreditCardsState(reindexed);
          localStorage.setItem('wealthflow_credit_cards', JSON.stringify(reindexed));
          setIsSyncing(false);
          showAlert("Sucesso", `Todos os ${reindexed.length} cartões de crédito foram renumerados com sucesso!`);

          const syncToken = getEffectiveGoogleToken();
          if (syncToken) {
            await triggerSync(syncToken, true, undefined, undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, reindexed);
          }
        } catch (error: any) {
          setIsSyncing(false);
          console.error("Erro ao renumerar cartões de crédito:", error);
          showAlert("Erro", `Não foi possível renumerar os cartões de crédito: ${error.message || error}`);
        }
      }
    );
  };

  const handleAddRiskZone = async (newZone: Omit<RiskZone, 'id'>) => {
    const id = riskZones.length ? Math.max(...riskZones.map(z => z.id)) + 1 : 1;
    const zoneObj = { id, ...newZone };
    const updated = [zoneObj, ...riskZones];
    setRiskZones(updated);
    await runTrackedSync('Nova Zona de Risco', `${zoneObj.nomeLocal} - Risco: ${zoneObj.nivelRisco}`, () => saveRiskZoneToDb(zoneObj));
    const syncToken = getEffectiveGoogleToken();
    if (syncToken) {
      triggerSync(syncToken, true, undefined, undefined, updated);
    }
  };

  const handleEditRiskZone = async (id: number, updatedFields: Partial<RiskZone>) => {
    const updated = riskZones.map(z => z.id === id ? { ...z, ...updatedFields } : z);
    setRiskZones(updated);
    const item = updated.find(z => z.id === id);
    if (item) {
      await runTrackedSync('Edição de Zona de Risco', `${item.nomeLocal}`, () => saveRiskZoneToDb(item));
    }
    const syncToken = getEffectiveGoogleToken();
    if (syncToken) {
      triggerSync(syncToken, true, undefined, undefined, updated);
    }
  };

  const handleDeleteRiskZone = async (id: number) => {
    const updated = riskZones.filter(z => z.id !== id);
    setRiskZones(updated);
    const zoneToDelete = riskZones.find(z => z.id === id);
    const zoneName = zoneToDelete ? zoneToDelete.nomeLocal : `ID #${id}`;
    await runTrackedSync('Remoção de Zona de Risco', zoneName, () => deleteRiskZoneFromDb(id));
    const syncToken = getEffectiveGoogleToken();
    if (syncToken) {
      triggerSync(syncToken, true, undefined, undefined, updated);
    }
  };

  const handleToggleZoneActive = async (id: number) => {
    const updated = riskZones.map(z => z.id === id ? { ...z, ativo: !z.ativo } : z);
    setRiskZones(updated);
    const item = updated.find(z => z.id === id);
    if (item) {
      await runTrackedSync('Alteração de Status de Zona de Risco', `${item.nomeLocal} (${item.ativo ? 'Ativado' : 'Desativado'})`, () => saveRiskZoneToDb(item));
    }
    const syncToken = getEffectiveGoogleToken();
    if (syncToken) {
      triggerSync(syncToken, true, undefined, undefined, updated);
    }
  };

  const handleAddAppealedInfraction = async (newAppeal: Infraction) => {
    const updatedInfs = [newAppeal, ...infractions];
    setInfractions(updatedInfs);
    await saveInfractionToDb(newAppeal);
    // remove from unappealed queue
    const updatedNonAppealed = nonAppealed.filter(n => n.protocolo !== newAppeal.protocolo);
    setNonAppealed(updatedNonAppealed);
    await deleteNonAppealedFromDb(newAppeal.id);
    const syncToken = getEffectiveGoogleToken();
    if (syncToken) {
      triggerSync(syncToken, true, undefined, updatedInfs);
    }
  };

  const handleDeleteInfraction = async (id: string) => {
    const updated = infractions.filter(i => i.id !== id);
    setInfractions(updated);
    await deleteInfractionFromDb(id);
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, updated);
    }
  };

  const handleAvatarChange = async (url: string) => {
    setAvatarUrl(url);
    await saveAvatarUrlToDb(url);
  };

  const handleAddAppointment = async (newAppt: Omit<MedicalAppointment, 'id'>) => {
    const id = Date.now().toString();
    const apptObj = { id, ...newAppt, updatedAt: Date.now() };
    const updated = [...appointments, apptObj].sort((a, b) => {
      const dateTimeA = `${a.data}T${a.hora}`;
      const dateTimeB = `${b.data}T${b.hora}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
    setAppointments(updated);
    try {
      await saveMedicalAppointmentToDb(apptObj);
    } catch (error) {
      console.error("Error saving medical appointment:", error);
      showAlert?.(
        'Aviso de Conexão',
        'Sua consulta foi agendada localmente, mas não pôde ser salva na nuvem. Verifique sua conexão com a internet.'
      );
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, updated, undefined, true);
    }
  };

  const handleEditAppointment = async (id: string, updatedFields: Partial<MedicalAppointment>) => {
    const updated = appointments.map(appt => appt.id === id ? { ...appt, ...updatedFields, updatedAt: Date.now() } : appt);
    setAppointments(updated);
    localStorage.setItem('wealthflow_appointments', JSON.stringify(updated));
    const item = updated.find(appt => appt.id === id);
    if (item) {
      try {
        await saveMedicalAppointmentToDb(item);
      } catch (error) {
        console.error("Error updating medical appointment:", error);
        showAlert?.(
          'Aviso de Conexão',
          'Suas alterações foram aplicadas localmente, mas não puderam ser salvas na nuvem. Verifique sua conexão.'
        );
      }
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, updated, undefined, true);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const backup = [...appointments];
    const updated = appointments.filter(appt => appt.id !== id);
    setAppointments(updated);
    localStorage.setItem('wealthflow_appointments', JSON.stringify(updated));
    try {
      await deleteMedicalAppointmentFromDb(id);
      const activeToken = getEffectiveGoogleToken();
      if (activeToken) {
        triggerSync(activeToken, true, undefined, undefined, undefined, updated, undefined, true);
      }
    } catch (error) {
      console.error("Error deleting medical appointment:", error);
      setAppointments(backup);
      showAlert?.(
        'Erro de Remoção',
        'Não foi possível remover o agendamento na nuvem. Verifique sua conexão e tente novamente.'
      );
    }
  };

  const handleAddCompromisso = async (newComp: Omit<Compromisso, 'id'>) => {
    const id = Date.now().toString();
    const compObj = { id, ...newComp, updatedAt: Date.now() };
    const updated = [...compromissos, compObj].sort((a, b) => {
      const dateTimeA = `${a.data}T${a.hora || '00:00'}`;
      const dateTimeB = `${b.data}T${b.hora || '00:00'}`;
      return dateTimeA.localeCompare(dateTimeB);
    });
    setCompromissos(updated);
    localStorage.setItem('wealthflow_compromissos', JSON.stringify(updated));
    try {
      await runTrackedSync('Novo Compromisso', `${compObj.titulo} (${compObj.data})`, () => saveCompromissoToDb(compObj));
    } catch (error) {
      console.error("Error saving compromisso:", error);
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, updated);
    }
  };

  const handleEditCompromisso = async (id: string, updatedFields: Partial<Compromisso>) => {
    const updated = compromissos.map(comp => comp.id === id ? { ...comp, ...updatedFields, updatedAt: Date.now() } : comp);
    setCompromissos(updated);
    localStorage.setItem('wealthflow_compromissos', JSON.stringify(updated));
    const item = updated.find(comp => comp.id === id);
    if (item) {
      try {
        await runTrackedSync('Edição de Compromisso', `${item.titulo} (${item.data})`, () => saveCompromissoToDb(item));
      } catch (error) {
        console.error("Error updating compromisso:", error);
      }
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, updated);
    }
  };

  const handleDeleteCompromisso = async (id: string) => {
    const backup = [...compromissos];
    const updated = compromissos.filter(comp => comp.id !== id);
    setCompromissos(updated);
    localStorage.setItem('wealthflow_compromissos', JSON.stringify(updated));
    try {
      const compToDelete = compromissos.find(c => c.id === id);
      const compName = compToDelete ? compToDelete.titulo : `ID #${id}`;
      await runTrackedSync('Remoção de Compromisso', compName, () => deleteCompromissoFromDb(id));
    } catch (error) {
      console.error("Error deleting compromisso:", error);
      setCompromissos(backup);
      localStorage.setItem('wealthflow_compromissos', JSON.stringify(backup));
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, true, updated);
    }
  };

  const handleAddPerformedService = async (newService: Omit<CarServicePerformed, 'id'>) => {
    const id = Date.now().toString();
    const serviceObj = { id, ...newService, updatedAt: Date.now() };
    const updated = [serviceObj, ...performedServices];
    setPerformedServices(updated);
    localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(updated));
    try {
      await runTrackedSync('Novo Serviço Realizado', `${serviceObj.descricao} (${serviceObj.data})`, () => savePerformedServiceToDb(serviceObj));
    } catch (error) {
      console.error("Error saving performed service:", error);
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, updated);
    }
  };

  const handleEditPerformedService = async (id: string, updatedFields: Partial<CarServicePerformed>) => {
    const updated = performedServices.map(s => String(s.id) === String(id) ? { ...s, ...updatedFields, id: s.id, updatedAt: Date.now() } : s);
    setPerformedServices(updated);
    localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(updated));
    const item = updated.find(s => String(s.id) === String(id));
    if (item) {
      try {
        await runTrackedSync('Edição de Serviço Realizado', `${item.descricao}`, () => savePerformedServiceToDb(item));
      } catch (error) {
        console.error("Error updating performed service:", error);
      }
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, updated);
    }
  };

  const handleDeletePerformedService = async (id: string) => {
    const backup = [...performedServices];
    const updated = performedServices.filter(s => String(s.id) !== String(id));
    setPerformedServices(updated);
    localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(updated));
    try {
      const toDelete = backup.find(s => String(s.id) === String(id));
      const name = toDelete ? toDelete.descricao : `ID #${id}`;
      await runTrackedSync('Remoção de Serviço Realizado', name, () => deletePerformedServiceFromDb(id));
    } catch (error) {
      console.error("Error deleting performed service:", error);
      setPerformedServices(backup);
      localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(backup));
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, updated);
    }
  };

  const handleAddScheduledService = async (newService: Omit<CarServiceScheduled, 'id'>) => {
    const id = Date.now().toString();
    const serviceObj = { id, ...newService, updatedAt: Date.now() };
    const updated = [...scheduledServices, serviceObj];
    setScheduledServices(updated);
    localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(updated));
    try {
      await runTrackedSync('Novo Serviço Planejado', `${serviceObj.descricao}`, () => saveScheduledServiceToDb(serviceObj));
    } catch (error) {
      console.error("Error saving scheduled service:", error);
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, updated);
    }
  };

  const handleEditScheduledService = async (id: string, updatedFields: Partial<CarServiceScheduled>) => {
    const updated = scheduledServices.map(s => String(s.id) === String(id) ? { ...s, ...updatedFields, id: s.id, updatedAt: Date.now() } : s);
    setScheduledServices(updated);
    localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(updated));
    const item = updated.find(s => String(s.id) === String(id));
    if (item) {
      try {
        await runTrackedSync('Edição de Serviço Planejado', `${item.descricao}`, () => saveScheduledServiceToDb(item));
      } catch (error) {
        console.error("Error updating scheduled service:", error);
      }
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, updated);
    }
  };

  const handleDeleteScheduledService = async (id: string) => {
    const backup = [...scheduledServices];
    const updated = scheduledServices.filter(s => String(s.id) !== String(id));
    setScheduledServices(updated);
    localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(updated));
    try {
      const toDelete = backup.find(s => String(s.id) === String(id));
      const name = toDelete ? toDelete.descricao : `ID #${id}`;
      await runTrackedSync('Remoção de Serviço Planejado', name, () => deleteScheduledServiceFromDb(id));
    } catch (error) {
      console.error("Error deleting scheduled service:", error);
      setScheduledServices(backup);
      localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(backup));
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, undefined, undefined, undefined, updated);
    }
  };

  const handleAddPrescription = async (newPresc: Omit<MedicalPrescription, 'id'>) => {
    const id = Date.now().toString();
    const prescObj = { id, ...newPresc, updatedAt: Date.now() };
    const updated = [prescObj, ...prescriptions];
    setPrescriptions(updated);
    try {
      await saveMedicalPrescriptionToDb(prescObj);
    } catch (error) {
      console.error("Error saving prescription:", error);
      showAlert?.(
        'Erro ao Salvar Anexo/Receita',
        'A receita foi salva localmente, mas não pôde ser salva na nuvem. Se você anexou um PDF, certifique-se de que o arquivo seja pequeno (recomendado até 450KB).'
      );
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, updated);
    }
  };

  const handleEditPrescription = async (id: string, updatedFields: Partial<MedicalPrescription>) => {
    const updated = prescriptions.map(p => p.id === id ? { ...p, ...updatedFields, updatedAt: Date.now() } : p);
    setPrescriptions(updated);
    const item = updated.find(p => p.id === id);
    if (item) {
      try {
        await saveMedicalPrescriptionToDb(item);
      } catch (error) {
        console.error("Error updating prescription:", error);
        showAlert?.(
          'Erro ao Atualizar Anexo/Receita',
          'Suas alterações foram aplicadas localmente, mas falharam ao salvar na nuvem. Se anexou um arquivo grande, tente usar um menor (até 450KB).'
        );
      }
    }
    const activeToken = getEffectiveGoogleToken();
    if (activeToken) {
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, updated);
    }
  };

  const handleDeletePrescription = async (id: string) => {
    const backup = [...prescriptions];
    const updated = prescriptions.filter(p => p.id !== id);
    setPrescriptions(updated);
    try {
      await deleteMedicalPrescriptionFromDb(id);
      const activeToken = getEffectiveGoogleToken();
      if (activeToken) {
        triggerSync(activeToken, true, undefined, undefined, undefined, undefined, updated);
      }
    } catch (error) {
      console.error("Error deleting prescription:", error);
      setPrescriptions(backup);
      showAlert?.(
        'Erro de Remoção',
        'Não foi possível remover a receita na nuvem. Verifique sua conexão.'
      );
    }
  };

  // Safe router navigation callback
  const handleTabNavigate = (tab: string) => {
    if (tab === 'add-transaction' || tab === 'add-receita' || tab === 'add-despesa') {
      if (tab === 'add-receita') {
        localStorage.setItem('draft_txType', 'RECEITA');
        localStorage.setItem('draft_category', 'OUTROS');
      } else if (tab === 'add-despesa') {
        localStorage.setItem('draft_txType', 'DESPESA');
        localStorage.setItem('draft_category', 'ABASTECIMENTO');
      }
      setCurrentTab('transactions');
      setShowAddTxForm(true);
    } else {
      setShowAddTxForm(false);
      setCurrentTab(tab);
    }
  };

  // Render view template selector
  const renderCurrentView = () => {
    switch (currentTab) {
      case 'analytics':
      case 'bi':
      case 'executivo':
        return (
          <DashboardPage
            transactions={transactions}
            bankAccounts={bankAccountsState}
            creditCards={creditCards}
            registeredVehicles={registeredVehicles}
            riskZones={riskZones}
            infractions={infractions}
            compromissos={compromissos}
            onNavigateTab={handleTabNavigate}
            showAlert={showAlert}
          />
        );
      case 'analysis':
        return (
          <Analise 
            transactions={transactions}
            onNavigate={handleTabNavigate}
            showAlert={showAlert}
          />
        );
      case 'receitas':
        return (
          <Financeiro
            transactions={transactions}
            setTransactions={setTransactions}
            bankAccounts={bankAccountsState}
            setBankAccounts={setBankAccountsState}
            creditCards={creditCards}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onWipeTransactions={handleWipeTransactions}
            googleUser={googleUser}
            googleToken={googleToken}
            isSyncing={isSyncing}
            isImporting={isImporting}
            spreadsheetUrl={spreadsheetUrl}
            syncError={syncError}
            lastSyncedTime={lastSyncedTime}
            autoSync={autoSync}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onToggleAutoSync={handleToggleAutoSync}
            onTriggerSync={triggerSync}
            onTriggerImport={triggerImport}
            onConnectGoogleDrive={handleConnectGoogleDrive}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportTransactions={handleImportTransactions}
            compromissos={compromissos}
            setCompromissos={setCompromissos}
            forcedFilter="RECEITA"
            initialShowAddForm={showAddTxForm}
          />
        );
      case 'despesas':
      case 'transactions': // Fallback for safety
        return (
          <Financeiro
            transactions={transactions}
            setTransactions={setTransactions}
            bankAccounts={bankAccountsState}
            setBankAccounts={setBankAccountsState}
            creditCards={creditCards}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onWipeTransactions={handleWipeTransactions}
            googleUser={googleUser}
            googleToken={googleToken}
            isSyncing={isSyncing}
            isImporting={isImporting}
            spreadsheetUrl={spreadsheetUrl}
            syncError={syncError}
            lastSyncedTime={lastSyncedTime}
            autoSync={autoSync}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onToggleAutoSync={handleToggleAutoSync}
            onTriggerSync={triggerSync}
            onTriggerImport={triggerImport}
            onConnectGoogleDrive={handleConnectGoogleDrive}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportTransactions={handleImportTransactions}
            compromissos={compromissos}
            setCompromissos={setCompromissos}
            forcedFilter="DESPESA"
            initialShowAddForm={showAddTxForm}
          />
        );
      case 'abastecimentos':
        return (
          <Abastecimento
            transactions={transactions}
            setTransactions={setTransactions}
            bankAccounts={bankAccountsState}
            setBankAccounts={setBankAccountsState}
            creditCards={creditCards}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onWipeTransactions={handleWipeTransactions}
            googleUser={googleUser}
            googleToken={googleToken}
            isSyncing={isSyncing}
            isImporting={isImporting}
            spreadsheetUrl={spreadsheetUrl}
            syncError={syncError}
            lastSyncedTime={lastSyncedTime}
            autoSync={autoSync}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onToggleAutoSync={handleToggleAutoSync}
            onTriggerSync={triggerSync}
            onTriggerImport={triggerImport}
            onConnectGoogleDrive={handleConnectGoogleDrive}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportTransactions={handleImportTransactions}
            compromissos={compromissos}
            setCompromissos={setCompromissos}
            initialShowAddForm={showAddTxForm}
          />
        );
      case 'financas':
        return (
          <Financeiro
            transactions={transactions}
            setTransactions={setTransactions}
            bankAccounts={bankAccountsState}
            setBankAccounts={setBankAccountsState}
            creditCards={creditCards}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onWipeTransactions={handleWipeTransactions}
            googleUser={googleUser}
            googleToken={googleToken}
            isSyncing={isSyncing}
            isImporting={isImporting}
            spreadsheetUrl={spreadsheetUrl}
            syncError={syncError}
            lastSyncedTime={lastSyncedTime}
            autoSync={autoSync}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onToggleAutoSync={handleToggleAutoSync}
            onTriggerSync={triggerSync}
            onTriggerImport={triggerImport}
            onConnectGoogleDrive={handleConnectGoogleDrive}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportTransactions={handleImportTransactions}
            compromissos={compromissos}
            setCompromissos={setCompromissos}
            forcedFilter="FINANCAS"
            initialShowAddForm={showAddTxForm}
          />
        );
      case 'oficina':
      case 'carservices': // Fallback for safety
        return (
          <Oficina
            performedServices={performedServices}
            scheduledServices={scheduledServices}
            registeredVehicles={registeredVehicles}
            bankAccounts={bankAccountsState}
            transactions={transactions}
            onAddPerformedService={handleAddPerformedService}
            onEditPerformedService={handleEditPerformedService}
            onDeletePerformedService={handleDeletePerformedService}
            onAddScheduledService={handleAddScheduledService}
            onEditScheduledService={handleEditScheduledService}
            onDeleteScheduledService={handleDeleteScheduledService}
            onAddTransaction={handleAddTransaction}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onAddFuel={() => {
              try {
                localStorage.setItem('draft_category', 'ABASTECIMENTO');
                localStorage.setItem('draft_txType', 'DESPESA');
                localStorage.setItem('draft_km', '');
              } catch (e) {
                console.error("Failed to write to localStorage for draft_category:", e);
              }
              setShowAddTxForm(true);
              handleTabNavigate('abastecimentos');
            }}
            onReindexPerformedServices={handleReindexPerformedServices}
            onReindexScheduledServices={handleReindexScheduledServices}
          />
        );
      case 'agenda':
      case 'compromissos': // Fallback for safety
        return (
          <Agenda 
            compromissos={compromissos}
            onAddCompromisso={handleAddCompromisso}
            onEditCompromisso={handleEditCompromisso}
            onDeleteCompromisso={handleDeleteCompromisso}
            onNavigate={handleTabNavigate}
          />
        );
      case 'risk':
      case 'zonasderisco':
        return (
          <ZonasDeRisco 
            riskZones={riskZones}
            onAddRiskZone={handleAddRiskZone}
            onToggleActive={handleToggleZoneActive}
            onEditRiskZone={handleEditRiskZone}
            onDeleteRiskZone={handleDeleteRiskZone}
            showAlert={showAlert}
            showConfirm={showConfirm}
            onReindexRiskZones={handleReindexRiskZones}
          />
        );
      case 'medical':
      case 'consultas':
        return (
          <Consultas
            appointments={appointments}
            onAddAppointment={handleAddAppointment}
            onEditAppointment={handleEditAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            prescriptions={prescriptions}
            onAddPrescription={handleAddPrescription}
            onEditPrescription={handleEditPrescription}
            onDeletePrescription={handleDeletePrescription}
            showAlert={showAlert}
            showConfirm={showConfirm}
            medicalAppointmentLeadDays={medicalAppointmentLeadDays}
            onReindexAppointments={handleReindexAppointments}
            onReindexPrescriptions={handleReindexPrescriptions}
          />
        );
      case 'receitas':
        return (
          <Receitas
            appointments={appointments}
            onAddAppointment={handleAddAppointment}
            onEditAppointment={handleEditAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            prescriptions={prescriptions}
            onAddPrescription={handleAddPrescription}
            onEditPrescription={handleEditPrescription}
            onDeletePrescription={handleDeletePrescription}
            showAlert={showAlert}
            showConfirm={showConfirm}
            medicalAppointmentLeadDays={medicalAppointmentLeadDays}
            onReindexAppointments={handleReindexAppointments}
            onReindexPrescriptions={handleReindexPrescriptions}
          />
        );
      case 'profile':
      case 'perfil':
        return (
          <Perfil 
            bankAccounts={bankAccountsState}
            setBankAccounts={setBankAccountsState}
            creditCards={creditCardsState}
            setCreditCards={setCreditCardsState}
            avatarUrl={avatarUrl}
            onAvatarChange={handleAvatarChange}
            transactions={transactions}
            setTransactions={setTransactions}
            riskZones={riskZones}
            setRiskZones={setRiskZones}
            infractions={infractions}
            setInfractions={setInfractions}
            nonAppealed={nonAppealed}
            setNonAppealed={setNonAppealed}
            showAlert={showAlert}
            showConfirm={showConfirm}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            compromissos={compromissos}
            customCategories={customCategories}
            setCustomCategories={setCustomCategories}
            securityConfig={securityConfig}
            setSecurityConfig={setSecurityConfig}
            onTestLock={() => setIsAppLocked(true)}
            categoryBudgets={categoryBudgets}
            setCategoryBudgets={setCategoryBudgets}
            googleToken={googleToken}
            googleUser={googleUser}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onConnectGoogleDrive={handleConnectGoogleDrive}
            ipvaLeadDays={ipvaLeadDays}
            setIpvaLeadDays={setIpvaLeadDays}
            ipvaClosingDay={ipvaClosingDay}
            setIpvaClosingDay={setIpvaClosingDay}
            medicalAppointmentLeadDays={medicalAppointmentLeadDays}
            setMedicalAppointmentLeadDays={setMedicalAppointmentLeadDays}
            ipvaNotificationColor={ipvaNotificationColor}
            setIpvaNotificationColor={setIpvaNotificationColor}
            notifyIpva={notifyIpva}
            setNotifyIpva={setNotifyIpva}
            notifyBudget={notifyBudget}
            setNotifyBudget={setNotifyBudget}
            notifyAppointments={notifyAppointments}
            setNotifyAppointments={setNotifyAppointments}
            dailyCheckInTime={dailyCheckInTime}
            setDailyCheckInTime={setDailyCheckInTime}
            defaultVehicleId={defaultVehicleId}
            setDefaultVehicleId={setDefaultVehicleId}
            licensingReminderDay={licensingReminderDay}
            setLicensingReminderDay={setLicensingReminderDay}
            notifyLicensing={notifyLicensing}
            setNotifyLicensing={setNotifyLicensing}
            notifyCarServices={notifyCarServices}
            setNotifyCarServices={setNotifyCarServices}
            notifyMedical={notifyMedical}
            setNotifyMedical={setNotifyMedical}
            notifyRiskZones={notifyRiskZones}
            setNotifyRiskZones={setNotifyRiskZones}
            onReindexBankAccounts={handleReindexBankAccounts}
            onReindexCreditCards={handleReindexCreditCards}
            onReindexVehicles={handleReindexVehicles}
            onTriggerNotification={handleTriggerNotification}
          />
        );
      case 'indicacoes':
        return (
          <Indicacoes 
            transactions={transactions}
            onNavigate={handleTabNavigate}
            showAlert={showAlert}
          />
        );
      case 'veiculos':
      case 'vehicles':
        return (
          <Veiculos
            registeredVehicles={registeredVehicles}
            onAddVehicle={handleAddVehicle}
            onEditVehicle={handleEditVehicle}
            onDeleteVehicle={handleDeleteVehicle}
            onReindexVehicles={handleReindexVehicles}
            showAlert={showAlert}
            showConfirm={showConfirm}
          />
        );
      case 'assistant':
      case 'assistente':
        return (
          <AssistenteIA
            transactions={transactions}
            initialAccountsTotal={bankAccountsState.reduce((sum, b) => sum + (b.saldo || 0), 0)}
          />
        );
      case 'documents':
      case 'ocr':
      case 'comprovantes':
        return (
          <Comprovantes
            existingTransactions={transactions}
            onAddTransaction={handleAddTransaction}
            showAlert={showAlert}
          />
        );
      case 'mercado':
      case 'listamercado':
      case 'grocery':
        return (
          <ListaMercado
            groceryItems={groceryItems}
            bankAccounts={bankAccountsState}
            creditCards={creditCardsState}
            onAddGroceryItem={handleAddGroceryItem}
            onEditGroceryItem={handleEditGroceryItem}
            onDeleteGroceryItem={handleDeleteGroceryItem}
            onClearPurchasedItems={handleClearPurchasedItems}
            onAddTransaction={handleAddTransaction}
            onSyncWithSheets={triggerSync}
            isSyncing={isSyncing}
          />
        );
      default:
        return (
          <Analise 
            transactions={transactions}
            onNavigate={handleTabNavigate}
            showAlert={showAlert}
          />
        );
    }
  };

  return (
    <div className="h-[100dvh] md:min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-6 text-slate-100 font-sans overflow-hidden md:overflow-visible">
      
      {/* Luxury Smartphone Simulator Shell for desktop, responsive native look on mobile */}
      <div className="w-full max-w-md h-[100dvh] md:h-[840px] md:max-h-[90vh] bg-slate-900 md:rounded-[42px] md:border-8 md:border-slate-800 shadow-2xl flex flex-col overflow-hidden relative md:ring-1 md:ring-slate-700/50">
        
        {/* Lock Screen Security Overlay */}
        <AnimatePresence>
          {isAppLocked && securityConfig.enabled && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="absolute inset-0 z-[100]"
            >
              <LockScreen 
                securityConfig={securityConfig} 
                onUnlock={() => setIsAppLocked(false)} 
                avatarUrl={avatarUrl}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulator Notch Camera Speaker */}
        <div className="hidden md:flex absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-full z-50 items-center justify-center">
          <div className="w-3 h-3 bg-slate-950 rounded-full mr-2" />
          <div className="w-12 h-1 bg-slate-900 rounded-full" />
        </div>

        {/* Dynamic Mobile Status Bar Header */}
        <header className="bg-slate-950/80 backdrop-blur-md px-6 py-2.5 flex justify-between items-center text-xs text-slate-300 select-none z-40 relative md:pt-4">
          <span className="font-semibold font-mono tracking-tight">{timeStr}</span>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            {/* Sync Connection Queue Button */}
            <button
              onClick={() => setShowSyncQueueModal(true)}
              className="flex items-center gap-1 bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80 rounded-full px-2 py-0.5 active:scale-95 transition-all cursor-pointer mr-1.5 shadow-sm shadow-black/40"
              title="Fila de Mudanças Pendentes"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`} />
              <span className={`material-symbols-outlined text-[13px] leading-none ${
                pendingChanges.some(c => c.status === 'SYNCING') 
                  ? 'animate-spin text-emerald-400' 
                  : !isOnline 
                  ? 'text-rose-400' 
                  : pendingChanges.some(c => c.status === 'FAILED' || c.status === 'PENDING')
                  ? 'text-amber-400'
                  : 'text-emerald-500'
              }`}>
                {pendingChanges.some(c => c.status === 'SYNCING') 
                  ? 'sync' 
                  : !isOnline 
                  ? 'cloud_off' 
                  : pendingChanges.some(c => c.status === 'FAILED' || c.status === 'PENDING')
                  ? 'cloud_sync'
                  : 'cloud_done'}
              </span>
              {pendingChanges.filter(c => c.status === 'PENDING' || c.status === 'SYNCING' || c.status === 'FAILED').length > 0 && (
                <span className="text-[8px] font-bold text-white bg-rose-600 px-1 rounded-full transform scale-90 leading-tight">
                  {pendingChanges.filter(c => c.status === 'PENDING' || c.status === 'SYNCING' || c.status === 'FAILED').length}
                </span>
              )}
            </button>
            <span className="material-symbols-outlined text-xs">signal_cellular_alt</span>
            <span className="text-emerald-400 font-bold uppercase tracking-wider">5G</span>
            <span className="material-symbols-outlined text-xs ml-1">battery_5_bar</span>
            <span>90%</span>
          </div>
        </header>

        {/* Screen Content Wrapper Viewport */}
        <main className="flex-grow overflow-y-auto overflow-x-hidden custom-scrollbar px-4 pt-3 pb-24 relative bg-slate-950">
          <AnimatePresence>
            {showSyncQueueModal && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="absolute inset-0 z-50 bg-slate-950/98 backdrop-blur-md p-4 flex flex-col justify-between"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-850 pb-3 mb-3 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-400 text-lg">cloud_sync</span>
                    <div>
                      <h3 className="font-bold text-white text-xs leading-none">Fila de Mudanças Pendentes</h3>
                      <span className="text-[9px] text-slate-400 font-mono mt-1 block">Log de Sincronização em Tempo Real</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSyncQueueModal(false)}
                    className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>

                {/* Connection Status block */}
                <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 mb-3 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status da Conexão</span>
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                      isOnline 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed mb-3">
                    {isOnline 
                      ? `Seu aplicativo está conectado à planilha "Finanças Gaeta" (ID: ${DEFAULT_SPREADSHEET_ID}) no Google Drive. Modificações são salvas e sincronizadas instantaneamente.` 
                      : 'Você está offline. Alterações pendentes serão salvas com segurança no seu navegador e sincronizadas de forma automática assim que a internet voltar.'}
                  </p>
                  <button
                    onClick={() => loadDataFromSheets(true)}
                    className="w-full py-2 bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">cloud_download</span>
                    Forçar Recarregamento da Nuvem
                  </button>
                </div>

                {/* Queue Summary Counter Grid */}
                <div className="grid grid-cols-3 gap-2 mb-3 flex-shrink-0">
                  <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Aguardando</p>
                    <p className="text-sm font-extrabold text-amber-400 font-mono mt-1">
                      {pendingChanges.filter(c => c.status === 'PENDING').length}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Sincronizados</p>
                    <p className="text-sm font-extrabold text-emerald-400 font-mono mt-1">
                      {pendingChanges.filter(c => c.status === 'SYNCED').length}
                    </p>
                  </div>
                  <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-2.5 text-center">
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Erros/Falhas</p>
                    <p className="text-sm font-extrabold text-rose-500 font-mono mt-1">
                      {pendingChanges.filter(c => c.status === 'FAILED').length}
                    </p>
                  </div>
                </div>

                {/* Scrollable Queue List */}
                <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 mb-3 pr-1">
                  {pendingChanges.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500 h-full">
                      <span className="material-symbols-outlined text-4xl text-slate-800 mb-2.5">cloud_queue</span>
                      <p className="text-xs font-semibold text-slate-400">Nenhuma mudança na fila</p>
                      <p className="text-[9px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                        Faça alterações de lançamentos ou compromissos para ver a fila de sincronização monitorar as gravações.
                      </p>
                    </div>
                  ) : (
                    pendingChanges.map(change => {
                      let iconName = 'sync';
                      let iconColor = 'text-slate-400';
                      if (change.type.includes('Adição') || change.type.includes('Novo')) {
                        iconName = 'add_circle';
                        iconColor = 'text-emerald-400';
                      } else if (change.type.includes('Edição')) {
                        iconName = 'edit';
                        iconColor = 'text-sky-400';
                      } else if (change.type.includes('Remoção')) {
                        iconName = 'delete_forever';
                        iconColor = 'text-rose-400';
                      } else if (change.type.includes('Alteração')) {
                        iconName = 'toggle_on';
                        iconColor = 'text-amber-400';
                      }

                      return (
                        <div key={change.id} className="bg-slate-900/40 border border-slate-850 rounded-xl p-3 flex items-start gap-2.5 transition-all hover:bg-slate-900/80">
                          <div className={`w-7.5 h-7.5 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 flex-shrink-0 ${iconColor}`}>
                            <span className="material-symbols-outlined text-base">{iconName}</span>
                          </div>
                          <div className="flex-grow min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[9px] font-bold text-slate-400 tracking-wide uppercase">{change.type}</span>
                              <span className="text-[8px] text-slate-500 font-mono flex-shrink-0">
                                {new Date(change.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs font-semibold text-slate-200 mt-0.5 truncate">{change.title}</p>
                            
                            {change.error && (
                              <p className="text-[9px] text-rose-400 font-medium mt-1 bg-rose-500/5 border border-rose-500/10 rounded px-1.5 py-0.5">
                                {change.error}
                              </p>
                            )}

                            <div className="flex justify-end mt-1.5">
                              <span className={`flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                                change.status === 'SYNCED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : change.status === 'SYNCING'
                                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse'
                                  : change.status === 'FAILED'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-slate-850 text-slate-400 border border-slate-800'
                              }`}>
                                {change.status === 'SYNCING' && <span className="w-1 h-1 rounded-full bg-sky-400 animate-ping mr-0.5" />}
                                {change.status === 'SYNCED' && 'SINCRONIZADO'}
                                {change.status === 'SYNCING' && 'SINCRONIZANDO'}
                                {change.status === 'PENDING' && 'AGUARDANDO'}
                                {change.status === 'FAILED' && 'FALHOU'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer Controls */}
                <div className="flex gap-2 border-t border-slate-850 pt-3 flex-shrink-0">
                  <button
                    onClick={handleClearSyncHistory}
                    disabled={!pendingChanges.some(c => c.status === 'SYNCED')}
                    className="flex-grow py-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 disabled:opacity-30 text-slate-300 disabled:cursor-not-allowed text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    Limpar Histórico
                  </button>
                  <button
                    onClick={handleRetryAllSync}
                    disabled={!isOnline || !pendingChanges.some(c => c.status === 'PENDING' || c.status === 'FAILED')}
                    className="flex-grow py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:opacity-30 disabled:cursor-not-allowed text-slate-950 disabled:border disabled:border-slate-800 text-xs font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/10 cursor-pointer active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[13px] font-bold">sync</span>
                    Sincronizar Tudo
                  </button>
                </div>
              </motion.div>
            )}

            {activeNotification && (
              <motion.div
                initial={{ opacity: 0, y: -80, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", damping: 18, stiffness: 150 }}
                className="absolute top-2 left-3 right-3 z-50 bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-2.5 shadow-emerald-500/5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs tracking-wider">
                      {String(activeNotification.banco || '').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeNotification.banco}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-600" />
                        <span className="text-[9px] text-slate-500 font-medium">Agora mesmo</span>
                      </div>
                      <p className="text-xs font-bold text-white mt-0.5 leading-snug">
                        {activeNotification.tipo === 'RECEITA' ? '📥 PIX Recebido' : '💸 PIX Enviado / Débito'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveNotification(null)}
                    className="text-slate-500 hover:text-slate-300 p-0.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                <div className="text-xs text-slate-300 leading-normal pl-1.5 border-l-2 border-emerald-500/30 bg-slate-950/20 py-1 px-2 rounded">
                  <span className="font-semibold text-white">{activeNotification.descricao}</span> no valor de{" "}
                  <span className="font-mono font-bold text-emerald-400">
                    R$ {activeNotification.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex gap-2.5 justify-end">
                  <button
                    onClick={() => setActiveNotification(null)}
                    className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-450 hover:text-slate-200 text-[10px] font-bold rounded-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider"
                  >
                    Ignorar
                  </button>
                  <button
                    onClick={() => handleRecordSimulatedTransaction(activeNotification)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[10px] font-bold rounded-lg transition-all active:scale-95 shadow-md shadow-emerald-500/10 cursor-pointer uppercase tracking-wider flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[12px] font-bold">save</span>
                    Gravar no Aplicativo
                  </button>
                </div>
              </motion.div>
            )}

            {bankIntegrationNotification && (
              <motion.div
                initial={{ opacity: 0, y: -100, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -40, scale: 0.95 }}
                transition={{ type: "spring", damping: 20, stiffness: 180 }}
                className="absolute top-4 left-4 right-4 z-[9999] bg-[#2E3033] text-white rounded-[28px] p-5 shadow-2xl flex flex-col gap-3.5 border border-white/5"
                id="bank-integration-notification-banner"
              >
                {/* Notification Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Circle White App Icon with Chart Lines */}
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-md shrink-0">
                      <div className="flex items-end gap-0.5 h-4 w-4 justify-center">
                        <div className="w-[3px] h-2.5 bg-[#F9A825] rounded-t-sm" />
                        <div className="w-[3px] h-3.5 bg-[#4CAF50] rounded-t-sm" />
                        <div className="w-[3px] h-4.5 bg-[#1976D2] rounded-t-sm" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] font-sans font-normal text-slate-300">Minhas Finanças</span>
                        <span className="text-[13px] font-sans text-slate-400">•</span>
                        <span className="text-[13px] font-sans font-medium text-slate-200">{bankIntegrationNotification.bancoNome}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 text-xs">
                    <span>Há pouco</span>
                    <span className="material-symbols-outlined text-sm font-semibold">expand_less</span>
                  </div>
                </div>

                {/* Notification Body */}
                <div className="px-1 space-y-1">
                  <h4 className="text-[15px] font-medium text-slate-50 font-sans tracking-wide">
                    Nova transação de R$ {bankIntegrationNotification.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </h4>
                  <p className="text-[13px] text-slate-300 font-sans">
                    Como você deseja importa-la?
                  </p>
                </div>

                {/* AI Category Suggestion display */}
                <div className="mx-1 mt-0.5 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex flex-col gap-1.5 shadow-inner">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-amber-400 text-base font-semibold animate-pulse">psychology</span>
                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider font-sans">Sugestão de Categoria por IA</span>
                  </div>
                  {bankIntegrationNotification.isLoadingSuggestion ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-sans mt-0.5 pl-6">
                      <svg className="animate-spin h-3 w-3 text-amber-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Analisando seu histórico de transações...</span>
                    </div>
                  ) : bankIntegrationNotification.suggestedCategory ? (
                    <div className="space-y-1 pl-6">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                          {bankIntegrationNotification.suggestedCategory}
                        </span>
                        <span className="text-[11px] text-slate-400 font-sans">Recomendado</span>
                      </div>
                      {bankIntegrationNotification.suggestedJustification && (
                        <p className="text-[11px] text-slate-300 italic font-sans leading-relaxed">
                          "{bankIntegrationNotification.suggestedJustification}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-sans pl-6 mt-0.5">Sem dados anteriores para análise inteligente.</span>
                  )}
                </div>

                {/* Transfer Selection View */}
                {isSelectingTransferDest ? (
                  <div className="mt-1 space-y-3 bg-[#1E2022] p-3.5 rounded-2xl border border-white/5 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                        Selecione o Banco de Destino:
                      </label>
                      <select
                        value={selectedTransferDestId || ''}
                        onChange={(e) => setSelectedTransferDestId(Number(e.target.value))}
                        className="w-full bg-[#2E3033] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-amber-500 font-sans"
                      >
                        <option value="">-- Escolher Banco --</option>
                        {bankAccountsState
                          .filter(acc => acc.id !== bankIntegrationNotification.bancoId)
                          .map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.nome}</option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setIsSelectingTransferDest(false);
                          setSelectedTransferDestId(null);
                        }}
                        className="px-3.5 py-1.5 bg-[#2E3033] hover:bg-slate-700 text-slate-300 font-semibold rounded-full text-xs transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => {
                          if (!selectedTransferDestId) {
                            showAlert("Selecione o Destino", "Escolha a conta que recebeu o Pix.");
                            return;
                          }
                          handleImportBankIntegration('TRANSFERENCIA', selectedTransferDestId);
                        }}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-450 text-slate-950 font-bold rounded-full text-xs transition-all cursor-pointer active:scale-95"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Action Buttons Row styled exactly like the Android notification pills */
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleImportBankIntegration('RECEITA')}
                      className="flex-1 py-2 px-3 bg-[#3C3E44] hover:bg-[#4E5158] text-[#E3E3E3] font-medium rounded-full text-xs text-center transition-all cursor-pointer active:scale-95 shadow-sm border border-white/5"
                    >
                      Receita
                    </button>
                    <button
                      onClick={() => handleImportBankIntegration('DESPESA')}
                      className="flex-1 py-2 px-3 bg-[#3C3E44] hover:bg-[#4E5158] text-[#E3E3E3] font-medium rounded-full text-xs text-center transition-all cursor-pointer active:scale-95 shadow-sm border border-white/5"
                    >
                      Despesa
                    </button>
                    <button
                      onClick={() => {
                        const dests = bankAccountsState.filter(acc => acc.id !== bankIntegrationNotification.bancoId);
                        if (dests.length > 0) {
                          setSelectedTransferDestId(dests[0].id);
                        }
                        setIsSelectingTransferDest(true);
                      }}
                      className="flex-1 py-2 px-3 bg-[#3C3E44] hover:bg-[#4E5158] text-[#E3E3E3] font-medium rounded-full text-xs text-center transition-all cursor-pointer active:scale-95 shadow-sm border border-white/5"
                    >
                      Transferência
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="w-full"
            >
              {renderCurrentView()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Premium Bottom Navigation Tab Bar with active ripples */}
        <nav className="absolute bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/80 px-1 pt-1.5 pb-4 md:pb-2.5 grid grid-cols-5 gap-0.5 z-40 select-none">
          
          {/* Finanças tab */}
          <button 
            onClick={() => {
              setIsMaisMenuOpen(false);
              handleTabNavigate('financas');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer relative w-full ${
              currentTab === 'financas' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${currentTab === 'financas' ? 'material-symbols-fill text-emerald-400 font-bold' : ''}`}>
              account_balance
            </span>
            <span className="text-[9px] font-bold tracking-tight text-center truncate w-full px-0.5">Finanças</span>
          </button>

          {/* Indicações tab */}
          <button 
            onClick={() => {
              setIsMaisMenuOpen(false);
              handleTabNavigate('indicacoes');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer relative w-full ${
              currentTab === 'indicacoes' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${currentTab === 'indicacoes' ? 'material-symbols-fill text-emerald-400 font-bold' : ''}`}>
              savings
            </span>
            <span className="text-[9px] font-bold tracking-tight text-center truncate w-full px-0.5">Indicações</span>
          </button>

          {/* Abastecimentos tab */}
          <button 
            onClick={() => {
              setIsMaisMenuOpen(false);
              handleTabNavigate('abastecimentos');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer relative w-full ${
              currentTab === 'abastecimentos' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${currentTab === 'abastecimentos' ? 'material-symbols-fill text-emerald-400 font-bold' : ''}`}>
              local_gas_station
            </span>
            <span className="text-[9px] font-bold tracking-tight text-center truncate w-full px-0.5">Abastecer</span>
          </button>

          {/* Análise tab */}
          <button 
            onClick={() => {
              setIsMaisMenuOpen(false);
              handleTabNavigate('analysis');
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer w-full ${
              currentTab === 'analysis' ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${currentTab === 'analysis' ? 'material-symbols-fill text-emerald-400 font-bold' : ''}`}>
              query_stats
            </span>
            <span className="text-[9px] font-bold tracking-tight text-center truncate w-full px-0.5">Análise</span>
          </button>

          {/* Mais Tab instead of many options */}
          <button 
            onClick={() => setIsMaisMenuOpen(prev => !prev)}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl transition-all cursor-pointer relative w-full ${
              isMaisMenuOpen || ['mercado', 'listamercado', 'grocery', 'oficina', 'agenda', 'risk', 'medical', 'receitas', 'profile', 'indicacoes', 'despesas', 'analytics'].includes(currentTab) ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            {hasActiveAppointments && (
              <span className="absolute top-0.5 right-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
              </span>
            )}
            {hasUrgentIpva && (
              <span className="absolute top-0.5 left-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-600"></span>
              </span>
            )}
            {hasExpiringTransactions && !hasUrgentIpva && (
              <span className="absolute top-0.5 left-1 flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
              </span>
            )}
            <span className={`material-symbols-outlined text-[20px] ${isMaisMenuOpen || ['mercado', 'listamercado', 'grocery', 'oficina', 'agenda', 'risk', 'medical', 'receitas', 'profile', 'indicacoes', 'despesas'].includes(currentTab) ? 'material-symbols-fill text-emerald-400 font-bold' : ''}`}>
              more_horiz
            </span>
            <span className="text-[9px] font-bold tracking-tight text-center truncate w-full px-0.5">Mais</span>
          </button>

        </nav>

        {/* Premium Drawer for "Mais" options */}
        <AnimatePresence>
          {isMaisMenuOpen && (
            <div className="absolute inset-0 z-50 flex items-end justify-center select-none">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMaisMenuOpen(false)}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm"
              />
              
              {/* Slide-up Menu Panel */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="bg-slate-900 border-t border-slate-800 rounded-t-[32px] w-full max-w-md p-6 pb-8 shadow-2xl relative z-10 flex flex-col"
              >
                <div className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-5 pointer-events-none" />
                
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 font-mono px-1">
                  Outros Módulos
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Executive BI Dashboard tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('analytics');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer col-span-2 ${
                      currentTab === 'analytics' || currentTab === 'bi' || currentTab === 'executivo'
                        ? 'bg-sky-500/15 border-sky-500/40 text-sky-400 shadow-md shadow-sky-500/10' 
                        : 'bg-slate-950/60 border-slate-800 text-sky-300 hover:text-white hover:border-sky-500/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[30px] text-sky-400">monitoring</span>
                    <span className="text-xs font-bold font-sans">Dashboard Executivo BI</span>
                  </button>

                  {/* Lista de Mercado tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('mercado');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer col-span-2 ${
                      currentTab === 'mercado' || currentTab === 'listamercado' || currentTab === 'grocery'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-md shadow-emerald-500/10' 
                        : 'bg-slate-950/60 border-slate-800 text-emerald-400/90 hover:text-emerald-300 hover:border-emerald-500/30'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[30px] text-emerald-400">shopping_cart</span>
                    <span className="text-xs font-bold font-sans">Lista de Mercado</span>
                  </button>

                  {/* Oficina tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('oficina');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'oficina' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">build_circle</span>
                    <span className="text-xs font-bold font-sans">Oficina</span>
                  </button>

                  {/* Veículos tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('veiculos');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'veiculos' || currentTab === 'vehicles'
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-md shadow-amber-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">directions_car</span>
                    <span className="text-xs font-bold font-sans">Veículos</span>
                  </button>

                  {/* Agenda tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('agenda');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'agenda' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">calendar_month</span>
                    <span className="text-xs font-bold font-sans">Agenda</span>
                  </button>

                  {/* Risk Zones tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('risk');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'risk' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">gpp_maybe</span>
                    <span className="text-xs font-bold font-sans">Zona de risco</span>
                  </button>

                  {/* Medical Consultations tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('medical');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      currentTab === 'medical' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    {hasActiveAppointments && (
                      <span className="absolute top-3 right-3 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                    )}
                    <span className="material-symbols-outlined text-[28px]">medical_services</span>
                    <span className="text-xs font-bold font-sans">Consultas</span>
                  </button>

                  {/* Receitas tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('receitas');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'receitas' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">trending_up</span>
                    <span className="text-xs font-bold font-sans">Receitas</span>
                  </button>

                  {/* Despesas tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('despesas');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer relative ${
                      currentTab === 'despesas' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    {hasUrgentIpva && (
                      <span className="absolute top-3 right-3 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
                      </span>
                    )}
                    {hasExpiringTransactions && !hasUrgentIpva && (
                      <span className="absolute top-3 right-3 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                    )}
                    <span className="material-symbols-outlined text-[28px]">
                      {hasUrgentIpva ? 'warning' : 'trending_down'}
                    </span>
                    <span className="text-xs font-bold font-sans">Despesas</span>
                  </button>

                  {/* Profile settings tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('profile');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'profile' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">person</span>
                    <span className="text-xs font-bold font-sans">Perfil</span>
                  </button>

                  {/* Assistente IA tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('assistant');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'assistant' 
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">smart_toy</span>
                    <span className="text-xs font-bold font-sans">Assistente IA</span>
                  </button>

                  {/* Documentos & OCR tab */}
                  <button
                    onClick={() => {
                      handleTabNavigate('documents');
                      setIsMaisMenuOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all cursor-pointer ${
                      currentTab === 'documents' || currentTab === 'ocr' || currentTab === 'comprovantes'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5' 
                        : 'bg-slate-950/40 border-slate-850 text-slate-400 hover:text-slate-100 hover:border-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[28px]">document_scanner</span>
                    <span className="text-xs font-bold font-sans">Comprovantes & OCR</span>
                  </button>
                </div>

                <button
                  onClick={() => setIsMaisMenuOpen(false)}
                  className="mt-6 w-full bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider"
                >
                  Fechar
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Home indicator bar simulator */}
        <div className="hidden md:block absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-slate-800 rounded-full pointer-events-none z-50" />

      </div>

      {/* Custom Iframe-safe Modal Overlay */}
      <AnimatePresence>
        {dialog.isOpen && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999] select-none">
            {/* Backdrop blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!dialog.isConfirm) {
                  setDialog(prev => ({ ...prev, isOpen: false }));
                }
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-slate-900 border border-slate-800/80 rounded-2xl max-w-sm w-full p-5 shadow-2xl relative z-10 flex flex-col items-center text-center overflow-hidden"
            >
              {/* Top Warning/Info Glow Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                (dialog.title || '').includes('⚠️') || String(dialog.title || '').toUpperCase().includes('ATENÇÃO') || String(dialog.title || '').toUpperCase().includes('REMOVER') || String(dialog.title || '').toUpperCase().includes('ERRO')
                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                <span className="material-symbols-outlined text-2xl font-bold">
                  {(dialog.title || '').includes('⚠️') || String(dialog.title || '').toUpperCase().includes('ATENÇÃO') || String(dialog.title || '').toUpperCase().includes('REMOVER') || String(dialog.title || '').toUpperCase().includes('ERRO')
                    ? 'warning' 
                    : 'info'
                  }
                </span>
              </div>

              {/* Title */}
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 mb-2 font-display">
                {dialog.title}
              </h3>

              {/* Message */}
              <p className="text-xs text-slate-400 leading-relaxed mb-4 font-mono">
                {dialog.message}
              </p>

              {/* Required confirmation input */}
              {dialog.requireInputText && (
                <div className="w-full text-left mb-5 space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                    Confirme digitando <span className="text-amber-400 font-bold select-all">"{dialog.requireInputText}"</span> abaixo:
                  </label>
                  <input
                    type="text"
                    value={modalInputVal}
                    onChange={(e) => setModalInputVal(e.target.value)}
                    placeholder={dialog.requireInputText}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-all"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 w-full">
                {dialog.isConfirm ? (
                  <>
                    <button
                      onClick={() => {
                        setDialog(prev => ({ ...prev, isOpen: false }));
                      }}
                      className="flex-1 bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-750 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all active:scale-95"
                    >
                      {dialog.cancelText || 'Cancelar'}
                    </button>
                    <button
                      disabled={dialog.requireInputText ? (modalInputVal || '').trim().toLowerCase() !== (dialog.requireInputText || '').trim().toLowerCase() : false}
                      onClick={() => {
                        setDialog(prev => ({ ...prev, isOpen: false }));
                        dialog.onConfirm?.();
                      }}
                      className={`flex-1 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md ${
                        dialog.requireInputText && (modalInputVal || '').trim().toLowerCase() !== (dialog.requireInputText || '').trim().toLowerCase()
                          ? 'bg-slate-800 text-slate-500 border border-slate-850 cursor-not-allowed opacity-50'
                          : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/10'
                      }`}
                    >
                      {dialog.confirmText || 'Confirmar'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setDialog(prev => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl cursor-pointer transition-all active:scale-95 shadow-md"
                  >
                    OK
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        onConnect={handleConnectGoogleDrive}
        currentValue={googleToken || spreadsheetUrl || ''}
      />
    </div>
  );
}
