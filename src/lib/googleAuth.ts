export const DEFAULT_SPREADSHEET_ID = '1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4/edit';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsC73N1O1vU2oN4lD0HneqWLM964XXkqHNDbeC8MH0uy5HUFIEaCZVQ7lX5sSma4LZGg/exec';
export const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsC73N1O1vU2oN4lD0HneqWLM964XXkqHNDbeC8MH0uy5HUFIEaCZVQ7lX5sSma4LZGg/exec';

export interface User {
  uid: string;
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

/**
 * Converte com segurança qualquer valor (string, objeto com token/url/id, null, undefined)
 * para string limpa, prevenindo erros 'TypeError: e.includes is not a function'.
 */
export const toSafeString = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (typeof val.url === 'string') return val.url;
    if (typeof val.token === 'string') return val.token;
    if (typeof val.accessToken === 'string') return val.accessToken;
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

let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem('wealthflow_google_access_token') || sessionStorage.getItem('wealthflow_google_access_token');
  } catch (e) {
    return null;
  }
})();

export const setStoredAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('wealthflow_google_access_token', token);
      sessionStorage.setItem('wealthflow_google_access_token', token);
    } else {
      localStorage.removeItem('wealthflow_google_access_token');
      sessionStorage.removeItem('wealthflow_google_access_token');
    }
  } catch (e) {}
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const token = toSafeString(
    cachedAccessToken || 
    localStorage.getItem('wealthflow_apps_script_url') || 
    localStorage.getItem('wealthflow_spreadsheet_url') ||
    localStorage.getItem('wealthflow_google_access_token') ||
    DEFAULT_APPS_SCRIPT_URL
  );
  if (token) {
    const isScript = token.includes('script.google.com');
    const isSheet = token.includes('docs.google.com');
    const mockUser: User = {
      uid: 'google-drive-user',
      displayName: isScript ? 'Google Apps Script' : isSheet ? 'Planilha Google Sheets' : 'Google Drive Conectado',
      email: isScript ? 'script-sync@google' : isSheet ? 'sheets-sync@google' : 'drive-sync@google'
    };
    if (onAuthSuccess) onAuthSuccess(mockUser, token);
  } else {
    if (onAuthFailure) onAuthFailure();
  }
  return () => {};
};

export const googleSignIn = async (providedTokenOrUrl?: any): Promise<{ user: User; accessToken: string } | null> => {
  let token = toSafeString(providedTokenOrUrl).trim();
  
  if (!token) {
    token = toSafeString(
      localStorage.getItem('wealthflow_apps_script_url') || 
      localStorage.getItem('wealthflow_spreadsheet_url') ||
      localStorage.getItem('wealthflow_google_access_token') || 
      sessionStorage.getItem('wealthflow_google_access_token') ||
      DEFAULT_APPS_SCRIPT_URL
    );
  }

  if (!token) {
    return null;
  }

  setStoredAccessToken(token);

  if (token.includes('script.google.com')) {
    localStorage.setItem('wealthflow_apps_script_url', token);
  } else if (token.includes('docs.google.com/spreadsheets/d/')) {
    localStorage.setItem('wealthflow_spreadsheet_url', token);
    const sheetIdMatch = token.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch && sheetIdMatch[1]) {
      localStorage.setItem('wealthflow_sheet_id', sheetIdMatch[1]);
    }
  }

  const isScript = token.includes('script.google.com');
  const isSheetUrl = token.includes('docs.google.com');

  const user: User = {
    uid: 'google-drive-user',
    displayName: isScript ? 'Google Apps Script' : isSheetUrl ? 'Planilha Google Sheets' : 'Google Drive Conectado',
    email: isScript ? 'apps-script@google' : isSheetUrl ? 'sheets-sync@google' : 'drive-sync@google'
  };

  return { user, accessToken: token };
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  setStoredAccessToken(null);
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
  const cleanSheetId = (candidateId && candidateId !== 'active_sheet' && !candidateId.startsWith('http') && !candidateId.includes('script.google.com')) ? candidateId : DEFAULT_SPREADSHEET_ID;

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
      if (cleanSheetId) {
        query += `&spreadsheetId=${encodeURIComponent(cleanSheetId)}`;
      }
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
        try {
          const text = await directRes.text();
          parsed = JSON.parse(text);
        } catch (pErr) {
          console.warn("Resposta do Apps Script não é JSON estrito");
        }
      }

      if (parsed) {
        let innerData = parsed.data || parsed;
        if (typeof innerData === 'string') {
          try { innerData = JSON.parse(innerData); } catch (e) {}
        }
        return innerData || parsed;
      }
    }
  } catch (directErr) {
    console.warn("Conexão direta com Google Apps Script falhou:", directErr);
  }

  return { status: 'error', error: 'Falha na comunicação com o Google Apps Script.' };
};

