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
        parsed = JSON.parse(text);
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
    transactions,
    riskZones,
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

export const fetchAllDataFromSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any
): Promise<any> => {
  const cleanSheetId = toSafeString(spreadsheetId) || DEFAULT_SPREADSHEET_ID;
  const res = await callAppsScript(DEFAULT_APPS_SCRIPT_URL, { action: 'fetchAllData', spreadsheetId: cleanSheetId }, 'GET');
  return res || {};
};