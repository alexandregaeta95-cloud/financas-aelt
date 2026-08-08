import { safeJsonParse } from './safeParse';
import {
  Transaction,
  RiskZone,
  Infraction,
  MedicalAppointment,
  MedicalPrescription,
  Compromisso,
  RegisteredVehicle,
  CarServicePerformed,
  CarServiceScheduled,
  BankAccount,
  CreditCard,
  GroceryItem,
  WorkshopItem
} from '../types';

export { safeJsonParse, safeJsonParse as safeParse };

const DEV_FALLBACK_SPREADSHEET_ID = '1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4';
const DEV_FALLBACK_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsC73N1O1vU2oN4lD0HneqWLM964XXkqHNDbeC8MH0uy5HUFIEaCZVQ7lX5sSma4LZGg/exec';

export const DEFAULT_SPREADSHEET_ID =
  import.meta.env.VITE_DEFAULT_SPREADSHEET_ID ||
  (import.meta.env.DEV ? DEV_FALLBACK_SPREADSHEET_ID : '');

export const DEFAULT_SPREADSHEET_URL = DEFAULT_SPREADSHEET_ID
  ? `https://docs.google.com/spreadsheets/d/${DEFAULT_SPREADSHEET_ID}/edit`
  : '';

export const DEFAULT_APPS_SCRIPT_URL =
  import.meta.env.VITE_DEFAULT_APPS_SCRIPT_URL ||
  (import.meta.env.DEV ? DEV_FALLBACK_APPS_SCRIPT_URL : '');

export interface User {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export interface AppsScriptResponse<T = unknown> {
  status?: 'success' | 'error';
  httpCode?: number;
  error?: string;
  data?: T;
  message?: string;
  stats?: {
    executionTimeMs?: number;
    timestamp?: string;
  };
  report?: unknown;
  [key: string]: unknown;
}

export interface MappedRiskZone {
  id: number | string;
  descricao: string;
  nivelDeRisco: string;
  latitudi: number | string;
  longitude: number | string;
  raioM: number;
  ativo: string;
  mensagemDeAlerta: string;
  dataRegistro: string;
  obs: string;
}

export interface MappedWorkshopItem {
  id: string;
  data: string;
  descricao: string;
  km: number | string;
  valorAPG: number;
  valorPago: number;
  oficinaNome: string;
  comprovanteUrl: string;
  observacoes: string;
  veiculoId: string;

  // Column Header Aliases for 14_Oficina
  ID: string;
  Data: string;
  Descrição: string;
  KM: number | string;
  Valor_A_PG: number;
  Valor_Pago: number;
  Oficina_Nome: string;
  Comprovante_Url: string;
  Observações: string;
  VeiculoID: string;
}

export interface MappedVehicle {
  id: string;
  descricao: string;
  motorista: string;
  placa: string;
  renavan: string;
  chassi: string;
  marca: string;
  modelo: string;
  ano: string | number;
  anoFabricacao: string | number;

  // Column Header Aliases for 9_Veiculos
  ID: string;
  Descrição: string;
  Motorista: string;
  Placa: string;
  Renavan: string;
  Chassi: string;
  Marca: string;
  Modelo: string;
  Ano: string | number;
  Ano_Fabricação: string | number;
}

export interface MappedCompromisso {
  id: string;
  titulo: string;
  data: string;
  hora: string;
  descricao: string;
  cor: string;
  piscando: boolean;
  lembreteAtivo: boolean;
  diasAntecedencia: number;
  concluido: boolean;

  // Column Header Aliases for 19_Agenda_E_Compromissos
  ID: string;
  Titulo: string;
  Data: string;
  Hora: string;
  Descrição: string;
  Cor_De_Identificação: string;
  'Efeito_Alerta_(Piscando)': string;
  Lembrete_Ativo: string;
  Dias_De_Antecedência: number;
}

export interface MappedAppointment {
  id: string;
  especialidade: string;
  medico: string;
  data: string;
  hora: string;
  local: string;
  lembreteAtivo: boolean;
  status: string;
  observacoes: string;

  // Column Header Aliases for 6_Consultas_Médicas
  ID: string;
  Especialidade: string;
  Médico: string;
  Medico: string;
  Data: string;
  Horas: string;
  Hora: string;
  Local: string;
  Lembrete_Ativo: string;
  Status: string;
  Observação: string;
  Observações: string;
  Observacao: string;
  Observacoes: string;
}

export interface MappedTransaction extends Omit<Partial<Transaction>, 'id' | 'bancoId' | 'km' | 'litros' | 'precoLitro' | 'kmPercorrido' | 'mediaKmL'> {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  valorPg: number;
  bancoId: string | number;
  cartaoId: string | number;
  formaPagamento: string;
  tipo: string;
  categoria: string;
  status: string;
  km: number | string;
  litros: number | string;
  precoLitro: number | string;
  completouTanque: boolean;
  kmPercorrido: number | string;
  mediaKmL: number | string;
  veiculo: string;
  descricaoVeiculo: string;
  motorista: string;
  nomePosto: string;
  localizacaoPosto: string;
  comprovanteUrl: string;
  obs: string;

