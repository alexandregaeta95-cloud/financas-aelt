import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Transaction, RiskZone, Infraction, MedicalAppointment, MedicalPrescription, BankAccount, CreditCard, RegisteredVehicle, Compromisso, CarServicePerformed, CarServiceScheduled, SecurityConfig, GroceryItem } from './types';
import { initialTransactions, bankAccounts, creditCards } from './data/transactions';
import { initialRiskZones } from './data/riskZones';
import { initialInfractions, nonAppealedInfractions } from './data/infractions';

// Tab imports
import Dashboard from './components/Dashboard';
import TransactionsTab from './components/TransactionsTab';
import ErrorBoundary from './components/ErrorBoundary';
import AnalysisTab from './components/AnalysisTab';
import RiskZonesTab from './components/RiskZonesTab';
import ProfileTab from './components/ProfileTab';
import MedicalAppointmentsTab, { isNotificationPeriod } from './components/MedicalAppointmentsTab';
import CompromissosTab from './components/CompromissosTab';
import CarServicesTab from './components/CarServicesTab';
import IndicacoesTab from './components/IndicacoesTab';
import LockScreen from './components/LockScreen';
import { checkIpvaAlerts } from './lib/ipvaUtils';
import { PixDetectedDialog, usePix } from './modules/pix';
import GoogleDriveModal from './components/GoogleDriveModal';
import { AssistantDashboardView } from './modules/assistant';
import { DocumentScannerView } from './modules/documents';
import { ExecutiveDashboardView } from './modules/analytics';
import { GroceryListTab } from './modules/mercado';

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

import { normalizeTransactionObject } from './lib/googleAuth';

