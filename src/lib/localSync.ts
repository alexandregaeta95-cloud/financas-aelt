import { Transaction, RiskZone, Infraction, MedicalAppointment, MedicalPrescription, RegisteredVehicle, Compromisso, SecurityConfig, CarServicePerformed, CarServiceScheduled, GroceryItem } from '../types';
import { initialTransactions } from '../data/transactions';
import { initialRiskZones } from '../data/riskZones';
import { initialInfractions, nonAppealedInfractions } from '../data/infractions';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function markPendingSheetsSync() {
  try {
    localStorage.setItem('wealthflow_pending_sheets_sync', 'true');
  } catch (e) {
    console.warn('Erro ao marcar sincronização pendente:', e);
  }
}

// TRANSACTIONS
export async function getTransactionsFromDb(): Promise<Transaction[]> {
  try {
    const saved = localStorage.getItem('wealthflow_transactions');
    return saved ? JSON.parse(saved) : initialTransactions;
  } catch {
    return initialTransactions;
  }
}

export async function saveTransactionToDb(tx: Transaction): Promise<void> {
  try {
    const list = await getTransactionsFromDb();
    const idx = list.findIndex(t => String(t.id) === String(tx.id));
    if (idx >= 0) {
      list[idx] = tx;
    } else {
      list.unshift(tx);
    }
    localStorage.setItem('wealthflow_transactions', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar transação no cache local:', e);
  }
}

export async function deleteTransactionFromDb(id: number | string): Promise<void> {
  try {
    const list = await getTransactionsFromDb();
    const filtered = list.filter(t => String(t.id) !== String(id));
    localStorage.setItem('wealthflow_transactions', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar transação no cache local:', e);
  }
}

// SYNC TIMESTAMP
export async function getSyncTimestampFromDb(): Promise<number> {
  try {
    const saved = localStorage.getItem('wealthflow_last_synced_timestamp');
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
}

export async function saveSyncTimestampToDb(timestamp: number): Promise<void> {
  try {
    localStorage.setItem('wealthflow_last_synced_timestamp', String(timestamp));
  } catch (e) {
    console.warn('Erro ao salvar timestamp no cache local:', e);
  }
}

// RISK ZONES
export async function getRiskZonesFromDb(): Promise<RiskZone[]> {
  try {
    const saved = localStorage.getItem('wealthflow_riskzones');
    return saved ? JSON.parse(saved) : initialRiskZones;
  } catch {
    return initialRiskZones;
  }
}

export async function saveRiskZoneToDb(zone: RiskZone): Promise<void> {
  try {
    const list = await getRiskZonesFromDb();
    const idx = list.findIndex(z => String(z.id) === String(zone.id));
    if (idx >= 0) {
      list[idx] = zone;
    } else {
      list.push(zone);
    }
    localStorage.setItem('wealthflow_riskzones', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar zona de risco no cache local:', e);
  }
}

export async function deleteRiskZoneFromDb(id: number | string): Promise<void> {
  try {
    const list = await getRiskZonesFromDb();
    const filtered = list.filter(z => String(z.id) !== String(id));
    localStorage.setItem('wealthflow_riskzones', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar zona de risco no cache local:', e);
  }
}

// INFRACTIONS
export async function getInfractionsFromDb(): Promise<Infraction[]> {
  try {
    const saved = localStorage.getItem('wealthflow_infractions');
    return saved ? JSON.parse(saved) : initialInfractions;
  } catch {
    return initialInfractions;
  }
}

export async function saveInfractionToDb(inf: Infraction): Promise<void> {
  try {
    const list = await getInfractionsFromDb();
    const idx = list.findIndex(i => String(i.id) === String(inf.id));
    if (idx >= 0) {
      list[idx] = inf;
    } else {
      list.unshift(inf);
    }
    localStorage.setItem('wealthflow_infractions', JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar infração no cache local:', e);
  }
}

export async function deleteInfractionFromDb(id: number | string): Promise<void> {
  try {
    const list = await getInfractionsFromDb();
    const filtered = list.filter(i => String(i.id) !== String(id));
    localStorage.setItem('wealthflow_infractions', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Erro ao deletar infração no cache local:', e);
  }
}

// NON-APPEALED INFRACTIONS
export async function getNonAppealedFromDb(): Promise<any[]> {
  try {
    const saved = localStorage.getItem('wealthflow_nonappealed');
    return saved ? JSON.parse(saved) : (nonAppealedInfractions as any[]);
  } catch {
    return nonAppealedInfractions as any[];
  }
}

export async function deleteNonAppealedFromDb(id: number | string): Promise<void> {
  try {
    const list = await getNonAppealedFromDb();
    const filtered = list.filter(i => String(i.id) !== String(id));
    localStorage.setItem('wealthflow_nonappealed', JSON.stringify(filtered));
  } catch (e) {
    console.warn('Erro ao deletar recurso não solicitado no cache local:', e);
  }
}

// AVATAR URL
export async function getAvatarUrlFromDb(): Promise<string> {
  try {
    return localStorage.getItem('wealthflow_avatar_url') || '';
  } catch {
    return '';
  }
}

export async function saveAvatarUrlToDb(url: string): Promise<void> {
  try {
    localStorage.setItem('wealthflow_avatar_url', url);
  } catch (e) {
    console.warn('Erro ao salvar avatar no cache local:', e);
  }
}

// MEDICAL APPOINTMENTS
export async function getMedicalAppointmentsFromDb(): Promise<MedicalAppointment[]> {
  try {
    const saved = localStorage.getItem('wealthflow_appointments');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function saveMedicalAppointmentToDb(appt: MedicalAppointment): Promise<void> {
  try {
    const list = await getMedicalAppointmentsFromDb();
    const idx = list.findIndex(a => String(a.id) === String(appt.id));
    if (idx >= 0) {
      list[idx] = appt;
    } else {
      list.unshift(appt);
    }
    localStorage.setItem('wealthflow_appointments', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar consulta médica no cache local:', e);
  }
}

export async function deleteMedicalAppointmentFromDb(id: string): Promise<void> {
  try {
    const list = await getMedicalAppointmentsFromDb();
    const filtered = list.filter(a => String(a.id) !== String(id));
    localStorage.setItem('wealthflow_appointments', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar consulta médica no cache local:', e);
  }
}

// MEDICAL PRESCRIPTIONS
export async function getMedicalPrescriptionsFromDb(): Promise<MedicalPrescription[]> {
  try {
    const saved = localStorage.getItem('wealthflow_prescriptions');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function saveMedicalPrescriptionToDb(presc: MedicalPrescription): Promise<void> {
  try {
    const list = await getMedicalPrescriptionsFromDb();
    const idx = list.findIndex(p => String(p.id) === String(presc.id));
    if (idx >= 0) {
      list[idx] = presc;
    } else {
      list.unshift(presc);
    }
    localStorage.setItem('wealthflow_prescriptions', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar receita médica no cache local:', e);
  }
}

export async function deleteMedicalPrescriptionFromDb(id: string): Promise<void> {
  try {
    const list = await getMedicalPrescriptionsFromDb();
    const filtered = list.filter(p => String(p.id) !== String(id));
    localStorage.setItem('wealthflow_prescriptions', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar receita médica no cache local:', e);
  }
}

// REGISTERED VEHICLES
export async function getRegisteredVehiclesFromDb(): Promise<RegisteredVehicle[]> {
  try {
    const saved = localStorage.getItem('wealthflow_registered_vehicles');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function saveRegisteredVehicleToDb(vehicle: RegisteredVehicle): Promise<void> {
  try {
    const list = await getRegisteredVehiclesFromDb();
    const idx = list.findIndex(v => String(v.id) === String(vehicle.id));
    if (idx >= 0) {
      list[idx] = vehicle;
    } else {
      list.push(vehicle);
    }
    localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar veículo no cache local:', e);
  }
}

export async function deleteRegisteredVehicleFromDb(id: string): Promise<void> {
  try {
    const list = await getRegisteredVehiclesFromDb();
    const filtered = list.filter(v => String(v.id) !== String(id));
    localStorage.setItem('wealthflow_registered_vehicles', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar veículo no cache local:', e);
  }
}

// COMPROMISSOS
export async function getCompromissosFromDb(): Promise<Compromisso[]> {
  try {
    const saved = localStorage.getItem('wealthflow_compromissos');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function saveCompromissoToDb(item: Compromisso): Promise<void> {
  try {
    const list = await getCompromissosFromDb();
    const idx = list.findIndex(c => String(c.id) === String(item.id));
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem('wealthflow_compromissos', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar compromisso no cache local:', e);
  }
}

export async function deleteCompromissoFromDb(id: string): Promise<void> {
  try {
    const list = await getCompromissosFromDb();
    const filtered = list.filter(c => String(c.id) !== String(id));
    localStorage.setItem('wealthflow_compromissos', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar compromisso no cache local:', e);
  }
}

// CUSTOM CATEGORIES
export async function getCustomCategoriesFromDb(): Promise<string[]> {
  try {
    const saved = localStorage.getItem('wealthflow_custom_categories');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function saveCustomCategoriesToDb(categories: string[]): Promise<void> {
  try {
    localStorage.setItem('wealthflow_custom_categories', JSON.stringify(categories));
  } catch (e) {
    console.warn('Erro ao salvar categorias customizadas no cache local:', e);
  }
}

// SECURITY CONFIG
export async function getSecurityConfigFromDb(): Promise<SecurityConfig | null> {
  try {
    const saved = localStorage.getItem('wealthflow_security_config');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export async function saveSecurityConfigToDb(config: SecurityConfig): Promise<void> {
  try {
    localStorage.setItem('wealthflow_security_config', JSON.stringify(config));
  } catch (e) {
    console.warn('Erro ao salvar configuração de segurança no cache local:', e);
  }
}

// CAR SERVICES PERFORMED
export async function getPerformedServicesFromDb(): Promise<CarServicePerformed[]> {
  try {
    const saved = localStorage.getItem('wealthflow_car_services_performed');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function savePerformedServiceToDb(service: CarServicePerformed): Promise<void> {
  try {
    const list = await getPerformedServicesFromDb();
    const idx = list.findIndex(s => String(s.id) === String(service.id));
    if (idx >= 0) {
      list[idx] = service;
    } else {
      list.unshift(service);
    }
    localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar serviço realizado no cache local:', e);
  }
}

export async function deletePerformedServiceFromDb(id: string): Promise<void> {
  try {
    const list = await getPerformedServicesFromDb();
    const filtered = list.filter(s => String(s.id) !== String(id));
    localStorage.setItem('wealthflow_car_services_performed', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar serviço realizado no cache local:', e);
  }
}

// CAR SERVICES SCHEDULED
export async function getScheduledServicesFromDb(): Promise<CarServiceScheduled[]> {
  try {
    const saved = localStorage.getItem('wealthflow_car_services_scheduled');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function saveScheduledServiceToDb(service: CarServiceScheduled): Promise<void> {
  try {
    const list = await getScheduledServicesFromDb();
    const idx = list.findIndex(s => String(s.id) === String(service.id));
    if (idx >= 0) {
      list[idx] = service;
    } else {
      list.unshift(service);
    }
    localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar serviço agendado no cache local:', e);
  }
}

export async function deleteScheduledServiceFromDb(id: string): Promise<void> {
  try {
    const list = await getScheduledServicesFromDb();
    const filtered = list.filter(s => String(s.id) !== String(id));
    localStorage.setItem('wealthflow_car_services_scheduled', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar serviço agendado no cache local:', e);
  }
}

// GROCERY ITEMS (LISTA DE MERCADO)
export async function getGroceryItemsFromDb(): Promise<GroceryItem[]> {
  try {
    const saved = localStorage.getItem('wealthflow_grocery_items');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export async function saveGroceryItemToDb(item: GroceryItem): Promise<void> {
  try {
    const list = await getGroceryItemsFromDb();
    const idx = list.findIndex(g => String(g.id) === String(item.id));
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    localStorage.setItem('wealthflow_grocery_items', JSON.stringify(list));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar item de mercado no cache local:', e);
  }
}

export async function saveAllGroceryItemsToDb(items: GroceryItem[]): Promise<void> {
  try {
    localStorage.setItem('wealthflow_grocery_items', JSON.stringify(items));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao salvar lista de mercado no cache local:', e);
  }
}

export async function deleteGroceryItemFromDb(id: string): Promise<void> {
  try {
    const list = await getGroceryItemsFromDb();
    const filtered = list.filter(g => String(g.id) !== String(id));
    localStorage.setItem('wealthflow_grocery_items', JSON.stringify(filtered));
    markPendingSheetsSync();
  } catch (e) {
    console.warn('Erro ao deletar item de mercado no cache local:', e);
  }
}