  // Explicit 24 Column Aliases for Aba 1_Lancamentos & Aba 4_Abastecimentos
  ID: string;
  Data: string;
  Descrição: string;
  Valor: number;
  Valor_PG: number;
  Valor_Pago: number;
  Banco_Id: string | number;
  Cartão_Id: string | number;
  Cartao_Id: string | number;
  Forma_Pagamento: string;
  Tipo: string;
  Categoria: string;
  Status: string;
  KM: number | string;
  Litros: number | string;
  Preço_Litro: number | string;
  Preco_Litro: number | string;
  Completou_O_Tanque: string;
  KM_Percorrido: number | string;
  'Média_(Km/L)': number | string;
  'Media_(Km/L)': number | string;
  Veiculo: string;
  Descrição_Do_Veículo: string;
  Descrição_Do_Viculo: string;
  Descricao_Do_Veiculo: string;
  Motorista: string;
  Nome_Posto: string;
  Localização_Do_Posto: string;
  Localizacao_Do_Posto: string;
  Comprovante_Url: string;
  OBS: string;
}

export interface GoogleSyncPayload {
  action: string;
  spreadsheetId: string;
  forceOverwrite: boolean;
  deletedIds: (string | number)[];
  transactions: MappedTransaction[];
  abastecimentos: MappedTransaction[];
  '4_Abastecimentos': MappedTransaction[];
  infractions: Infraction[];
  riskZones: MappedRiskZone[];
  appointments: MappedAppointment[];
  consultas: MappedAppointment[];
  consultasMedicas: MappedAppointment[];
  '6_Consultas_Médicas': MappedAppointment[];
  prescriptions: MedicalPrescription[];
  compromissos: MappedCompromisso[];
  registeredVehicles: MappedVehicle[];
  veiculos: MappedVehicle[];
  '9_Veiculos': MappedVehicle[];
  performedServices: MappedWorkshopItem[];
  workshop: MappedWorkshopItem[];
  oficina: MappedWorkshopItem[];
  '14_Oficina': MappedWorkshopItem[];
  scheduledServices: CarServiceScheduled[];
  scheduledMaintenance: CarServiceScheduled[];
  agenda: MappedCompromisso[];
  '19_Agenda_E_Compromissos': MappedCompromisso[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  analysis: unknown[];
  profile: unknown[];
  groceryItems: GroceryItem[];
  categoryBudgets: Record<string, number>;
  customCategories: string[];
}

export const toSafeString = (val: unknown): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url;
    if (typeof obj.token === 'string') return obj.token;
    if (typeof obj.spreadsheetId === 'string') return obj.spreadsheetId;
    if (typeof obj.id === 'string') return obj.id;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

export const sanitizeAppsScriptUrl = (inputUrl?: unknown): string => {
  const str = toSafeString(inputUrl).trim();
  const storedScriptUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthflow_apps_script_url') : null;
  
  let candidate = str;
  if (!candidate || candidate === 'wealthflow_direct_sheets_connected' || candidate.includes('docs.google.com/spreadsheets')) {
    if (storedScriptUrl && storedScriptUrl.trim() && storedScriptUrl.includes('script.google.com')) {
      candidate = storedScriptUrl.trim();
    } else {
      candidate = DEFAULT_APPS_SCRIPT_URL;
    }
  }

  let clean = candidate;

  // Raw ID starting with AKfy...
  if (!clean.startsWith('http') && (clean.startsWith('AKfy') || clean.length > 20)) {
    clean = `https://script.google.com/macros/s/${clean}/exec`;
  }

  // If user pasted script.googleusercontent.com temporary URL, extract macro ID or fallback
  if (clean.includes('script.googleusercontent.com')) {
    const match = clean.match(/s\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      clean = `https://script.google.com/macros/s/${match[1]}/exec`;
    } else {
      clean = storedScriptUrl && storedScriptUrl.includes('script.google.com') ? storedScriptUrl : DEFAULT_APPS_SCRIPT_URL;
    }
  }

  // Replace /dev with /exec and clean query params
  if (clean.includes('script.google.com')) {
    const queryParts = clean.split('?');
    let baseUrl = queryParts[0].replace(/\/+$/, '');
    if (baseUrl.endsWith('/dev')) {
      baseUrl = baseUrl.slice(0, -4) + '/exec';
    } else if (!baseUrl.endsWith('/exec')) {
      baseUrl = `${baseUrl}/exec`;
    }
    const query = queryParts.length > 1 ? '?' + queryParts.slice(1).join('?') : '';
    clean = baseUrl + query;
  }

  return clean.startsWith('http') ? clean : DEFAULT_APPS_SCRIPT_URL;
};

export const callAppsScript = async <T = unknown>(
  scriptUrl: unknown,
  payloadOrAction: unknown,
  method: 'GET' | 'POST' = 'POST'
): Promise<AppsScriptResponse<T>> => {
  const cleanUrl = sanitizeAppsScriptUrl(scriptUrl);
  const savedSheetId = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_sheet_id')) : '';
  const payloadObj = (typeof payloadOrAction === 'object' && payloadOrAction !== null) ? (payloadOrAction as Record<string, unknown>) : null;
  const paramSheetId = payloadObj && payloadObj.spreadsheetId ? toSafeString(payloadObj.spreadsheetId) : '';
  const candidateId = paramSheetId || savedSheetId;
  const cleanSheetId = (candidateId && candidateId !== 'active_sheet' && !candidateId.startsWith('http')) ? candidateId : DEFAULT_SPREADSHEET_ID;

  if (method === 'POST' && payloadObj) {
    if (!payloadObj.spreadsheetId || payloadObj.spreadsheetId === 'active_sheet') {
      payloadObj.spreadsheetId = cleanSheetId;
    }
  }

  // 1. Try server-side proxy endpoint first (bypasses browser CORS and handles 302 redirects)
  try {
    let proxyBody: unknown = payloadOrAction;
    let targetUrl = cleanUrl;

    if (method === 'GET') {
      const actionParam = typeof payloadOrAction === 'string' ? payloadOrAction : (payloadObj?.action ? String(payloadObj.action) : 'fetchAllData');
      let query = `action=${encodeURIComponent(actionParam)}`;
      if (cleanSheetId) query += `&spreadsheetId=${encodeURIComponent(cleanSheetId)}`;
      targetUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}${query}`;
      proxyBody = undefined;
    }

    const proxyRes = await fetch('/api/google-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: targetUrl,
        method,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: proxyBody
      })
    });

    if (proxyRes.ok) {
      const proxyResult = await proxyRes.json();
      if (proxyResult.ok) {
        const rawData = proxyResult.data;
        let parsed: unknown = null;
        if (typeof rawData === 'string') {
          parsed = safeJsonParse(rawData, null);
        } else {
          parsed = rawData;
        }
        if (parsed && typeof parsed === 'object') {
          const parsedObj = parsed as Record<string, unknown>;
          return (parsedObj.data || parsed) as AppsScriptResponse<T>;
        }
      } else {
        console.warn(`[Apps Script Proxy HTTP ${proxyResult.status}] Error:`, proxyResult.statusText || proxyResult.data);
        return {
          status: 'error',
          httpCode: proxyResult.status,
          error: `Google Apps Script retornou erro HTTP ${proxyResult.status} (${proxyResult.statusText || 'Não encontrado'})`
        };
      }
    }
  } catch (proxyErr) {
    console.warn("Proxy endpoint unavailable, falling back to direct fetch:", proxyErr);
  }

  // 2. Direct fetch fallback
  try {
    let fetchUrl = cleanUrl;
    const fetchOptions: RequestInit = {
      method,
      mode: 'cors',
      redirect: 'follow',
    };

    if (method === 'GET') {
      const actionParam = typeof payloadOrAction === 'string' ? payloadOrAction : (payloadObj?.action ? String(payloadObj.action) : 'fetchAllData');
      let query = `action=${encodeURIComponent(actionParam)}`;
      if (cleanSheetId) query += `&spreadsheetId=${encodeURIComponent(cleanSheetId)}`;
      fetchUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}${query}`;
    } else {
      fetchOptions.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      fetchOptions.body = typeof payloadOrAction === 'string' ? payloadOrAction : JSON.stringify(payloadOrAction);
    }

    const directRes = await fetch(fetchUrl, fetchOptions);
    if (directRes.ok) {
      const text = await directRes.text();
      const parsed = safeJsonParse(text, null);
      if (parsed && typeof parsed === 'object') {
        const parsedObj = parsed as Record<string, unknown>;
        return (parsedObj.data || parsed) as AppsScriptResponse<T>;
      }
    } else {
      return {
        status: 'error',
        httpCode: directRes.status,
        error: `Falha na comunicação com o Google Apps Script (HTTP ${directRes.status} ${directRes.statusText})`
      };
    }
  } catch (directErr: unknown) {
    const err = directErr as Error;
    console.error("Erro na comunicação com o Google Apps Script:", directErr);
    return {
      status: 'error',
      error: `Falha na comunicação com o Google Apps Script: ${err?.message || 'Failed to fetch'}`
    };
  }

