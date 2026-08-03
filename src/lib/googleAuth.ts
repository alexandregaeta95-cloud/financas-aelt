import { safeJsonParse } from './safeParse';
export { safeJsonParse, safeJsonParse as safeParse };

export const DEFAULT_SPREADSHEET_ID = '1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4/edit';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsC73N1O1vU2oN4lD0HneqWLM964XXkqHNDbeC8MH0uy5HUFIEaCZVQ7lX5sSma4LZGg/exec';

export interface User {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

export const toSafeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.url === 'string') return val.url;
    if (typeof val.token === 'string') return val.token;
    if (typeof val.spreadsheetId === 'string') return val.spreadsheetId;
    if (typeof val.id === 'string') return val.id;
    try {
      return JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  return String(val);
};

export const callAppsScript = async (
  scriptUrl: any,
  payloadOrAction: any,
  method: 'GET' | 'POST' = 'POST'
): Promise<any> => {
  const cleanUrl = toSafeString(scriptUrl).trim() || DEFAULT_APPS_SCRIPT_URL;
  const savedSheetId = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_sheet_id')) : '';
  const paramSheetId = typeof payloadOrAction === 'object' && payloadOrAction?.spreadsheetId ? toSafeString(payloadOrAction.spreadsheetId) : '';
  const candidateId = paramSheetId || savedSheetId;
  const cleanSheetId = (candidateId && candidateId !== 'active_sheet' && !candidateId.startsWith('http')) ? candidateId : DEFAULT_SPREADSHEET_ID;

  if (method === 'POST' && typeof payloadOrAction === 'object' && payloadOrAction !== null) {
    if (!payloadOrAction.spreadsheetId || payloadOrAction.spreadsheetId === 'active_sheet') {
      payloadOrAction.spreadsheetId = cleanSheetId;
    }
  }

  try {
    let fetchUrl = cleanUrl;
    const fetchOptions: RequestInit = {
      method,
      mode: 'cors',
      redirect: 'follow',
    };

    if (method === 'GET') {
      const actionParam = typeof payloadOrAction === 'string' ? payloadOrAction : (payloadOrAction?.action || 'fetchAllData');
      let query = `action=${encodeURIComponent(actionParam)}`;
      if (cleanSheetId) query += `&spreadsheetId=${encodeURIComponent(cleanSheetId)}`;
      fetchUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}${query}`;
    } else {
      fetchOptions.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      fetchOptions.body = typeof payloadOrAction === 'string' ? payloadOrAction : JSON.stringify(payloadOrAction);
    }

    const directRes = await fetch(fetchUrl, fetchOptions);
    if (directRes.ok) {
      let parsed: any = null;
      try {
        parsed = await directRes.json();
      } catch (e) {
        const text = await directRes.text();
        parsed = safeJsonParse(text, null);
      }
      return parsed?.data || parsed;
    }
  } catch (directErr) {
    console.warn("Conexão direta com Apps Script falhou:", directErr);
  }

  return { status: 'error', error: 'Falha na comunicação com o Google Apps Script.' };
};

export const syncDataToSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any,
  transactions: any[] = [],
  infractions: any[] = [],
  riskZones: any[] = [],
  appointments: any[] = [],
  prescriptions: any[] = [],
  compromissos: any[] = [],
  registeredVehicles: any[] = [],
  performedServices: any[] = [],
  scheduledServices: any[] = [],
  bankAccounts: any[] = [],
  creditCards: any[] = [],
  categoryBudgets: any = {},
  customCategories: any = [],
  groceryItems: any[] = [],
  scheduledMaintenance: any[] = [],
  agenda: any[] = [],
  workshop: any[] = [],
  analysis: any[] = [],
  profile: any[] = []
): Promise<string> => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;

  const mappedRiskZones = (Array.isArray(riskZones) ? riskZones : []).map((item: any) => ({
    id: String(item.id || item.ID || Date.now()),
    descricao: item.descricao || item.nomeLocal || item.nome || item.Descrição || 'ZONA DE RISCO',
    nivelDeRisco: item.nivelDeRisco || item.nivelRisco || 'BAIXO',
    latitudi: item.latitudi || item.latitude || item.Latitudi || '',
    longitude: item.longitude || item.Longitude || '',
    raioM: Number(item.raioM || item.raioMetros || item['Raio_(M)'] || 100),
    ativo: (item.ativo === true || String(item.ativo).toUpperCase() === 'SIM' || String(item.ativo) === 'TRUE') ? 'SIM' : 'NÃO',
    mensagemDeAlerta: item.mensagemDeAlerta || item.mensagem || item.Mensagem_De_Alerta || '',
    dataRegistro: item.dataRegistro || item.Data_Registro || new Date().toLocaleDateString('pt-BR'),
    obs: item.obs || item.OBS || item.som || ''
  }));

  const payload = {
    action: 'syncData',
    spreadsheetId: cleanSheetId,
    transactions: Array.isArray(transactions) ? transactions : [],
    infractions: Array.isArray(infractions) ? infractions : [],
    riskZones: mappedRiskZones,
    appointments: Array.isArray(appointments) ? appointments : [],
    prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
    compromissos: Array.isArray(compromissos) ? compromissos : [],
    registeredVehicles: Array.isArray(registeredVehicles) ? registeredVehicles : [],
    performedServices: Array.isArray(performedServices) ? performedServices : [],
    scheduledServices: Array.isArray(scheduledServices) ? scheduledServices : [],
    scheduledMaintenance: Array.isArray(scheduledMaintenance) ? scheduledMaintenance : [],
    agenda: Array.isArray(agenda) ? agenda : [],
    workshop: Array.isArray(workshop) ? workshop : [],
    bankAccounts: Array.isArray(bankAccounts) ? bankAccounts : [],
    creditCards: Array.isArray(creditCards) ? creditCards : [],
    analysis: Array.isArray(analysis) ? analysis : [],
    profile: Array.isArray(profile) ? profile : [],
    groceryItems: Array.isArray(groceryItems) ? groceryItems : [],
    categoryBudgets: categoryBudgets || {},
    customCategories: Array.isArray(customCategories) ? customCategories : []
  };

  const res = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, payload, 'POST');
  if (res && res.status === 'error') {
    throw new Error(res.error || 'Erro ao gravar dados na planilha do Google Apps Script');
  }

  return `https://docs.google.com/spreadsheets/d/${cleanSheetId}/edit`;
};

export const findOrCreateSpreadsheet = async (accessToken?: string): Promise<string> => {
  return DEFAULT_SPREADSHEET_ID;
};

export const fetchTransactionsFromSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any
): Promise<any[]> => {
  const data = await fetchAllDataFromSpreadsheet(accessToken, spreadsheetId);
  return data?.transactions || data?.abastecimentos || [];
};