export const parseNumericValue = (val: any): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  let str = String(val).trim();
  if (!str) return 0;
  str = str.replace(/R\$\s?/gi, '').trim();
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
};

export const normalizeTransactionObject = (item: any): any => {
  if (!item || typeof item !== 'object') return null;
  if (Array.isArray(item)) return item;

  const values = Object.values(item);
  const hasContent = values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (!hasContent) return null;

  const rawPosto = item.Nome_Posto ?? item.nomePosto ?? item['Nome Posto'] ?? '';
  const nomePosto = String(rawPosto || '').trim().toUpperCase() || undefined;

  const rawVeiculo = item.Veiculo ?? item.veiculo ?? item['Veículo'] ?? '';
  const veiculo = String(rawVeiculo || '').trim().toUpperCase() || undefined;

  const rawId = item.id ?? item.ID ?? item.Id;
  let parsedId = Number(rawId);
  if (isNaN(parsedId) || parsedId <= 0) {
    parsedId = Math.floor(Date.now() + Math.random() * 100000);
  }

  const rawValor = item.Valor ?? item.valor ?? item['Valor (R$)'] ?? 0;
  const valor = parseNumericValue(rawValor);

  const rawCat = item.Categoria ?? item.categoria ?? '';
  let category = String(rawCat || '').trim().toUpperCase();
  if (!category || category === 'UNDEFINED' || category === 'NULL') {
    category = (nomePosto || item.KM || item.km || item.Litros || item.litros) ? 'ABASTECIMENTO' : 'OUTROS';
  }

  const rawDesc = item.Descrição ?? item.descricao ?? item['Descrição/Estabelecimento'] ?? '';
  let descricao = String(rawDesc || '').trim();
  if (!descricao) {
    descricao = category === 'ABASTECIMENTO' ? 'ABASTECIMENTO' : 'LANÇAMENTO';
  }

  let dataStr = item.Data ?? item.data ?? '';
  if (dataStr instanceof Date) {
    const y = dataStr.getFullYear();
    const m = ('0' + (dataStr.getMonth() + 1)).slice(-2);
    const d = ('0' + dataStr.getDate()).slice(-2);
    dataStr = `${d}/${m}/${y}`;
  } else {
    dataStr = String(dataStr || '').trim();
  }

  let rawTipo = String(item.Tipo ?? item.tipo ?? '').trim().toUpperCase();
  if (!rawTipo) {
    rawTipo = (category.includes('RECEITA') || category === 'ENTRADA' || category === 'GANHO') ? 'RECEITA' : 'DESPESA';
  }

  let status = String(item.Status ?? item.status ?? 'PAGO').trim().toUpperCase();
  const obs = String(item.OBS ?? item.obs ?? item.Observação ?? item.observacao ?? '').trim();

  const valorPagoVal = item.Valor_Pago ?? item.valorPago ?? item.Valor_Recebido ?? item.valorRecebido ?? valor;

  return {
    ...item,
    id: parsedId,
    ID: parsedId,
    data: dataStr || new Date().toLocaleDateString('pt-BR'),
    Data: dataStr || new Date().toLocaleDateString('pt-BR'),
    descricao: descricao.toUpperCase(),
    Descrição: descricao.toUpperCase(),
    categoria: category,
    Categoria: category,
    valor: isNaN(valor) ? 0 : valor,
    Valor: isNaN(valor) ? 0 : valor,
    valorPago: parseNumericValue(valorPagoVal),
    Valor_Pago: parseNumericValue(valorPagoVal),
    tipo: rawTipo,
    Tipo: rawTipo,
    status: status || 'PAGO',
    Status: status || 'PAGO',
    bancoId: String(item.Banco_Id || item.bancoId || ''),
    Banco_Id: String(item.Banco_Id || item.bancoId || ''),
    cartaoId: String(item['Cartão_Id'] || item.cartaoId || ''),
    'Cartão_Id': String(item['Cartão_Id'] || item.cartaoId || ''),
    formaPagamento: String(item.Forma_Pagamento || item.formaPagamento || item.Forma_Recebimento || ''),
    Forma_Pagamento: String(item.Forma_Pagamento || item.formaPagamento || item.Forma_Recebimento || ''),
    obs: obs || '',
    OBS: obs || ''
  };
};