  return { status: 'error', error: 'Falha na comunicação com o Google Apps Script.' };
};

export const buildSyncPayload = (
  spreadsheetId: string | null | undefined,
  transactions: Transaction[] = [],
  infractions: Infraction[] = [],
  riskZones: RiskZone[] = [],
  appointments: MedicalAppointment[] = [],
  prescriptions: MedicalPrescription[] = [],
  compromissos: Compromisso[] = [],
  registeredVehicles: RegisteredVehicle[] = [],
  performedServices: CarServicePerformed[] = [],
  scheduledServices: CarServiceScheduled[] = [],
  bankAccounts: BankAccount[] = [],
  creditCards: CreditCard[] = [],
  categoryBudgets: Record<string, number> = {},
  customCategories: string[] = [],
  groceryItems: GroceryItem[] = [],
  forceOverwrite: boolean = false,
  _sheetTxCount?: number,
  scheduledMaintenance: CarServiceScheduled[] = [],
  agenda: Compromisso[] = [],
  workshop: WorkshopItem[] | CarServicePerformed[] = [],
  analysis: unknown[] = [],
  profile: unknown[] = [],
  deletedIds: (string | number)[] = []
): GoogleSyncPayload => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;

  const mappedRiskZones: MappedRiskZone[] = (Array.isArray(riskZones) ? riskZones : []).map((item: RiskZone) => {
    const itemObj = item as unknown as Record<string, unknown>;
    return {
      id: item.id !== undefined && item.id !== null ? item.id : (itemObj.ID ? (itemObj.ID as string | number) : Date.now()),
      descricao: item.descricao || item.nomeLocal || (itemObj.nome as string) || (itemObj.Descrição as string) || 'ZONA DE RISCO',
      nivelDeRisco: item.nivelDeRisco || item.nivelRisco || 'BAIXO',
      latitudi: item.latitudi || item.latitude || (itemObj.Latitudi as string) || '',
      longitude: item.longitude || (itemObj.Longitude as string) || '',
      raioM: item.raioM !== undefined ? Number(item.raioM) : Number(item.raioMetros || itemObj['Raio_(M)'] || 100),
      ativo: (item.ativo === true || String(item.ativo).toUpperCase() === 'SIM' || String(item.ativo) === 'TRUE') ? 'SIM' : 'NÃO',
      mensagemDeAlerta: item.mensagemDeAlerta || item.mensagem || (itemObj.Mensagem_De_Alerta as string) || '',
      dataRegistro: item.dataRegistro || (itemObj.Data_Registro as string) || new Date().toLocaleDateString('pt-BR'),
      obs: item.obs || (itemObj.OBS as string) || item.som || ''
    };
  });