export const initAuth = (
  onAuthSuccess?: (user: any, token: string) => void,
  onAuthFailure?: () => void
) => {
  const savedUser = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthflow_user') : null;
  const savedToken = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthflow_token') : null;
  if (savedUser && savedToken && onAuthSuccess) {
    try {
      onAuthSuccess(JSON.parse(savedUser), savedToken);
    } catch {
      if (onAuthFailure) onAuthFailure();
    }
  } else if (onAuthFailure) {
    onAuthFailure();
  }
};

export const googleSignIn = async (providedTokenOrUrl?: string) => {
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

export const logout = async () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('wealthflow_user');
    localStorage.removeItem('wealthflow_token');
  }
};

export const uploadBackupToDrive = async (accessToken: string, jsonData: string): Promise<any> => {
  return await callAppsScript(DEFAULT_APPS_SCRIPT_URL, {
    action: 'uploadBackup',
    data: jsonData
  }, 'POST');
};

export const listBackupsFromDrive = async (token: string): Promise<any[]> => {
  return [];
};

export const downloadBackupFromDrive = async (token: string, fileId: string): Promise<any> => {
  return {};
};

export const normalizeTransactionObject = (item: any): any => {
  if (!item || typeof item !== 'object') return item;
  return {
    id: item.id || item.Id || item.ID,
    data: item.data || item.Data || item.DATA || '',
    descricao: item.descricao || item.Descrição || item.Descricao || item.DESCRIÇÃO || '',
    valor: Number(item.valor || item.Valor || item['Valor (R$)'] || 0),
    valorPg: item.valorPg !== undefined ? Number(item.valorPg) : (item.Valor_PG !== undefined ? Number(item.Valor_PG) : undefined),
    bancoId: item.bancoId || item.Banco_Id || '',
    cartaoId: item.cartaoId || item.Cartão_Id || item.Cartao_Id || '',
    formaPagamento: item.formaPagamento || item.Forma_Pagamento || '',
    tipo: item.tipo || item.Tipo || 'DESPESA',
    categoria: item.categoria || item.Categoria || 'OUTROS',
    status: item.status || item.Status || 'CONCLUÍDO',
    km: item.km !== undefined ? Number(item.km) : (item.KM !== undefined ? Number(item.KM) : undefined),
    litros: item.litros !== undefined ? Number(item.litros) : (item.Litros !== undefined ? Number(item.Litros) : undefined),
    precoLitro: item.precoLitro !== undefined ? Number(item.precoLitro) : (item.Preço_Litro !== undefined ? Number(item.Preço_Litro) : undefined),
    completouTanque: item.completouTanque !== undefined ? item.completouTanque : item.Completou_O_Tanque,
    kmPercorrido: item.kmPercorrido !== undefined ? Number(item.kmPercorrido) : (item.KM_Percorrido !== undefined ? Number(item.KM_Percorrido) : undefined),
    mediaKmL: item.mediaKmL !== undefined ? Number(item.mediaKmL) : (item['Média_(Km/L)'] !== undefined ? Number(item['Média_(Km/L)']) : undefined),
    veiculo: item.veiculo || item.Veiculo || '',
    descricaoVeiculo: item.descricaoVeiculo || item.Descrição_Do_Veículo || '',
    motorista: item.motorista || item.Motorista || '',
    posto: item.posto || item.Posto_Combustivel || '',
    cidadeUf: item.cidadeUf || item.Cidade_UF || '',
    obs: item.obs || item.Observacao || item.Observação || ''
  };
};

export const fetchAllDataFromSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any
): Promise<any> => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;
  const res = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, { action: 'fetchAllData', spreadsheetId: cleanSheetId }, 'GET');
  return res || {};
};