export interface AllSpreadsheetData {
  transactions: any[];
  riskZones: any[];
  appointments: any[];
  prescriptions: any[];
  groceryItems: any[];
  registeredVehicles: any[];
  performedServices: any[];
  scheduledServices: any[];
  scheduledMaintenance: any[];
  agenda: any[];
  workshop: any[];
  bankAccounts: any[];
  creditCards: any[];
  analysis: any[];
  profile: any[];
  status?: string;
  error?: string;
}

/**
 * Sincroniza todas as 18 abas com a nova API do Codigo.gs
 */
export const syncDataToSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any,
  transactions: any[] = [],
  riskZones: any[] = [],
  appointments: any[] = [],
  prescriptions: any[] = [],
  groceryItems: any[] = [],
  registeredVehicles: any[] = [],
  performedServices: any[] = [],
  scheduledServices: any[] = [],
  scheduledMaintenance: any[] = [],
  agenda: any[] = [],
  workshop: any[] = [],
  bankAccounts: any[] = [],
  creditCards: any[] = [],
  analysis: any[] = [],
  profile: any[] = []
): Promise<string> => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;

  const payload = {
    action: 'syncData',
    spreadsheetId: cleanSheetId,
    transactions: transactions.map(t => ({
      id: t.id || t.ID,
      ID: t.id || t.ID,
      data: t.data || t.Data || '',
      Data: t.data || t.Data || '',
      descricao: t.descricao || t.Descrição || '',
      Descrição: t.descricao || t.Descrição || '',
      valor: parseNumericValue(t.valor || t.Valor || 0),
      Valor: parseNumericValue(t.valor || t.Valor || 0),
      valorPago: parseNumericValue(t.valorPago || t.Valor_Pago || t.valorRecebido || t.Valor_Recebido || t.valor || 0),
      Valor_Pago: parseNumericValue(t.valorPago || t.Valor_Pago || t.valorRecebido || t.Valor_Recebido || t.valor || 0),
      bancoId: String(t.bancoId || t.Banco_Id || ''),
      Banco_Id: String(t.bancoId || t.Banco_Id || ''),
      cartaoId: String(t.cartaoId || t['Cartão_Id'] || ''),
      'Cartão_Id': String(t.cartaoId || t['Cartão_Id'] || ''),
      formaPagamento: String(t.formaPagamento || t.Forma_Pagamento || t.formaRecebimento || t.Forma_Recebimento || ''),
      Forma_Pagamento: String(t.formaPagamento || t.Forma_Pagamento || t.formaRecebimento || t.Forma_Recebimento || ''),
      tipo: String(t.tipo || t.Tipo || 'DESPESA').toUpperCase(),
      Tipo: String(t.tipo || t.Tipo || 'DESPESA').toUpperCase(),
      categoria: String(t.categoria || t.Categoria || 'OUTROS').toUpperCase(),
      Categoria: String(t.categoria || t.Categoria || 'OUTROS').toUpperCase(),
      status: String(t.status || t.Status || 'PAGO'),
      Status: String(t.status || t.Status || 'PAGO'),
      obs: String(t.obs || t.OBS || ''),
      OBS: String(t.obs || t.OBS || ''),
      // Abastecimento Extras
      km: t.km || t.KM || '',
      litros: t.litros || t.Litros || '',
      precoLitro: t.precoLitro || t['Preço_Litro'] || '',
      completouOTanque: t.completouOTanque || t.Completou_O_Tanque || 'Sim',
      kmPercorrido: t.kmPercorrido || t.KM_Percorrido || '',
      mediaKmL: t.mediaKmL || t['Média_(Km/L)'] || '',
      veiculo: t.veiculo || t.Veiculo || '',
      descricaoVeiculo: t.descricaoVeiculo || t['Descrição_Do_Veículo'] || '',
      motorista: t.motorista || t.Motorista || '',
      nomePosto: t.nomePosto || t.Nome_Posto || '',
      localizacaoPosto: t.localizacaoPosto || t['Localização_Do_Posto'] || '',
      comprovanteUrl: t.comprovanteUrl || t.Comprovante_Url || ''
    })),
    riskZones: riskZones.map(z => ({
      id: z.id || z.ID,
      ID: z.id || z.ID,
      descricao: z.descricao || z.Descrição || z.nomeLocal || z.titulo || '',
      Descrição: z.descricao || z.Descrição || z.nomeLocal || z.titulo || '',
      nivelDeRisco: z.nivelDeRisco || z.Nível_De_Risco || z.nivelRisco || 'BAIXO',
      Nível_De_Risco: z.nivelDeRisco || z.Nível_De_Risco || z.nivelRisco || 'BAIXO',
      latitudi: z.latitudi || z.Latitudi || z.latitude || '',
      Latitudi: z.latitudi || z.Latitudi || z.latitude || '',
      longitude: z.longitude || z.Longitude || '',
      Longitude: z.longitude || z.Longitude || '',
      raioM: z.raioM || z['Raio_(M)'] || z.raioMetros || 100,
      'Raio_(M)': z.raioM || z['Raio_(M)'] || z.raioMetros || 100,
      ativo: (z.ativo === true || z.ativo === 'SIM' || z.Ativo === 'SIM' || z.ativo === '1') ? 'SIM' : 'NÃO',
      Ativo: (z.ativo === true || z.ativo === 'SIM' || z.Ativo === 'SIM' || z.ativo === '1') ? 'SIM' : 'NÃO',
      mensagemDeAlerta: z.mensagemDeAlerta || z.Mensagem_De_Alerta || z.mensagem || '',
      Mensagem_De_Alerta: z.mensagemDeAlerta || z.Mensagem_De_Alerta || z.mensagem || '',
      dataRegistro: z.dataRegistro || z.Data_Registro || z.data || '',
      Data_Registro: z.dataRegistro || z.Data_Registro || z.data || '',
      obs: z.obs || z.OBS || z.som || '',
      OBS: z.obs || z.OBS || z.som || ''
    })),
    appointments,
    prescriptions,
    groceryItems,
    registeredVehicles,
    performedServices,
    scheduledServices,
    scheduledMaintenance,
    agenda,
    workshop,
    bankAccounts,
    creditCards,
    analysis,
    profile
  };

  const res = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, payload, 'POST');
  if (res && res.status === 'error') {
    throw new Error(res.error || 'Erro ao gravar dados na planilha do Google Apps Script');
  }

  return `https://docs.google.com/spreadsheets/d/${cleanSheetId}/edit`;
};