  const rawWorkshopSource = (Array.isArray(workshop) && workshop.length > 0)
    ? workshop
    : (Array.isArray(performedServices) ? performedServices : []);

  const mappedWorkshop: MappedWorkshopItem[] = rawWorkshopSource.map((item: WorkshopItem | CarServicePerformed) => {
    const itemObj = item as unknown as Record<string, unknown>;
    let rawDate = item.data || (itemObj.Data as string) || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!rawDate) rawDate = new Date().toLocaleDateString('pt-BR');

    const rawValAPG = itemObj.valorAPG ?? itemObj['Valor_A_PG'] ?? itemObj.valorAPagar ?? 0;
    const rawValPago = itemObj.valorPago ?? itemObj['Valor_Pago'] ?? itemObj.valor ?? 0;

    const valAPGNum = typeof rawValAPG === 'string' ? (parseFloat(rawValAPG.replace(/\./g, '').replace(',', '.')) || 0) : Number(rawValAPG || 0);
    const valPagoNum = typeof rawValPago === 'string' ? (parseFloat(rawValPago.replace(/\./g, '').replace(',', '.')) || 0) : Number(rawValPago || 0);
    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : String(Date.now());
    const descStr = item.descricao || (itemObj['Descrição'] as string) || (itemObj['Descrição do Serviço'] as string) || '';
    const kmVal = item.km !== undefined && item.km !== null ? item.km : ((itemObj['KM'] as string | number) || '');
    const oficinaStr = (item as WorkshopItem).oficinaNome || (item as CarServicePerformed).oficina || (itemObj['Oficina_Nome'] as string) || (itemObj['Oficina/Estabelecimento'] as string) || '';
    const compStr = item.comprovanteUrl || (itemObj.comprovante as string) || (itemObj['Comprovante_Url'] as string) || '';
    const obsStr = item.observacoes || (item as CarServicePerformed).obs || (itemObj['Observações'] as string) || '';
    const vehIdStr = item.veiculoId || (item as CarServicePerformed).veiculoDescricao || (itemObj.veiculo as string) || (itemObj['VeiculoID'] as string) || (itemObj['Veículo'] as string) || '';

    return {
      id: idStr,
      data: rawDate,
      descricao: descStr,
      km: kmVal,
      valorAPG: valAPGNum,
      valorPago: valPagoNum,
      oficinaNome: oficinaStr,
      comprovanteUrl: compStr,
      observacoes: obsStr,
      veiculoId: vehIdStr,

      // Column Header Aliases for 14_Oficina
      ID: idStr,
      Data: rawDate,
      Descrição: descStr,
      KM: kmVal,
      Valor_A_PG: valAPGNum,
      Valor_Pago: valPagoNum,
      Oficina_Nome: oficinaStr,
      Comprovante_Url: compStr,
      Observações: obsStr,
      VeiculoID: vehIdStr
    };
  });

  const mappedVehicles: MappedVehicle[] = (Array.isArray(registeredVehicles) ? registeredVehicles : []).map((item: RegisteredVehicle) => {
    const itemObj = item as unknown as Record<string, unknown>;
    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : String(Date.now());
    const descStr = item.descricao || (itemObj['Descrição'] as string) || item.nome || item.modelo || '';
    const motStr = item.motorista || (itemObj['Motorista'] as string) || '';
    const placaStr = item.placa || (itemObj['Placa'] as string) || '';
    const renavanStr = item.renavan || (itemObj['Renavan'] as string) || (itemObj['Renavam'] as string) || '';
    const chassiStr = item.chassi || (itemObj['Chassi'] as string) || '';
    const marcaStr = item.marca || (itemObj['Marca'] as string) || '';
    const modeloStr = item.modelo || (itemObj['Modelo'] as string) || '';
    const anoVal = item.ano !== undefined && item.ano !== null ? item.ano : ((itemObj['Ano'] as string | number) || '');
    const anoFabVal = item.anoFabricacao !== undefined && item.anoFabricacao !== null ? item.anoFabricacao : ((itemObj['Ano_Fabricação'] as string | number) || '');
    const mesFinalVal = item.mesFinalPlaca !== undefined && item.mesFinalPlaca !== null ? item.mesFinalPlaca : ((itemObj['Mês_Final_Placa'] as string | number) || '');
    const kmAtualVal = item.kmAtual !== undefined && item.kmAtual !== null ? item.kmAtual : ((itemObj['KM_Atual'] as string | number) || '');
    const combStr = item.combustivel || (itemObj['Combustível'] as string) || '';

    return {
      id: idStr,
      descricao: descStr,
      motorista: motStr,
      placa: placaStr,
      renavan: renavanStr,
      chassi: chassiStr,
      marca: marcaStr,
      modelo: modeloStr,
      ano: anoVal,
      anoFabricacao: anoFabVal,
      mesFinalPlaca: mesFinalVal,
      kmAtual: kmAtualVal,
      combustivel: combStr,

      // Column Header Aliases for 9_Veiculos
      ID: idStr,
      Descrição: descStr,
      Motorista: motStr,
      Placa: placaStr,
      Renavan: renavanStr,
      Chassi: chassiStr,
      Marca: marcaStr,
      Modelo: modeloStr,
      Ano: anoVal,
      Ano_Fabricação: anoFabVal
    };
  });

  const rawCompList = Array.isArray(compromissos) && compromissos.length > 0 ? compromissos : (Array.isArray(agenda) ? agenda : []);
  const mappedCompromissos: MappedCompromisso[] = rawCompList.map((item: Compromisso) => {
    const itemObj = item as unknown as Record<string, unknown>;
    let rawDate = item.data || (itemObj.Data as string) || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!rawDate) rawDate = new Date().toLocaleDateString('pt-BR');

    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : String(Date.now());
    const titStr = item.titulo || (itemObj['Titulo'] as string) || (itemObj['Título'] as string) || '';
    const horaStr = item.hora || (itemObj['Hora'] as string) || '';
    const descStr = item.descricao || (itemObj['Descrição'] as string) || '';
    const corStr = item.cor || (itemObj['Cor_De_Identificação'] as string) || '#3b82f6';
    const piscVal = item.piscando === true || String(item.piscando).toUpperCase() === 'SIM' || String(itemObj['Efeito_Alerta_(Piscando)']).toUpperCase() === 'SIM' ? 'SIM' : 'NÃO';
    const lembVal = item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM' || String(itemObj['Lembrete_Ativo']).toUpperCase() === 'SIM' ? 'SIM' : 'NÃO';
    const diasVal = item.diasAntecedencia !== undefined && item.diasAntecedencia !== null ? Number(item.diasAntecedencia) : (Number(itemObj['Dias_De_Antecedência']) || 1);
    const concVal = item.concluido === true || String(item.concluido).toUpperCase() === 'SIM' || String(itemObj['Concluído']).toUpperCase() === 'SIM';

    return {
      id: idStr,
      titulo: titStr,
      data: rawDate,
      hora: horaStr,
      descricao: descStr,
      cor: corStr,
      piscando: item.piscando ?? (piscVal === 'SIM'),
      lembreteAtivo: item.lembreteAtivo ?? (lembVal === 'SIM'),
      diasAntecedencia: diasVal,
      concluido: concVal,

      // Column Header Aliases for 19_Agenda_E_Compromissos
      ID: idStr,
      Titulo: titStr,
      Data: rawDate,
      Hora: horaStr,
      Descrição: descStr,
      Cor_De_Identificação: corStr,
      'Efeito_Alerta_(Piscando)': piscVal,
      Lembrete_Ativo: lembVal,
      Dias_De_Antecedência: diasVal
    };
  });

  const rawApptsSource = Array.isArray(appointments) && appointments.length > 0 ? appointments : [];
  const mappedAppointments: MappedAppointment[] = rawApptsSource.map((item: MedicalAppointment) => {
    const itemObj = item as unknown as Record<string, unknown>;
    let rawDate = item.data || (itemObj.Data as string) || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!rawDate) rawDate = new Date().toLocaleDateString('pt-BR');

    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : String(Date.now());
    const espStr = item.especialidade || (itemObj['Especialidade'] as string) || '';
    const medStr = item.medico || (itemObj['Médico'] as string) || (itemObj['Medico'] as string) || '';
    const horaStr = item.hora || (itemObj['Horas'] as string) || (itemObj['Hora'] as string) || '';
    const locStr = item.local || (itemObj['Local'] as string) || '';
    const lembVal = item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM' || String(itemObj['Lembrete_Ativo']).toUpperCase() === 'SIM' ? 'SIM' : 'NÃO';
    const statusStr = item.status || (itemObj['Status'] as string) || 'AGENDADO';
    const obsStr = item.obs || (itemObj['Observação'] as string) || (itemObj['Observações'] as string) || '';

    return {
      id: idStr,
      especialidade: espStr,
      medico: medStr,
      data: rawDate,
      hora: horaStr,
      local: locStr,
      lembreteAtivo: item.lembreteAtivo ?? (lembVal === 'SIM'),
      status: statusStr,
      observacoes: obsStr,

      // Column Header Aliases for 6_Consultas_Médicas
      ID: idStr,
      Especialidade: espStr,
      Médico: medStr,
      Medico: medStr,
      Data: rawDate,
      Horas: horaStr,
      Hora: horaStr,
      Local: locStr,
      Lembrete_Ativo: lembVal,
      Status: statusStr,
      Observação: obsStr,
      Observações: obsStr,
      Observacao: obsStr,
      Observacoes: obsStr
    };
  });

  const mappedTransactions: MappedTransaction[] = (Array.isArray(transactions) ? transactions : []).map((t: Transaction, idx: number) => {
    const tObj = t as unknown as Record<string, unknown>;
    let rawDate = t.data || (tObj.Data as string) || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!rawDate) rawDate = new Date().toLocaleDateString('pt-BR');

    const idStr = (t.id !== undefined && t.id !== null && String(t.id).trim() !== '') 
      ? String(t.id) 
      : ((tObj.ID !== undefined && tObj.ID !== null && String(tObj.ID).trim() !== '') 
        ? String(tObj.ID) 
        : String(Date.now() + Math.floor(Math.random() * 10000000) + idx));
    const descStr = t.descricao || (tObj.Descrição as string) || '';
    const valorNum = typeof t.valor === 'number' ? t.valor : (parseFloat(String(t.valor || 0).replace(',', '.')) || 0);
    const valorPgNum = typeof t.valorPg === 'number' ? t.valorPg : (typeof tObj.valorPago === 'number' ? tObj.valorPago : (typeof tObj.Valor_PG === 'number' ? tObj.Valor_PG : (t.status === 'PAGO' ? valorNum : 0)));
    const bancoIdVal = t.bancoId || (tObj.Banco_Id as string | number) || '';
    const cartaoIdVal = t.cartaoid || t.cartaoId || (tObj.Cartão_Id as string | number) || '';
    const formaPagVal = t.formaPagamento || (tObj.Forma_Pagamento as string) || '';
    const tipoVal = t.tipo || (tObj.Tipo as string) || 'DESPESA';
    const catVal = t.categoria || (tObj.Categoria as string) || 'OUTROS';
    const statusVal = t.status || (tObj.Status as string) || 'PAGO';

    const kmVal = t.km !== undefined && t.km !== null ? t.km : ((tObj.KM as string | number) !== undefined ? (tObj.KM as string | number) : '');
    const litrosVal = t.litros !== undefined && t.litros !== null ? t.litros : ((tObj.Litros as string | number) !== undefined ? (tObj.Litros as string | number) : '');
    const precoLitroVal = t.precoLitro !== undefined && t.precoLitro !== null ? t.precoLitro : ((tObj.Preço_Litro as string | number) !== undefined ? (tObj.Preço_Litro as string | number) : '');
    const compTanqueVal = t.completouTanque === true || String(t.completouTanque).toUpperCase() === 'SIM' || String(tObj.Completou_O_Tanque).toUpperCase() === 'SIM' ? 'SIM' : 'NÃO';
    const kmPercVal = t.kmPercorrido !== undefined && t.kmPercorrido !== null ? t.kmPercorrido : ((tObj.KM_Percorrido as string | number) !== undefined ? (tObj.KM_Percorrido as string | number) : '');
    const mediaVal = t.mediaKmL !== undefined && t.mediaKmL !== null ? t.mediaKmL : ((tObj['Média_(Km/L)'] as string | number) !== undefined ? (tObj['Média_(Km/L)'] as string | number) : '');

    const veiculoVal = t.veiculo || (tObj.Veiculo as string) || '';
    const descVeiculoVal = t.descricaoVeiculo || (tObj.Descrição_Do_Veículo as string) || (tObj['Descrição_Do_Viculo'] as string) || '';
    const motoristaVal = t.motorista || (tObj.Motorista as string) || '';
    const nomePostoVal = t.nomePosto || (tObj.Nome_Posto as string) || '';
    const localPostoVal = t.localizacaoPosto || (tObj.Localização_Do_Posto as string) || '';
    const compUrlVal = t.comprovanteUrl || (tObj.Comprovante_Url as string) || '';
    const obsVal = t.obs || (tObj.OBS as string) || '';

    return {
      ...t,
      id: idStr,
      data: rawDate,
      descricao: descStr,
      valor: valorNum,
      valorPg: valorPgNum,
      bancoId: bancoIdVal,
      cartaoId: cartaoIdVal,
      formaPagamento: formaPagVal,
      tipo: tipoVal,
      categoria: catVal,
      status: statusVal,
      km: kmVal,
      litros: litrosVal,
      precoLitro: precoLitroVal,
      completouTanque: t.completouTanque ?? (compTanqueVal === 'SIM'),
      kmPercorrido: kmPercVal,
      mediaKmL: mediaVal,
      veiculo: veiculoVal,
      descricaoVeiculo: descVeiculoVal,
      motorista: motoristaVal,
      nomePosto: nomePostoVal,
      localizacaoPosto: localPostoVal,
      comprovanteUrl: compUrlVal,
      obs: obsVal,

      // Explicit 24 Column Aliases for Aba 4_Abastecimentos
      ID: idStr,
      Data: rawDate,
      Descrição: descStr,
      Valor: valorNum,
      Valor_PG: valorPgNum,
      Valor_Pago: valorPgNum,
      Banco_Id: bancoIdVal,
      "Cartão_Id": cartaoIdVal,
      Cartao_Id: cartaoIdVal,
      Forma_Pagamento: formaPagVal,
      Tipo: tipoVal,
      Categoria: catVal,
      Status: statusVal,
      KM: kmVal,
      Litros: litrosVal,
      "Preço_Litro": precoLitroVal,
      Preco_Litro: precoLitroVal,
      Completou_O_Tanque: compTanqueVal,
      KM_Percorrido: kmPercVal,
      "Média_(Km/L)": mediaVal,
      "Media_(Km/L)": mediaVal,
      Veiculo: veiculoVal,
      "Descrição_Do_Veículo": descVeiculoVal,
      "Descrição_Do_Viculo": descVeiculoVal,
      Descricao_Do_Veiculo: descVeiculoVal,
      Motorista: motoristaVal,
      Nome_Posto: nomePostoVal,
      "Localização_Do_Posto": localPostoVal,
      Localizacao_Do_Posto: localPostoVal,
      Comprovante_Url: compUrlVal,
      OBS: obsVal
    };
  });

  const mappedFuelings = mappedTransactions.filter((t: MappedTransaction) => String(t.categoria || t.Categoria || '').toUpperCase() === 'ABASTECIMENTO');

  return {
    action: 'syncData',
    spreadsheetId: cleanSheetId,
    forceOverwrite: forceOverwrite,
    deletedIds: deletedIds,
    transactions: mappedTransactions,
    abastecimentos: mappedFuelings,
    "4_Abastecimentos": mappedFuelings,
    infractions: Array.isArray(infractions) ? infractions : [],
    riskZones: mappedRiskZones,
    appointments: mappedAppointments,
    consultas: mappedAppointments,
    consultasMedicas: mappedAppointments,
    "6_Consultas_Médicas": mappedAppointments,
    prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
    compromissos: mappedCompromissos,
    registeredVehicles: mappedVehicles,
    veiculos: mappedVehicles,
    "9_Veiculos": mappedVehicles,
    performedServices: mappedWorkshop,
    workshop: mappedWorkshop,
    oficina: mappedWorkshop,
    "14_Oficina": mappedWorkshop,
    scheduledServices: Array.isArray(scheduledServices) ? scheduledServices : [],
    scheduledMaintenance: Array.isArray(scheduledMaintenance) ? scheduledMaintenance : [],
    agenda: mappedCompromissos,
    "19_Agenda_E_Compromissos": mappedCompromissos,
    bankAccounts: Array.isArray(bankAccounts) ? bankAccounts : [],
    creditCards: Array.isArray(creditCards) ? creditCards : [],
    analysis: Array.isArray(analysis) ? analysis : [],
    profile: Array.isArray(profile) ? profile : [],
    groceryItems: Array.isArray(groceryItems) ? groceryItems : [],
    categoryBudgets: categoryBudgets || {},
    customCategories: Array.isArray(customCategories) ? customCategories : []
  };
};