// Helper to deduplicate transactions securely (checks IDs and normalizes properties)
function cleanDuplicateTransactions(txs: any[]): Transaction[] {
  if (!Array.isArray(txs)) return [];
  const seenIds = new Set<number>();
  const uniqueTxs: Transaction[] = [];

  txs.forEach(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') return;
    
    // Normalize properties (e.g. 'Valor (R$)', 'Valor', 'valor', 'Descrição', etc.)
    const t = normalizeTransactionObject(rawItem) || rawItem;
    if (!t || typeof t !== 'object') return;

    let idNum = Number(t.id);
    if (isNaN(idNum) || idNum <= 0) {
      // Assign a temporary safe unique ID so it is not deduplicated against other blank ones
      idNum = Math.floor(Math.random() * 1000000000) + 1000000000;
      t.id = idNum;
    }

    if (seenIds.has(idNum)) {
      return; // Skip duplicate ID
    }
    seenIds.add(idNum);

    // Sanitize string and numeric fields to ensure non-null types
    t.data = String(t.data || new Date().toLocaleDateString('pt-BR'));
    t.descricao = String(t.descricao || 'LANÇAMENTO');
    t.categoria = String(t.categoria || 'OUTROS').toUpperCase();
    t.tipo = String(t.tipo || 'DESPESA').toUpperCase();
    t.status = String(t.status || 'PAGO').toUpperCase();
    t.valor = typeof t.valor === 'number' && !isNaN(t.valor) ? t.valor : (parseFloat(String(t.valor || 0).replace(',', '.')) || 0);

    if (t.veiculo) t.veiculo = String(t.veiculo || '').toUpperCase();
    if (t.descricaoVeiculo) t.descricaoVeiculo = String(t.descricaoVeiculo || '').toUpperCase();
    if (t.nomePosto) t.nomePosto = String(t.nomePosto || '').toUpperCase();
    if (t.localizacaoPosto) t.localizacaoPosto = String(t.localizacaoPosto || '').toUpperCase();
    if (t.motorista) t.motorista = String(t.motorista || '').toUpperCase();

    uniqueTxs.push(t as Transaction);
  });

  return uniqueTxs;
}

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

  // Intelligent PIX Assistant hook integration
  const {
    isDialogOpen: isPixDialogOpen,
    activePix,
    confirmar: handleConfirmPixOption,
    cancelar: handleCancelPix
  } = usePix((payload) => {
    // Populate draft for TransactionsTab form
    localStorage.setItem('draft_txType', payload.tipo);
    localStorage.setItem('draft_category', payload.categoria);
    localStorage.setItem('draft_amountStr', payload.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    localStorage.setItem('draft_date', payload.data);
    localStorage.setItem('draft_desc', payload.descricao);
    localStorage.setItem('draft_obs', payload.obs || '');
    
    // Navigate to transactions tab and open add form
    setCurrentTab('transactions');
    setShowAddTxForm(true);
  });

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
  } | null>(null);

  // Live state synchronized lists (backed by Local Storage as an immediate fallback)
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_transactions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return cleanDuplicateTransactions(parsed);
        }
      }
    } catch (e) {
      console.error("Failed to parse transactions state:", e);
    }
    return cleanDuplicateTransactions(initialTransactions);
  });
  const [riskZones, setRiskZones] = useState<RiskZone[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_riskzones');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse risk zones state:", e);
    }
    return initialRiskZones;
  });
  const [infractions, setInfractions] = useState<Infraction[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_infractions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse infractions state:", e);
    }
    return initialInfractions;
  });
  const [nonAppealed, setNonAppealed] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_nonappealed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse non-appealed infractions state:", e);
    }
    return nonAppealedInfractions;
  });
  const [appointments, setAppointments] = useState<MedicalAppointment[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_appointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse appointments state:", e);
    }
    return [];
  });
  const [prescriptions, setPrescriptions] = useState<MedicalPrescription[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_prescriptions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse prescriptions state:", e);
    }
    return [];
  });

  const [registeredVehicles, setRegisteredVehicles] = useState<RegisteredVehicle[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_registered_vehicles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(v => v && typeof v === 'object' && String(v.descricao || v.modelo || v.placa || '').toUpperCase() !== 'FOX PRATA');
          if (filtered.length !== parsed.length) {
            localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error("Failed to parse registered vehicles state:", e);
    }
    return [
      { id: '1', descricao: 'FOX ROCK RIO 1.6', motorista: 'ALEXANDRE', placa: 'FVS4I24' }
    ];
  });

  const [compromissos, setCompromissos] = useState<Compromisso[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_compromissos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse compromissos state:", e);
    }
    return [];
  });

  const [performedServices, setPerformedServices] = useState<CarServicePerformed[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_car_services_performed');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(s => s && typeof s === 'object' && String(s.veiculoDescricao || (s as any)['Veículo'] || '').toUpperCase() !== 'FOX PRATA');
          if (filtered.length !== parsed.length) {
            localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error("Failed to parse performed services state:", e);
    }
    return [
      {
        id: 'p1',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Troca de Óleo e Filtro',
        data: '2026-04-11',
        km: 82350,
        valor: 250,
        oficina: 'Auto Center Gaeta',
        observacoes: 'Óleo Shell Helix 10w40 semissintético e filtro de óleo Bosch.',
        updatedAt: Date.now()
      },
      {
        id: 'p2',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Alinhamento e Balanceamento',
        data: '2026-05-05',
        km: 83100,
        valor: 120,
        oficina: 'Pneus Express',
        observacoes: 'Feito rodízio de pneus traseiros para dianteiros.',
        updatedAt: Date.now()
      }
    ];
  });

  const [scheduledServices, setScheduledServices] = useState<CarServiceScheduled[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_car_services_scheduled');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(s => s && typeof s === 'object' && String(s.veiculoDescricao || (s as any)['Veículo'] || '').toUpperCase() !== 'FOX PRATA');
          if (filtered.length !== parsed.length) {
            localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(filtered));
          }
          return filtered;
        }
      }
    } catch (e) {
      console.error("Failed to parse scheduled services state:", e);
    }
    return [
      {
        id: 's1',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Revisão Geral e Troca de Pastilhas',
        tipoAgendamento: 'DATA_E_KM',
        dataAlvo: '2026-08-15',
        kmAlvo: 90000,
        recorrente: false,
        status: 'PENDENTE',
        updatedAt: Date.now()
      },
      {
        id: 's2',
        veiculoDescricao: 'FOX ROCK RIO 1.6',
        descricao: 'Troca de Óleo e Filtro',
        tipoAgendamento: 'DATA_E_KM',
        dataAlvo: '2026-10-11',
        kmAlvo: 92350,
        recorrente: true,
        frequenciaMeses: 6,
        frequenciaKm: 10000,
        status: 'PENDENTE',
        updatedAt: Date.now()
      }
    ];
  });

  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_grocery_items');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse grocery items state:", e);
    }
    return [
      { id: 'g1', nome: 'Arroz 5kg', categoria: 'Mercearia', quantidade: 1, valorEstimado: 28.90, comprado: false, updatedAt: Date.now() },
      { id: 'g2', nome: 'Banana Prata kg', categoria: 'Hortifrúti', quantidade: 2, valorEstimado: 6.90, comprado: true, updatedAt: Date.now() },
      { id: 'g3', nome: 'Detergente Líquido', categoria: 'Limpeza', quantidade: 3, valorEstimado: 2.80, comprado: false, updatedAt: Date.now() },
    ];
  });

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

  // Stateful Profile Avatar URL
  const [avatarUrl, setAvatarUrl] = useState<string>(() => {
    const saved = localStorage.getItem('wealthflow_avatarurl');
    return saved || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDclcawui2tKuHgw4p_DWvKBp0R7XYoJIo41kp-qWXzNhTbDso-7IAoirqhYyc-HEWXFiHIGP6YdyvyG4u4xgKT0ecq0uBLAJEXGIxgaymfedUvUw5PmlAfsh600Je_GbTdL8UgPj2BZ18ovSoiV_-08bm1CxxuR-RaAO569na_pVi2ObUv5FfHdqk1JhAf68RSSZF5WqsPDCCmYfWunTzLuQcRHOJn29EvtKwGGBucDh8ZAdyadLyd';
  });

  // Stateful Custom transaction categories
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_custom_categories');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Stateful custom category budgets (annual spending targets)
  const [categoryBudgets, setCategoryBudgets] = useState<{ [category: string]: number }>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_category_budgets');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_category_budgets', JSON.stringify(categoryBudgets));
    } catch (e) {
      console.warn("Failed to save category budgets to localStorage:", e);
    }
  }, [categoryBudgets]);

  // Customizable IPVA alert advance warning (in days)
  const [ipvaLeadDays, setIpvaLeadDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_ipva_lead_days');
      return saved ? parseInt(saved, 10) : 30;
    } catch {
      return 30;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_ipva_lead_days', String(ipvaLeadDays));
    } catch (e) {
      console.warn("Failed to save ipva lead days to localStorage:", e);
    }
  }, [ipvaLeadDays]);

  // Cleanup FOX PRATA from localStorage
  useEffect(() => {
    try {
      const mileageStr = localStorage.getItem('wealthflow_vehicle_mileage');
      if (mileageStr) {
        const mileage = JSON.parse(mileageStr);
        if (mileage && mileage['FOX PRATA'] !== undefined) {
          delete mileage['FOX PRATA'];
          localStorage.setItem('wealthflow_vehicle_mileage', JSON.stringify(mileage));
        }
      }
    } catch (e) {
      console.warn("Cleanup of FOX PRATA mileage failed:", e);
    }
  }, []);

  // Customizable IPVA fleet closing day (of month)
  const [ipvaClosingDay, setIpvaClosingDay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_ipva_closing_day');
      return saved ? parseInt(saved, 10) : 15;
    } catch {
      return 15;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_ipva_closing_day', String(ipvaClosingDay));
    } catch (e) {
      console.warn("Failed to save ipva closing day to localStorage:", e);
    }
  }, [ipvaClosingDay]);

  // Customizable IPVA notification color preference (red, orange, yellow)
  const [ipvaNotificationColor, setIpvaNotificationColor] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_ipva_notification_color');
      return saved || 'orange';
    } catch {
      return 'orange';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_ipva_notification_color', ipvaNotificationColor);
    } catch (e) {
      console.warn("Failed to save ipva notification color to localStorage:", e);
    }
  }, [ipvaNotificationColor]);

  // Daily check-in notification state
  const [dailyCheckInTime, setDailyCheckInTime] = useState<string>(() => {
    try {
      return localStorage.getItem('wealthflow_daily_checkin_time') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_daily_checkin_time', dailyCheckInTime);
    } catch (e) {
      console.warn("Failed to save checkin time to localStorage:", e);
    }
  }, [dailyCheckInTime]);

  // Customizable medical appointments lead days (notification period)
  const [medicalAppointmentLeadDays, setMedicalAppointmentLeadDays] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_medical_appointment_lead_days');
      return saved ? parseInt(saved, 10) : 2;
    } catch {
      return 2;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_medical_appointment_lead_days', String(medicalAppointmentLeadDays));
    } catch (e) {
      console.warn("Failed to save medical appointment lead days to localStorage:", e);
    }
  }, [medicalAppointmentLeadDays]);

  // User alert permissions states (IPVA, Orçamento, Compromissos)
  const [notifyIpva, setNotifyIpva] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_ipva');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Default vehicle for Dashboard
  const [defaultVehicleId, setDefaultVehicleId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_default_vehicle_id');
      return saved || '';
    } catch {
      return '';
    }
  });

  // Licensing reminder monthly settings
  const [licensingReminderDay, setLicensingReminderDay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_licensing_reminder_day');
      return saved ? parseInt(saved, 10) : 10;
    } catch {
      return 10;
    }
  });

  const [notifyLicensing, setNotifyLicensing] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_licensing');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  // Sync default vehicle settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_default_vehicle_id', defaultVehicleId);
    } catch (e) {
      console.warn("Failed to save defaultVehicleId:", e);
    }
  }, [defaultVehicleId]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_licensing_reminder_day', String(licensingReminderDay));
    } catch (e) {
      console.warn("Failed to save licensingReminderDay:", e);
    }
  }, [licensingReminderDay]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_licensing', String(notifyLicensing));
    } catch (e) {
      console.warn("Failed to save notifyLicensing:", e);
    }
  }, [notifyLicensing]);

  const [notifyBudget, setNotifyBudget] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_budget');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyAppointments, setNotifyAppointments] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_appointments');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyCarServices, setNotifyCarServices] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_car_services');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyMedical, setNotifyMedical] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_medical');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [notifyRiskZones, setNotifyRiskZones] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_notify_risk_zones');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_ipva', String(notifyIpva));
    } catch (e) {
      console.warn("Failed to save notifyIpva to localStorage:", e);
    }
  }, [notifyIpva]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_budget', String(notifyBudget));
    } catch (e) {
      console.warn("Failed to save notifyBudget to localStorage:", e);
    }
  }, [notifyBudget]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_appointments', String(notifyAppointments));
    } catch (e) {
      console.warn("Failed to save notifyAppointments to localStorage:", e);
    }
  }, [notifyAppointments]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_car_services', String(notifyCarServices));
    } catch (e) {
      console.warn("Failed to save notifyCarServices to localStorage:", e);
    }
  }, [notifyCarServices]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_medical', String(notifyMedical));
    } catch (e) {
      console.warn("Failed to save notifyMedical to localStorage:", e);
    }
  }, [notifyMedical]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_notify_risk_zones', String(notifyRiskZones));
    } catch (e) {
      console.warn("Failed to save notifyRiskZones to localStorage:", e);
    }
  }, [notifyRiskZones]);

  // Check check-in time every 30 seconds
  useEffect(() => {
    const checkDailyCheckIn = () => {
      if (!dailyCheckInTime) return;
      const now = new Date();
      const currentHM = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      if (currentHM === dailyCheckInTime) {
        const todayStr = now.toDateString(); // e.g. "Wed Jul 15 2026"
        const lastNotified = localStorage.getItem('wealthflow_last_checkin_notified_date');
        
        if (lastNotified !== todayStr) {
          localStorage.setItem('wealthflow_last_checkin_notified_date', todayStr);
          
          // Try to request/trigger system notification
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              const notification = new Notification("WealthFlow • Check-in Diário", {
                body: "Hora do check-in diário! Deseja registrar os gastos de hoje?",
                icon: "/favicon.ico",
                tag: "daily-checkin"
              });
              notification.onclick = () => {
                window.focus();
                setCurrentTab('transactions');
                setShowAddTxForm(true);
              };
            } catch (err) {
              console.warn("Failed to dispatch system notification, falling back:", err);
            }
          }
          
          // Trigger double-layered user attention:
          // 1. Play dual-chime audio tone
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
            gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.35);
          } catch (e) {}

          // 2. In-App Interactive Confirmation Dialog
          showConfirm(
            "⏰ CHECK-IN DIÁRIO",
            "Chegou o seu horário de check-in diário! Deseja abrir a página de transações para registrar seus gastos e receitas de hoje?",
            () => {
              setCurrentTab('transactions');
              setShowAddTxForm(true);
            }
          );
        }
      }
    };

    checkDailyCheckIn();
    const interval = setInterval(checkDailyCheckIn, 30000);
    return () => clearInterval(interval);
  }, [dailyCheckInTime]);

  // Monthly Licensing Reminder logic
  useEffect(() => {
    if (!notifyLicensing) return;
    
    const checkLicensingReminder = () => {
      const now = new Date();
      const currentDay = now.getDate();
      
      if (currentDay === licensingReminderDay) {
        const currentMonthYearStr = `${now.getMonth()}_${now.getFullYear()}`;
        const lastNotified = localStorage.getItem('wealthflow_last_licensing_notified_month');
        
        if (lastNotified !== currentMonthYearStr) {
          localStorage.setItem('wealthflow_last_licensing_notified_month', currentMonthYearStr);
          
          const msgTitle = "🚗 Lembrete de Licenciamento Anual";
          const msgBody = `Hoje é dia ${licensingReminderDay}! Lembre-se de verificar o status de licenciamento anual da sua frota de veículos.`;

          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(msgTitle, {
                body: msgBody,
                icon: "/favicon.ico",
                tag: "licensing-reminder"
              });
            } catch (err) {
              console.warn("Failed to dispatch licensing notification:", err);
            }
          }

          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
            gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.4);
          } catch {}

          showConfirm(
            msgTitle,
            `${msgBody} Deseja ir para a aba de Perfil para gerenciar as configurações dos veículos agora?`,
            () => {
              setCurrentTab('profile');
            }
          );
        }
      }
    };

    checkLicensingReminder();
    const interval = setInterval(checkLicensingReminder, 10 * 60 * 1000); // Check every 10 mins
    return () => clearInterval(interval);
  }, [notifyLicensing, licensingReminderDay]);

  // Stateful Security Lock Config
  const [securityConfig, setSecurityConfig] = useState<SecurityConfig>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_security_config');
      return saved ? JSON.parse(saved) : {
        enabled: false,
        mode: 'PIN',
        password: 'admin',
        pin: '1234',
        biometricType: 'FACE_ID'
      };
    } catch {
      return {
        enabled: false,
        mode: 'PIN',
        password: 'admin',
        pin: '1234',
        biometricType: 'FACE_ID'
      };
    }
  });

  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_security_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        return !!parsed.enabled;
      }
    } catch {}
    return false;
  });

  // Google Sheets state lifted from TransactionsTab to App level for global background syncing
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    return localStorage.getItem('wealthflow_apps_script_url') || 
           localStorage.getItem('wealthflow_spreadsheet_url') || 
           localStorage.getItem('wealthflow_google_access_token') || 
           null;
  });
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    return localStorage.getItem('wealthflow_spreadsheet_url') || '';
  });
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedTime, setLastSyncedTime] = useState<string>(() => {
    return localStorage.getItem('wealthflow_last_synced_time') || '';
  });
  const [autoSync, setAutoSync] = useState<boolean>(() => {
    return localStorage.getItem('wealthflow_auto_sync') === 'true';
  });
  const [isGoogleDriveModalOpen, setIsGoogleDriveModalOpen] = useState<boolean>(false);

  // Load live data from Google Sheets SSOT & Cache on mount
  const loadDataFromSheets = async (showToast = false) => {
    setIsDbLoaded(false);
    try {
      let loadedFromSheets = false;
      const activeToken = googleToken;
      
      if (activeToken) {
        try {
          const sheetId = await sheetsService.obterOuCriarPlanilha(activeToken);
          if (!sheetId || sheetId === 'active_sheet' || sheetId.trim() === '') {
            console.warn("ID da planilha não configurado ou 'active_sheet'. Pulando carregamento remoto do Sheets.");
          } else {
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
            setRegisteredVehicles(sheetData.registeredVehicles);
            localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(sheetData.registeredVehicles));
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
            setCategoryBudgets(sheetData.categoryBudgets);
            localStorage.setItem('wealthflow_category_budgets', JSON.stringify(sheetData.categoryBudgets));
          }
          if (sheetData && Array.isArray(sheetData.groceryItems) && sheetData.groceryItems.length > 0) {
            setGroceryItems(sheetData.groceryItems);
            localStorage.setItem('wealthflow_grocery_items', JSON.stringify(sheetData.groceryItems));
          }
          loadedFromSheets = true;
          }
        } catch (e) {
          console.warn("Falha ao buscar dados da planilha, utilizando cache local:", e);
        }
      }

      if (!loadedFromSheets) {
        const txList = await getTransactionsFromDb();
        const cleanList = cleanDuplicateTransactions(txList);
        setTransactions(cleanList);
        
        const zoneList = await getRiskZonesFromDb();
        setRiskZones(zoneList);

        const infList = await getInfractionsFromDb();
        setInfractions(infList);

        const nonAppList = await getNonAppealedFromDb();
        setNonAppealed(nonAppList);

        const apptList = await getMedicalAppointmentsFromDb();
        setAppointments(apptList);

        const prescriptionList = await getMedicalPrescriptionsFromDb();
        setPrescriptions(prescriptionList);

        const vehicleList = await getRegisteredVehiclesFromDb();
        if (vehicleList && vehicleList.length > 0) {
          setRegisteredVehicles(vehicleList);
        }

        const compList = await getCompromissosFromDb();
        setCompromissos(compList);

        const dbPerfList = await getPerformedServicesFromDb();
        if (dbPerfList && dbPerfList.length > 0) {
          setPerformedServices(dbPerfList);
        }

        const dbSchedList = await getScheduledServicesFromDb();
        if (dbSchedList && dbSchedList.length > 0) {
          setScheduledServices(dbSchedList);
        }

        const dbGrocList = await getGroceryItemsFromDb();
        if (dbGrocList && dbGrocList.length > 0) {
          setGroceryItems(dbGrocList);
        }
      }

      const avatar = await getAvatarUrlFromDb();
      setAvatarUrl(avatar);

      const customCats = await getCustomCategoriesFromDb();
      if (customCats && customCats.length > 0) {
        setCustomCategories(customCats);
      }

      const secConfig = await getSecurityConfigFromDb();
      if (secConfig) {
        setSecurityConfig(secConfig);
        setIsAppLocked(!!secConfig.enabled);
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
    }
  };

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

  // Bank accounts & credit cards state for interactive transaction simulation
  const [bankAccountsState, setBankAccountsState] = useState<BankAccount[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_bank_accounts');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse bank accounts state:", e);
    }
    return bankAccounts;
  });

  const [creditCardsState, setCreditCardsState] = useState<CreditCard[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_credit_cards');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse credit cards state:", e);
    }
    return creditCards;
  });

  // Persist bank accounts and credit cards to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_bank_accounts', JSON.stringify(bankAccountsState));
    } catch (e) {
      console.warn("Failed to save bank accounts to localStorage:", e);
    }
  }, [bankAccountsState]);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_credit_cards', JSON.stringify(creditCardsState));
    } catch (e) {
      console.warn("Failed to save credit cards to localStorage:", e);
    }
  }, [creditCardsState]);

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

  // Sync Queue (Fila de Mudanças Pendentes) states and helpers
  interface PendingChange {
    id: string;
    type: string;
    title: string;
    timestamp: number;
    status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
    error?: string;
  }

  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_pending_changes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSyncQueueModal, setShowSyncQueueModal] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('wealthflow_pending_changes', JSON.stringify(pendingChanges));
    } catch (e) {}
  }, [pendingChanges]);

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
        promises.push(triggerSync(googleToken, false, transactions, [], riskZones, appointments, prescriptions, true));
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
    const unsubscribe = authService.initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
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
          await triggerSync(activeToken, true);
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
        triggerSync(activeToken, true);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // Periodic interval every 2 minutes while app is running
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        triggerSync(activeToken, true);
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
      triggerSync(googleToken, true);
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
        const catUpper = (catName || '').toUpperCase();

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
    overrideGroceryItems?: GroceryItem[]
  ) => {
    const activeToken = tokenToUse || getEffectiveGoogleToken();
    if (!activeToken) return;

    if (!isDbLoaded) {
      console.log("Sincronização adiada: banco de dados local ainda não inicializado.");
      return;
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

    // Check state sync key to avoid redundant or duplicate sync cycles on identical states
    const txsJson = JSON.stringify(currentTxs);
    const infsJson = JSON.stringify(currentInfracs);
    const zonesJson = JSON.stringify(currentZones);
    const apptsJson = JSON.stringify(currentAppts);
    const prescsJson = JSON.stringify(currentPrescs);
    const compJson = JSON.stringify(currentCompromissos);
    const vehJson = JSON.stringify(currentVehicles);
    const perfJson = JSON.stringify(currentPerfServices);
    const schedJson = JSON.stringify(currentSchedServices);
    const bankJson = JSON.stringify(currentBanks);
    const cardJson = JSON.stringify(currentCards);
    const grocJson = JSON.stringify(currentGroceryItems);
    const syncKey = `${txsJson}_${infsJson}_${zonesJson}_${apptsJson}_${prescsJson}_${compJson}_${vehJson}_${perfJson}_${schedJson}_${bankJson}_${cardJson}_${grocJson}`;
    if (lastSyncedTxRef.current === syncKey && !forceOverwriteSpreadsheet) {
      return;
    }

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
        overrideGroceryItems: currentGroceryItems
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
      const sheetId = await sheetsService.obterOuCriarPlanilha(activeToken);
      
      // Validation: Interrupt sync if sheet ID is 'active_sheet', empty, or undefined
      if (!sheetId || sheetId === 'active_sheet' || sheetId.trim() === '') {
        setIsSyncing(false);
        syncLockRef.current = false;
        if (!isBackground) {
          showAlert(
            "Configuração da Planilha Necessária 📊",
            "A URL ou ID da sua planilha do Google Sheets não está configurada ou é inválida. Por favor, acesse o menu de integração com o Google Drive para inserir a URL ou ID válida da sua planilha antes de iniciar a sincronização."
          );
        } else {
          console.warn("Sincronização interrompida: ID da planilha é inválido, vazio ou 'active_sheet'. Configure a URL/ID da planilha.");
        }
        return;
      }
      
      // 1. Always fetch current spreadsheet data to ensure two-way sync (what was edited on spreadsheet comes straight to phone)
      let sheetTxs: any[] = [];
      try {
        const rawSheetTxs = await sheetsService.buscarTransacoes(activeToken, sheetId);
        sheetTxs = Array.isArray(rawSheetTxs) ? rawSheetTxs : [];
      } catch (fetchErr) {
        console.warn("Aviso ao buscar transações da planilha durante sincronização:", fetchErr);
        sheetTxs = [];
      }

      let cleanMergedTxs = currentTxs;

      if (!forceOverwriteSpreadsheet) {
        // 2. Perform safe Two-way Merge
        // Load list of locally deleted transaction IDs from localStorage to prevent re-importing deleted rows
        let deletedIds: number[] = [];
        try {
          const deletedIdsStr = localStorage.getItem('wealthflow_deleted_tx_ids') || '[]';
          deletedIds = JSON.parse(deletedIdsStr);
        } catch (e) {}

        // Retrieve last synced timestamp to determine whether local changes are newer than spreadsheet
        const lastSyncedTimestampStr = localStorage.getItem('wealthflow_last_synced_timestamp') || '0';
        const lastSyncedTimestamp = parseInt(lastSyncedTimestampStr, 10);

        // Start with current local state transactions
        const txMap = new Map<number, any>();
        (Array.isArray(currentTxs) ? currentTxs : []).forEach(t => {
          if (t && typeof t === 'object' && t.id) txMap.set(t.id, t);
        });

        // Identify spreadsheet transaction IDs for fast lookup
        const validSheetTxs = Array.isArray(sheetTxs) ? sheetTxs : [];
        const sheetTxIds = new Set<number>(validSheetTxs.map(st => st?.id).filter(Boolean));

        // Track transactions deleted in Google Sheets
        const deletedInSheetIds: number[] = [];
        if (lastSyncedTimestamp > 0 && validSheetTxs.length > 0) {
          (Array.isArray(currentTxs) ? currentTxs : []).forEach(localTx => {
            if (!localTx || !localTx.id) return;
            const existsInSheet = sheetTxIds.has(localTx.id);
            const localUpdatedAt = localTx.updatedAt || 0;
            const isNewlyCreatedLocally = localUpdatedAt > lastSyncedTimestamp;

            // If a transaction was already synced to the spreadsheet before, but is now missing from it,
            // it means the user deleted it in Google Sheets directly.
            if (!existsInSheet && !isNewlyCreatedLocally) {
              txMap.delete(localTx.id);
              deletedInSheetIds.push(localTx.id);
            }
          });
        }

        let hasNewOrUpdatedFromSheet = false;
        const txsToSaveDb: any[] = [];

        validSheetTxs.forEach(st => {
          if (!st || typeof st !== 'object' || !st.id) return;
          // Skip if this transaction was explicitly deleted in the app
          if (deletedIds.includes(st.id)) return;

          const localTx = txMap.get(st.id);
          if (!localTx) {
            // New transaction entered by the user in the spreadsheet!
            txMap.set(st.id, st);
            txsToSaveDb.push(st);
            hasNewOrUpdatedFromSheet = true;
          } else {
            // Already exists locally. Compare fields to see if user modified it in the spreadsheet.
            const isDifferent = 
              localTx.descricao !== st.descricao ||
              localTx.valor !== st.valor ||
              localTx.categoria !== st.categoria ||
              localTx.data !== st.data ||
              localTx.status !== st.status ||
              localTx.tipo !== st.tipo ||
              localTx.obs !== st.obs ||
              localTx.km !== st.km ||
              localTx.litros !== st.litros ||
              localTx.precoLitro !== st.precoLitro ||
              localTx.veiculo !== st.veiculo;

            if (isDifferent) {
              const localUpdatedAt = localTx.updatedAt || 0;
              const isLocalNewer = localUpdatedAt > lastSyncedTimestamp;

              if (isLocalNewer) {
                // Local is newer! Keep localTx, don't overwrite with st.
                // It will be written back to the spreadsheet automatically in Step 3.
              } else {
                // Spreadsheet is newer! Merge st over localTx
                const updatedTx = { ...localTx, ...st, updatedAt: 0 };
                txMap.set(st.id, updatedTx);
                txsToSaveDb.push(updatedTx);
                hasNewOrUpdatedFromSheet = true;
              }
            }
          }
        });

        // Unified sorted list
        const mergedTxs = Array.from(txMap.values()).sort((a, b) => b.id - a.id);
        cleanMergedTxs = cleanDuplicateTransactions(mergedTxs);

        const hasDuplicatesCleaned = cleanMergedTxs.length < mergedTxs.length;

        // If updates came from the sheet, deletions occurred, or duplicates were cleaned, save them to state & DB
        if (hasNewOrUpdatedFromSheet || hasDuplicatesCleaned || deletedInSheetIds.length > 0) {
          setTransactions(cleanMergedTxs);
          localStorage.setItem('wealthflow_transactions', JSON.stringify(cleanMergedTxs));
          
          // Save new/updated transactions that are still in the clean list
          for (const tx of txsToSaveDb) {
            if (cleanMergedTxs.some(t => t.id === tx.id)) {
              await saveTransactionToDb(tx);
            }
          }

          // Delete any transactions from local storage that the user deleted directly in Google Sheets
          for (const idToDel of deletedInSheetIds) {
            await deleteTransactionFromDb(idToDel);
          }

          // Permanently delete any removed duplicates from local storage
          if (hasDuplicatesCleaned) {
            const cleanIds = new Set(cleanMergedTxs.map(t => t.id));
            const duplicateTxs = mergedTxs.filter(t => !cleanIds.has(t.id));
            for (const dup of duplicateTxs) {
              await deleteTransactionFromDb(dup.id);
            }
          }
        }
      }

      // Update stable reference to prevent redundant loop triggers
      const finalTxsJson = JSON.stringify(cleanMergedTxs);
      const finalInfsJson = JSON.stringify(currentInfracs);
      const finalZonesJson = JSON.stringify(currentZones);
      const finalApptsJson = JSON.stringify(currentAppts);
      const finalPrescsJson = JSON.stringify(currentPrescs);
      const finalCompJson = JSON.stringify(currentCompromissos);
      const finalVehJson = JSON.stringify(currentVehicles);
      const finalPerfJson = JSON.stringify(currentPerfServices);
      const finalSchedJson = JSON.stringify(currentSchedServices);
      const finalBankJson = JSON.stringify(currentBanks);
      const finalCardJson = JSON.stringify(currentCards);
      const finalGrocJson = JSON.stringify(currentGroceryItems);
      lastSyncedTxRef.current = `${finalTxsJson}_${finalInfsJson}_${finalZonesJson}_${finalApptsJson}_${finalPrescsJson}_${finalCompJson}_${finalVehJson}_${finalPerfJson}_${finalSchedJson}_${finalBankJson}_${finalCardJson}_${finalGrocJson}`;

      // 3. Write the fully updated merged list back to the spreadsheet
      const url = await sheetsService.sincronizarTudo(
        activeToken, 
        sheetId, 
        cleanMergedTxs, 
        currentInfracs,
        currentZones,
        currentAppts,
        currentPrescs,
        currentCompromissos,
        currentVehicles,
        currentPerfServices,
        currentSchedServices,
        currentBanks,
        currentCards,
        categoryBudgets,
        [],
        currentGroceryItems
      );
      
      setSpreadsheetUrl(url);
      const nowStr = new Date().toLocaleString('pt-BR');
      setLastSyncedTime(nowStr);
      
      localStorage.setItem('wealthflow_spreadsheet_url', url);
      localStorage.setItem('wealthflow_last_synced_time', nowStr);
      localStorage.setItem('wealthflow_last_synced_timestamp', String(syncStartTime));
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
      const isOfflineError = !navigator.onLine || errMsg.toLowerCase().includes("failed to fetch") || errMsg.toLowerCase().includes("network") || errMsg.toLowerCase().includes("offline");
      
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
          params.overrideGroceryItems
        );
      }
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleDriveModalOpen(true);
  };

  const handleConnectGoogleDrive = async (urlOrToken: string) => {
    const trimmed = urlOrToken.trim() || 'wealthflow_direct_sheets_connected';

    if (trimmed.includes('http') && !trimmed.includes('script.google.com') && !trimmed.includes('docs.google.com')) {
      throw new Error("URL ou domínio rejeitado. Por favor, utilize o link do Web App do Google Apps Script (script.google.com) ou a URL da planilha (docs.google.com).");
    }

    if (trimmed.includes('script.google.com')) {
      localStorage.setItem('wealthflow_apps_script_url', trimmed);
    } else if (trimmed.includes('docs.google.com/spreadsheets/d/')) {
      localStorage.setItem('wealthflow_spreadsheet_url', trimmed);
    }
    localStorage.setItem('wealthflow_google_access_token', trimmed);

    try {
      const sheetId = await sheetsService.obterOuCriarPlanilha(trimmed);
      const testData = await sheetsService.buscarTodosDados(trimmed, sheetId);

      if (!testData || (typeof testData === 'object' && (testData as any).status === 'error')) {
        throw new Error((testData as any).error || "A planilha respondeu com erro. Verifique se o Google Apps Script foi publicado como App da Web com acesso para 'Qualquer Pessoa'.");
      }

      const result = await authService.googleSignIn(trimmed);
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);

        let importedCount = 0;
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

        if (testData && Array.isArray(testData.riskZones) && testData.riskZones.length > 0) {
          setRiskZones(testData.riskZones);
          localStorage.setItem('wealthflow_riskzones', JSON.stringify(testData.riskZones));
        }
        if (testData && Array.isArray(testData.appointments) && testData.appointments.length > 0) {
          setAppointments(testData.appointments);
          localStorage.setItem('wealthflow_appointments', JSON.stringify(testData.appointments));
        }
        if (testData && Array.isArray(testData.prescriptions) && testData.prescriptions.length > 0) {
          setPrescriptions(testData.prescriptions);
          localStorage.setItem('wealthflow_prescriptions', JSON.stringify(testData.prescriptions));
        }
        if (testData && Array.isArray(testData.compromissos) && testData.compromissos.length > 0) {
          setCompromissos(testData.compromissos);
          localStorage.setItem('wealthflow_compromissos', JSON.stringify(testData.compromissos));
        }
        if (testData && Array.isArray(testData.registeredVehicles) && testData.registeredVehicles.length > 0) {
          setRegisteredVehicles(testData.registeredVehicles);
          localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(testData.registeredVehicles));
        }
        if (testData && Array.isArray(testData.performedServices) && testData.performedServices.length > 0) {
          setPerformedServices(testData.performedServices);
          localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(testData.performedServices));
        }
        if (testData && Array.isArray(testData.scheduledServices) && testData.scheduledServices.length > 0) {
          setScheduledServices(testData.scheduledServices);
          localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(testData.scheduledServices));
        }
        if (testData && Array.isArray(testData.groceryItems) && testData.groceryItems.length > 0) {
          setGroceryItems(testData.groceryItems);
          localStorage.setItem('wealthflow_grocery_items', JSON.stringify(testData.groceryItems));
        }

        const nowStr = new Date().toLocaleString('pt-BR');
        setLastSyncedTime(nowStr);
        localStorage.setItem('wealthflow_last_synced_time', nowStr);
        setSyncError(null);

        showAlert("Sincronizado com Sucesso 📊", `Conectado com sucesso à planilha! ${importedCount} lançamentos e abas sincronizados.`);
        setIsGoogleDriveModalOpen(false);
      }
    } catch (err: any) {
      console.error("Erro ao testar conexão Google Drive:", err);
      localStorage.removeItem('wealthflow_apps_script_url');
      localStorage.removeItem('wealthflow_spreadsheet_url');
      localStorage.removeItem('wealthflow_google_access_token');
      throw new Error("Falha ao testar conexão com a planilha: " + (err.message || "Não foi possível comunicar com o Google Apps Script. Verifique se o App da Web foi publicado com acesso para 'Qualquer Pessoa'."));
    }
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
        setRegisteredVehicles(sheetData.registeredVehicles);
        localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(sheetData.registeredVehicles));
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
        setCategoryBudgets(sheetData.categoryBudgets);
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
          await triggerSync(activeToken, true, currentTransactions, undefined, undefined, undefined, undefined, true);
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
          await triggerSync(activeToken, true, updated, undefined, undefined, undefined, undefined, true);
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
        await triggerSync(activeToken, true, updated, undefined, undefined, undefined, undefined, true);
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
        await triggerSync(activeToken, true, updated, undefined, undefined, undefined, undefined, true);
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
            await triggerSync(activeToken, true, [], undefined, undefined, undefined, undefined, true);
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
            const str = String(dateStr).trim();
            if (str.includes('/')) {
              const parts = str.split('/');
              if (parts.length === 3) {
                const day = parseInt(parts[0], 10);
                const month = parseInt(parts[1], 10) - 1;
                const year = parseInt(parts[2], 10);
                return new Date(year, month, day);
              }
            } else if (str.includes('-')) {
              const parts = str.split('-');
              if (parts.length === 3) {
                if (parts[0].length === 4) {
                  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                } else {
                  return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                }
              }
            }
            const d = new Date(str);
            return isNaN(d.getTime()) ? new Date(0) : d;
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
      triggerSync(activeToken, true, undefined, undefined, undefined, updated);
    }
  };

  const handleEditAppointment = async (id: string, updatedFields: Partial<MedicalAppointment>) => {
    const updated = appointments.map(appt => appt.id === id ? { ...appt, ...updatedFields, updatedAt: Date.now() } : appt);
    setAppointments(updated);
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
      triggerSync(activeToken, true, undefined, undefined, undefined, updated);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const backup = [...appointments];
    const updated = appointments.filter(appt => appt.id !== id);
    setAppointments(updated);
    try {
      await deleteMedicalAppointmentFromDb(id);
      const activeToken = getEffectiveGoogleToken();
      if (activeToken) {
        triggerSync(activeToken, true, undefined, undefined, undefined, updated);
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
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, updated);
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
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, updated);
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
      triggerSync(activeToken, true, undefined, undefined, undefined, undefined, undefined, false, updated);
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
    const updated = performedServices.map(s => s.id === id ? { ...s, ...updatedFields, updatedAt: Date.now() } : s);
    setPerformedServices(updated);
    localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(updated));
    const item = updated.find(s => s.id === id);
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
    const updated = performedServices.filter(s => s.id !== id);
    setPerformedServices(updated);
    localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(updated));
    try {
      const toDelete = backup.find(s => s.id === id);
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
    const updated = scheduledServices.map(s => s.id === id ? { ...s, ...updatedFields, updatedAt: Date.now() } : s);
    setScheduledServices(updated);
    localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(updated));
    const item = updated.find(s => s.id === id);
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
    const updated = scheduledServices.filter(s => s.id !== id);
    setScheduledServices(updated);
    localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(updated));
    try {
      const toDelete = backup.find(s => s.id === id);
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
        return <ExecutiveDashboardView />;
      case 'analysis':
        return (
          <AnalysisTab 
            transactions={transactions}
            onNavigate={handleTabNavigate}
            showAlert={showAlert}
          />
        );
      case 'receitas':
        return (
          <TransactionsTab 
            transactions={transactions}
            infractions={infractions}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportTransactions={handleImportTransactions}
            onWipeTransactions={handleWipeTransactions}
            onReindexTransactions={handleReindexTransactions}
            showAddForm={showAddTxForm}
            setShowAddForm={setShowAddTxForm}
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
            showAlert={showAlert}
            showConfirm={showConfirm}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            bankAccounts={bankAccountsState}
            onUpdateBankAccounts={setBankAccountsState}
            customCategories={customCategories}
            onTriggerBankIntegration={triggerBankIntegration}
            forcedFilter="RECEITA"
            isDbReady={isDbLoaded}
          />
        );
      case 'despesas':
      case 'transactions': // Fallback for safety
        return (
          <TransactionsTab 
            transactions={transactions}
            infractions={infractions}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportTransactions={handleImportTransactions}
            onWipeTransactions={handleWipeTransactions}
            onReindexTransactions={handleReindexTransactions}
            showAddForm={showAddTxForm}
            setShowAddForm={setShowAddTxForm}
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
            showAlert={showAlert}
            showConfirm={showConfirm}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            bankAccounts={bankAccountsState}
            onUpdateBankAccounts={setBankAccountsState}
            customCategories={customCategories}
            onTriggerBankIntegration={triggerBankIntegration}
            forcedFilter="DESPESA"
            isDbReady={isDbLoaded}
          />
        );
      case 'abastecimentos':
        return (
          <ErrorBoundary moduleName="Abastecimento">
            <TransactionsTab 
              transactions={transactions}
              infractions={infractions}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
              onImportTransactions={handleImportTransactions}
              onWipeTransactions={handleWipeTransactions}
              onReindexTransactions={handleReindexTransactions}
              showAddForm={showAddTxForm}
              setShowAddForm={setShowAddTxForm}
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
              showAlert={showAlert}
              showConfirm={showConfirm}
              registeredVehicles={registeredVehicles}
              setRegisteredVehicles={setRegisteredVehicles}
              bankAccounts={bankAccountsState}
              onUpdateBankAccounts={setBankAccountsState}
              customCategories={customCategories}
              onTriggerBankIntegration={triggerBankIntegration}
              forcedFilter="ABASTECIMENTO"
              isDbReady={isDbLoaded}
            />
          </ErrorBoundary>
        );
      case 'financas':
        return (
          <TransactionsTab 
            transactions={transactions}
            infractions={infractions}
            onAddTransaction={handleAddTransaction}
            onEditTransaction={handleEditTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onImportTransactions={handleImportTransactions}
            onWipeTransactions={handleWipeTransactions}
            onReindexTransactions={handleReindexTransactions}
            showAddForm={showAddTxForm}
            setShowAddForm={setShowAddTxForm}
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
            showAlert={showAlert}
            showConfirm={showConfirm}
            registeredVehicles={registeredVehicles}
            setRegisteredVehicles={setRegisteredVehicles}
            bankAccounts={bankAccountsState}
            onUpdateBankAccounts={setBankAccountsState}
            customCategories={customCategories}
            onTriggerBankIntegration={triggerBankIntegration}
            forcedFilter="FINANCAS"
            isDbReady={isDbLoaded}
          />
        );
      case 'oficina':
      case 'carservices': // Fallback for safety
        return (
          <CarServicesTab
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
          <CompromissosTab 
            compromissos={compromissos}
            onAddCompromisso={handleAddCompromisso}
            onEditCompromisso={handleEditCompromisso}
            onDeleteCompromisso={handleDeleteCompromisso}
            onNavigate={handleTabNavigate}
          />
        );
      case 'risk':
        return (
          <RiskZonesTab 
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
        return (
          <MedicalAppointmentsTab
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
        return (
          <ProfileTab 
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
          <IndicacoesTab 
            transactions={transactions}
            onNavigate={handleTabNavigate}
            showAlert={showAlert}
          />
        );
      case 'assistant':
      case 'assistente':
        return (
          <AssistantDashboardView
            transactions={transactions}
            initialAccountsTotal={bankAccountsState.reduce((sum, b) => sum + (b.saldo || 0), 0)}
          />
        );
      case 'documents':
      case 'ocr':
      case 'comprovantes':
        return (
          <DocumentScannerView
            existingTransactions={transactions}
            onAddTransaction={handleAddTransaction}
            showAlert={showAlert}
          />
        );
      case 'mercado':
      case 'listamercado':
      case 'grocery':
        return (
          <GroceryListTab
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
          <AnalysisTab 
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
                      ? 'Seu aplicativo está conectado à planilha WealthFlow Finance Data no Google Drive. Modificações são salvas e sincronizadas instantaneamente.' 
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

      <PixDetectedDialog
        isOpen={isPixDialogOpen}
        pix={activePix}
        onOptionSelect={handleConfirmPixOption}
        onClose={handleCancelPix}
      />

      <GoogleDriveModal
        isOpen={isGoogleDriveModalOpen}
        onClose={() => setIsGoogleDriveModalOpen(false)}
        onConnect={handleConnectGoogleDrive}
        currentValue={googleToken || spreadsheetUrl || ''}
      />
    </div>
  );
}