/**
 * Busca TODOS os dados das 18 abas do Google Sheets via Codigo.gs
 */
export const fetchAllDataFromSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any
): Promise<AllSpreadsheetData> => {
  const emptyResult: AllSpreadsheetData = {
    transactions: [],
    riskZones: [],
    appointments: [],
    prescriptions: [],
    groceryItems: [],
    registeredVehicles: [],
    performedServices: [],
    scheduledServices: [],
    scheduledMaintenance: [],
    agenda: [],
    workshop: [],
    bankAccounts: [],
    creditCards: [],
    analysis: [],
    profile: []
  };

  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;

  try {
    const res = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, { action: 'fetchAllData', spreadsheetId: cleanSheetId }, 'GET');
    if (res && typeof res === 'object') {
      const rawTxs = Array.isArray(res?.data?.transactions)
        ? res.data.transactions
        : Array.isArray(res?.transactions)
          ? res.transactions
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
      
      const normalizedTxs = rawTxs.map(normalizeTransactionObject).filter(Boolean);

      return {
        ...emptyResult,
        transactions: normalizedTxs,
        riskZones: Array.isArray(res.riskZones || res.data?.riskZones) ? (res.riskZones || res.data?.riskZones) : emptyResult.riskZones,
        appointments: Array.isArray(res.appointments || res.data?.appointments) ? (res.appointments || res.data?.appointments) : emptyResult.appointments,
        prescriptions: Array.isArray(res.prescriptions || res.data?.prescriptions) ? (res.prescriptions || res.data?.prescriptions) : emptyResult.prescriptions,
        groceryItems: Array.isArray(res.groceryItems || res.data?.groceryItems) ? (res.groceryItems || res.data?.groceryItems) : emptyResult.groceryItems,
        registeredVehicles: Array.isArray(res.registeredVehicles || res.data?.registeredVehicles) ? (res.registeredVehicles || res.data?.registeredVehicles) : emptyResult.registeredVehicles,
        performedServices: Array.isArray(res.performedServices || res.data?.performedServices) ? (res.performedServices || res.data?.performedServices) : emptyResult.performedServices,
        scheduledServices: Array.isArray(res.scheduledServices || res.data?.scheduledServices) ? (res.scheduledServices || res.data?.scheduledServices) : emptyResult.scheduledServices,
        scheduledMaintenance: Array.isArray(res.scheduledMaintenance || res.data?.scheduledMaintenance) ? (res.scheduledMaintenance || res.data?.scheduledMaintenance) : emptyResult.scheduledMaintenance,
        agenda: Array.isArray(res.agenda || res.data?.agenda) ? (res.agenda || res.data?.agenda) : emptyResult.agenda,
        workshop: Array.isArray(res.workshop || res.data?.workshop) ? (res.workshop || res.data?.workshop) : emptyResult.workshop,
        bankAccounts: Array.isArray(res.bankAccounts || res.data?.bankAccounts) ? (res.bankAccounts || res.data?.bankAccounts) : emptyResult.bankAccounts,
        creditCards: Array.isArray(res.creditCards || res.data?.creditCards) ? (res.creditCards || res.data?.creditCards) : emptyResult.creditCards,
        analysis: Array.isArray(res.analysis || res.data?.analysis) ? (res.analysis || res.data?.analysis) : emptyResult.analysis,
        profile: Array.isArray(res.profile || res.data?.profile) ? (res.profile || res.data?.profile) : emptyResult.profile,
        status: res.status,
        error: res.error
      };
    }
  } catch (e) {
    console.warn("Erro ao buscar todos os dados via Apps Script:", e);
  }

  return emptyResult;
};

export const fetchTransactionsFromSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any
): Promise<any[]> => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;
  try {
    const res = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, { action: 'fetchTransactions', spreadsheetId: cleanSheetId }, 'GET');
    if (res) {
      const rawTxs = Array.isArray(res?.data?.transactions)
        ? res.data.transactions
        : Array.isArray(res?.transactions)
          ? res.transactions
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : [];
      return rawTxs.map(normalizeTransactionObject).filter(Boolean);
    }
  } catch (e) {
    console.warn("Erro ao buscar transações via Apps Script:", e);
  }
  return [];
};