export const syncDataToSpreadsheet = async (
  accessToken: string | null | undefined,
  spreadsheetId: string | null | undefined,
  transactions: Transaction[] = [],
  infractions: Infraction[] = [],
  riskZones: RiskZone[] = [],
  appointments: MedicalAppointment[] = [],
  prescriptions: MedicalPrescription[] = [],
  compromissos: Compromisso[] = [],
  registeredVehicles: RegisteredVehicle[] = [],
  performedServices: CarServicePerformed[] = [],
  scheduledServices: CarServiceScheduled[] = [],
  bankAccounts: BankAccount[] = [],
  creditCards: CreditCard[] = [],
  categoryBudgets: Record<string, number> = {},
  customCategories: string[] = [],
  groceryItems: GroceryItem[] = [],
  forceOverwrite: boolean = false,
  sheetTxCount?: number,
  scheduledMaintenance: CarServiceScheduled[] = [],
  agenda: Compromisso[] = [],
  workshop: WorkshopItem[] | CarServicePerformed[] = [],
  analysis: unknown[] = [],
  profile: unknown[] = [],
  deletedIds: (string | number)[] = [],
  origem: string = 'syncDataToSpreadsheet'
): Promise<string> => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;

  const payload = buildSyncPayload(
    spreadsheetId,
    transactions,
    infractions,
    riskZones,
    appointments,
    prescriptions,
    compromissos,
    registeredVehicles,
    performedServices,
    scheduledServices,
    bankAccounts,
    creditCards,
    categoryBudgets,
    customCategories,
    groceryItems,
    forceOverwrite,
    sheetTxCount,
    scheduledMaintenance,
    agenda,
    workshop,
    analysis,
    profile,
    deletedIds
  );

  const stackStr = new Error().stack || '';
  const nowStr = new Date().toLocaleString('pt-BR');
  const count = Array.isArray(transactions) ? transactions.length : 0;
  const txIds = (payload.transactions || []).map((t: MappedTransaction) => t.id);

  console.log('=========================');
  console.log(`ORIGEM: ${origem}`);
  console.log(`Quantidade de registros: ${count}`);
  console.log(`IDs excluídos explicitamente (${deletedIds.length}):`, deletedIds);
  console.log(`Horário: ${nowStr}`);
  if (import.meta.env.DEV) {
    console.log(`IDs dos registros (${count}):`, txIds);
    console.log(`Call Stack completo:\n${stackStr}`);
    console.log('JSON do Payload enviado ao Apps Script:\n', JSON.stringify(payload, null, 2));
  }
  console.log('====================');

  console.log('[SYNC LOG - GOOGLE AUTH] Disparando requisição POST para Apps Script...');
  const res = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, payload, 'POST');
  console.log('[SYNC LOG - GOOGLE AUTH] Resposta do Apps Script recebida:', res);
  if (res && res.status === 'error') {
    throw new Error(res.error || 'Erro ao gravar dados na planilha do Google Apps Script');
  }

  return `https://docs.google.com/spreadsheets/d/${cleanSheetId}/edit`;
};

export const findOrCreateSpreadsheet = async (_accessToken?: string): Promise<string> => {
  return DEFAULT_SPREADSHEET_ID;
};

export const fetchTransactionsFromSpreadsheet = async (
  accessToken: unknown,
  spreadsheetId: unknown
): Promise<Transaction[]> => {
  const data = await fetchAllDataFromSpreadsheet(accessToken, spreadsheetId);
  return (data?.transactions || data?.abastecimentos || []) as Transaction[];
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthflow_user') : null;
  const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthflow_token') : null;
  if (savedUser && savedToken && onAuthSuccess) {
    try {
      onAuthSuccess(JSON.parse(savedUser) as User, savedToken);
    } catch {
      if (onAuthFailure) onAuthFailure();
    }
  } else if (onAuthFailure) {
    onAuthFailure();
  }
};

export const googleSignIn = async (providedTokenOrUrl?: string): Promise<{ user: User; token: string }> => {
  const mockUser: User = {
    uid: 'user_' + Date.now(),
    displayName: 'Usuário Ativo',
    email: 'usuario@exemplo.com'
  };
  const token = providedTokenOrUrl || 'token_' + Date.now();
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('wealthflow_user', JSON.stringify(mockUser));
    localStorage.setItem('wealthflow_token', token);
  }
  return { user: mockUser, token };
};

export const logout = async (): Promise<void> => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('wealthflow_user');
    localStorage.removeItem('wealthflow_token');
  }
};

export const uploadBackupToDrive = async (_accessToken: string, jsonData: unknown): Promise<string> => {
  const res = await callAppsScript<{ status?: string; message?: string }>(DEFAULT_APPS_SCRIPT_URL, {
    action: 'uploadBackup',
    data: typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData)
  }, 'POST');
  return res.message || res.status || 'backup_wealthflow.json';
};

export const listBackupsFromDrive = async (_token: string): Promise<unknown[]> => {
  return [];
};

export const downloadBackupFromDrive = async (_token: string, _fileId: string): Promise<Record<string, unknown>> => {
  return {};
};

export const normalizeTransactionObject = (item: Record<string, unknown> | null | undefined): Transaction | null => {
  if (!item || typeof item !== 'object') return null;
  return {
    id: (item.id || item.Id || item.ID) as number,
    data: (item.data || item.Data || item.DATA || '') as string,
    descricao: (item.descricao || item.Descrição || item.Descricao || item.DESCRIÇÃO || '') as string,
    valor: Number(item.valor || item.Valor || item['Valor (R$)'] || 0),
    valorPg: item.valorPg !== undefined ? Number(item.valorPg) : (item.Valor_PG !== undefined ? Number(item.Valor_PG) : undefined),
    bancoId: (item.bancoId || item.Banco_Id || '') as number,
    cartaoId: (item.cartaoId || item.Cartão_Id || item.Cartao_Id || '') as string | number,
    formaPagamento: (item.formaPagamento || item.Forma_Pagamento || '') as string,
    tipo: (item.tipo || item.Tipo || 'DESPESA') as string,
    categoria: (item.categoria || item.Categoria || 'OUTROS') as string,
    status: (item.status || item.Status || 'CONCLUÍDO') as string,
    km: item.km !== undefined ? Number(item.km) : (item.KM !== undefined ? Number(item.KM) : undefined),
    litros: item.litros !== undefined ? Number(item.litros) : (item.Litros !== undefined ? Number(item.Litros) : undefined),
    precoLitro: item.precoLitro !== undefined ? Number(item.precoLitro) : (item.Preço_Litro !== undefined ? Number(item.Preço_Litro) : undefined),
    completouTanque: (item.completouTanque !== undefined ? item.completouTanque : item.Completou_O_Tanque) as boolean,
    kmPercorrido: item.kmPercorrido !== undefined ? Number(item.kmPercorrido) : (item.KM_Percorrido !== undefined ? Number(item.KM_Percorrido) : undefined),
    mediaKmL: item.mediaKmL !== undefined ? Number(item.mediaKmL) : (item['Média_(Km/L)'] !== undefined ? Number(item['Média_(Km/L)']) : undefined),
    veiculo: (item.veiculo || item.Veiculo || '') as string,
    descricaoVeiculo: (item.descricaoVeiculo || item.Descrição_Do_Veículo || '') as string,
    motorista: (item.motorista || item.Motorista || '') as string,
    nomePosto: (item.posto || item.Posto_Combustivel || item.nomePosto || item.Nome_Posto || '') as string,
    localizacaoPosto: (item.cidadeUf || item.Cidade_UF || item.localizacaoPosto || item.Localização_Do_Posto || '') as string,
    obs: (item.obs || item.Observacao || item.Observação || '') as string
  };
};

export const fetchAllDataFromSpreadsheet = async (
  accessToken: unknown,
  spreadsheetId: unknown
): Promise<Record<string, unknown>> => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;
  const res = await callAppsScript<Record<string, unknown>>(DEFAULT_APPS_SCRIPT_URL, { action: 'fetchAllData', spreadsheetId: cleanSheetId }, 'GET');
  return (res?.data || res || {}) as Record<string, unknown>;
};
