export const DEFAULT_SPREADSHEET_ID = '1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4';
export const DEFAULT_SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4/edit?gid=2004093988#gid=2004093988';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzsC73N1O1vU2oN4lD0HneqWLM964XXkqHNDbeC8MH0uy5HUFIEaCZVQ7lX5sSma4LZGg/exec';

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

// Initialize auth state listener using local stored token / Apps Script endpoint
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

// Direct sign-in via Google Apps Script Web App Endpoint URL, Google Sheets URL, or Google API OAuth token
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

/**
 * Helper robusto para comunicação direta ou via proxy com o Web App do Google Apps Script.
 * Tenta em primeiro lugar a requisição direta do navegador (GET/POST) com mode 'cors',
 * e usa o proxy local apenas como fallback resiliente em caso de bloqueio.
 */
export const callAppsScript = async (
  scriptUrl: any,
  payloadOrAction: any,
  method: 'GET' | 'POST' = 'POST'
): Promise<any> => {
  const cleanUrl = toSafeString(scriptUrl).trim() || DEFAULT_APPS_SCRIPT_URL;

  // Extract safe spreadsheet ID if available (never 'active_sheet')
  const savedSheetId = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_sheet_id')) : '';
  const paramSheetId = typeof payloadOrAction === 'object' && payloadOrAction?.spreadsheetId ? toSafeString(payloadOrAction.spreadsheetId) : '';
  const candidateId = paramSheetId || savedSheetId;
  const cleanSheetId = (candidateId && candidateId !== 'active_sheet' && !candidateId.startsWith('http') && !candidateId.includes('script.google.com')) ? candidateId : DEFAULT_SPREADSHEET_ID;

  if (method === 'POST' && typeof payloadOrAction === 'object' && payloadOrAction !== null) {
    if (!payloadOrAction.spreadsheetId || payloadOrAction.spreadsheetId === 'active_sheet') {
      payloadOrAction.spreadsheetId = cleanSheetId;
    }
  }

  // 1. Requisição Direta do Navegador ao Google Apps Script
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
      // Usar text/plain evita CORS Preflight (OPTIONS) e envia o JSON válido em e.postData.contents
      fetchOptions.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
      fetchOptions.body = typeof payloadOrAction === 'string' ? payloadOrAction : JSON.stringify(payloadOrAction);
    }

    const directRes = await fetch(fetchUrl, fetchOptions);
    if (directRes.ok) {
      const text = await directRes.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        console.warn("Resposta do Apps Script não é JSON estrito:", text.slice(0, 100));
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
    console.warn("Conexão direta com Google Apps Script falhou, tentando fallback proxy:", directErr);
  }

  // 2. Fallback via Proxy do Servidor
  try {
    let proxyUrl = cleanUrl;
    if (method === 'GET') {
      const actionParam = typeof payloadOrAction === 'string' ? payloadOrAction : (payloadOrAction?.action || 'fetchAllData');
      let query = `action=${encodeURIComponent(actionParam)}`;
      if (cleanSheetId) {
        query += `&spreadsheetId=${encodeURIComponent(cleanSheetId)}`;
      }
      proxyUrl = `${cleanUrl}${cleanUrl.includes('?') ? '&' : '?'}${query}`;
    }

    const proxyRes = await fetch('/api/google-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: proxyUrl,
        method,
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? payloadOrAction : undefined
      })
    });

    if (proxyRes.ok) {
      const jsonRes = await proxyRes.json();
      const rawData = jsonRes.data || jsonRes;
      let parsed: any = rawData;
      if (typeof rawData === 'string') {
        try { parsed = JSON.parse(rawData); } catch { parsed = rawData; }
      }

      let innerData = parsed?.data || parsed;
      if (typeof innerData === 'string') {
        try { innerData = JSON.parse(innerData); } catch (e) {}
      }
      return innerData || parsed;
    }
  } catch (proxyErr) {
    console.warn("Proxy fallback para Google Apps Script falhou:", proxyErr);
  }

  return { status: 'error', error: 'Falha na comunicação com o Google Apps Script.' };
};

/**
 * Custom fetch wrapper for Google API requests to handle common network/CORS issues,
 * expired sessions (401), and auto-inject the Authorization header.
 */
const googleApiFetch = async (
  url: any,
  accessToken: any,
  options: RequestInit = {}
): Promise<Response> => {
  const urlStr = toSafeString(url);
  const tokenStr = toSafeString(accessToken);

  // If direct connection without external OAuth token
  if (tokenStr === 'wealthflow_direct_sheets_connected' || tokenStr.startsWith('wealthflow_')) {
    return new Response(JSON.stringify({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: {},
      data: JSON.stringify({ files: [{ id: 'wealthflow_spreadsheet_id', name: 'Finanças Gaeta' }] })
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // If direct Google Apps Script Web App URL call or if url contains invalid spreadsheetId URL
  if (urlStr.includes('script.google.com') || tokenStr.includes('script.google.com') || urlStr.includes('/spreadsheets/http') || urlStr.includes('/spreadsheets/https%3A%2F%2F')) {
    const storedAppsScriptUrl = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_apps_script_url')) : '';
    const targetUrl = urlStr.includes('script.google.com')
      ? urlStr
      : tokenStr.includes('script.google.com')
        ? tokenStr
        : (storedAppsScriptUrl || tokenStr);

    if (targetUrl && (targetUrl.includes('script.google.com') || targetUrl.startsWith('http'))) {
      const res = await callAppsScript(targetUrl, options.body, options.method as any || 'GET');
      return new Response(JSON.stringify(res), {
        status: (res && res.status === 'error') ? 400 : 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ status: 'ok', sheets: [{ properties: { title: 'Receitas' } }, { properties: { title: 'Despesas' } }, { properties: { title: 'Abastecimentos' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const authHeader = tokenStr ? (tokenStr.startsWith('Bearer ') ? tokenStr : `Bearer ${tokenStr}`) : '';

    const res = await fetch('/api/google-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        method: options.method || 'GET',
        headers: {
          ...options.headers,
          'Authorization': authHeader,
        },
        body: options.body,
      }),
    });

    if (res.status === 401) {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('wealthflow_google_access_token');
        localStorage.removeItem('wealthflow_google_access_token');
      } catch (e) {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('google_auth_error', {
          detail: { message: "Sua sessão do Google Drive expirou ou as credenciais são inválidas (Erro 401). Por favor, reautentique com o Google para renovar o acesso." }
        }));
      }
      throw new Error("Sessão expirada. Por favor, reautentique com o Google em vez de utilizar o cache.");
    }

    if (!res.ok) {
      // If the proxy API itself failed with e.g. 500
      return res;
    }

    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      const trimmedText = text.trim();
      if (trimmedText.startsWith('<!doctype') || trimmedText.startsWith('<!DOCTYPE') || trimmedText.startsWith('<html')) {
        console.warn("Resposta do proxy retornou HTML inesperado.");
        return new Response(JSON.stringify({ ok: false, error: "Resposta do servidor em formato HTML inesperado." }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.warn("Proxy response was not JSON. Returning fallback raw response status.", text);
      return new Response(text, {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    }

    const json = await res.json();

    if (json.status === 401) {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('wealthflow_google_access_token');
        localStorage.removeItem('wealthflow_google_access_token');
      } catch (e) {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('google_auth_error', {
          detail: { message: "Sua sessão do Google Drive expirou ou as credenciais são inválidas (Erro 401). Por favor, reautentique com o Google para renovar o acesso." }
        }));
      }
      throw new Error("Sessão expirada. Por favor, reautentique com o Google em vez de utilizar o cache.");
    }

    // Construct a mock Response object that matches the standard fetch Response API
    const mockResponse = new Response(json.data, {
      status: json.status,
      statusText: json.statusText,
      headers: new Headers(json.headers),
    });

    if (!mockResponse.ok && mockResponse.status === 401) {
      cachedAccessToken = null;
      try {
        sessionStorage.removeItem('wealthflow_google_access_token');
        localStorage.removeItem('wealthflow_google_access_token');
      } catch (e) {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('google_auth_error', {
          detail: { message: "Sua sessão do Google Drive expirou ou as credenciais são inválidas (Erro 401). Por favor, reautentique com o Google para renovar o acesso." }
        }));
      }
      throw new Error("Sessão expirada. Por favor, desconecte e conecte sua conta do Google Drive novamente para renovar o acesso.");
    }

    return mockResponse;
  } catch (err: any) {
    if (err.message && err.message.includes("Sessão expirada")) {
      throw err;
    }
    
    const isNetworkError = !err.status && (
      err.message === 'Failed to fetch' ||
      err.name === 'TypeError' ||
      err.message?.toLowerCase().includes('network') ||
      err.message?.toLowerCase().includes('fetch') ||
      err.message?.toLowerCase().includes('load failed')
    );

    if (isNetworkError) {
      throw new Error("Falha na conexão com as APIs do Google (Failed to fetch). Isso costuma ocorrer quando um bloqueador de anúncios (AdBlock) ou extensão de privacidade está bloqueando o domínio 'googleapis.com' no seu navegador. Tente desativar o AdBlock ou reconectar sua conta nas configurações do aplicativo para renovar o acesso.");
    }
    
    throw err;
  }
};

/**
 * Helper to find or create a folder in Google Drive.
 */
const findOrCreateFolder = async (accessToken: string, folderName: string, parentId?: string): Promise<string> => {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;
  const res = await googleApiFetch(searchUrl, accessToken);
  if (!res.ok) {
    throw new Error(`Erro ao buscar pasta '${folderName}': ${await res.text()}`);
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create folder
  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    body.parents = [parentId];
  }
  const createRes = await googleApiFetch('https://www.googleapis.com/drive/v3/files', accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!createRes.ok) {
    throw new Error(`Erro ao criar pasta '${folderName}': ${await createRes.text()}`);
  }
  const createData = await createRes.json();
  return createData.id;
};

/**
 * Encontra ou cria uma planilha com o nome 'Finanças Gaeta' (ou 'WealthFlow Finance Data' como fallback) no Google Drive do usuário.
 * A planilha é criada ou mantida na pasta 'appsheet/Data'.
 */
export const findOrCreateSpreadsheet = async (accessToken: any): Promise<string> => {
  const tokenStr = toSafeString(accessToken).trim();
  const savedSheetId = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_sheet_id')) : '';
  const cleanSaved = (savedSheetId && !savedSheetId.startsWith('http') && savedSheetId !== 'active_sheet') ? savedSheetId : DEFAULT_SPREADSHEET_ID;

  if (!tokenStr) {
    return DEFAULT_SPREADSHEET_ID;
  }

  // Google Apps Script Web App
  if (tokenStr.includes('script.google.com') || tokenStr.startsWith('http')) {
    return cleanSaved;
  }

  // Direct sheets mode
  if (tokenStr === 'wealthflow_direct_sheets_connected' || tokenStr.startsWith('wealthflow_')) {
    return cleanSaved;
  }

  // Google Sheet URL
  if (tokenStr.includes('docs.google.com/spreadsheets/d/')) {
    const sheetIdMatch = tokenStr.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (sheetIdMatch && sheetIdMatch[1]) {
      return sheetIdMatch[1];
    }
  }

  // Raw Spreadsheet ID
  if (/^[a-zA-Z0-9-_]{25,60}$/.test(tokenStr)) {
    return tokenStr;
  }

  // 1. Garantir que a pasta 'appsheet' exista
  const appsheetFolderId = await findOrCreateFolder(tokenStr, 'appsheet');
  
  // 2. Garantir que a pasta 'Data' exista dentro de 'appsheet'
  const dataFolderId = await findOrCreateFolder(tokenStr, 'Data', appsheetFolderId);

  // 3. Procurar se a planilha 'Finanças Gaeta' ou 'WealthFlow Finance Data' já existe dentro de 'appsheet/Data'
  const queryInFolder = `(name = 'Finanças Gaeta' or name = 'WealthFlow Finance Data') and mimeType = 'application/vnd.google-apps.spreadsheet' and '${dataFolderId}' in parents and trashed = false`;
  const searchInFolderUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryInFolder)}&fields=files(id,name,parents)`;
  
  const searchInFolderRes = await googleApiFetch(searchInFolderUrl, accessToken);
  
  if (!searchInFolderRes.ok) {
    const errorDetails = await searchInFolderRes.text();
    throw new Error(`Erro ao buscar planilha na pasta Data: ${errorDetails}`);
  }
  
  const searchInFolderData = await searchInFolderRes.json();
  if (searchInFolderData.files && searchInFolderData.files.length > 0) {
    return searchInFolderData.files[0].id;
  }

  // 4. Se não estiver em 'appsheet/Data', procurar globalmente para ver se ela existe em outro local
  const queryGlobal = `(name = 'Finanças Gaeta' or name = 'WealthFlow Finance Data') and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`;
  const searchGlobalUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryGlobal)}&fields=files(id,name,parents)`;
  
  const searchGlobalRes = await googleApiFetch(searchGlobalUrl, accessToken);
  
  if (searchGlobalRes.ok) {
    const searchGlobalData = await searchGlobalRes.json();
    if (searchGlobalData.files && searchGlobalData.files.length > 0) {
      const file = searchGlobalData.files[0];
      const fileId = file.id;
      const currentParents = file.parents || [];
      
      if (currentParents.includes(dataFolderId)) {
        return fileId;
      }
      
      // Move a planilha existente para a pasta 'Data'
      const removeParents = currentParents.join(',');
      const moveUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${dataFolderId}${removeParents ? `&removeParents=${removeParents}` : ''}`;
      
      const moveRes = await googleApiFetch(moveUrl, accessToken, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      
      if (moveRes.ok) {
        console.log(`Planilha movida com sucesso para appsheet/Data (ID da pasta: ${dataFolderId})`);
        return fileId;
      } else {
        console.warn(`Falha ao mover planilha existente: ${await moveRes.text()}`);
        return fileId;
      }
    }
  }

  // 5. Se não existir em nenhum lugar, cria uma nova planilha diretamente dentro da pasta 'Data' com o nome 'Finanças Gaeta'
  const createRes = await googleApiFetch('https://www.googleapis.com/drive/v3/files', accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Finanças Gaeta',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: [dataFolderId]
    })
  });
  
  if (!createRes.ok) {
    const errorDetails = await createRes.text();
    throw new Error(`Erro ao criar planilha na pasta Data: ${errorDetails}`);
  }
  
  const fileData = await createRes.json();
  return fileData.id;
};

/**
 * Envia um backup completo dos dados do aplicativo em formato JSON para a pasta 'appsheet/Backups' no Google Drive.
 */
export const uploadBackupToDrive = async (
  accessToken: string,
  backupData: any
): Promise<string> => {
  // 1. Garantir que a pasta 'appsheet' exista
  const appsheetFolderId = await findOrCreateFolder(accessToken, 'appsheet');
  
  // 2. Garantir que a pasta 'Backups' exista dentro de 'appsheet'
  const backupsFolderId = await findOrCreateFolder(accessToken, 'Backups', appsheetFolderId);

  // 3. Criar nome do arquivo com timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
  const fileName = `wealthflow_backup_${timestamp}.json`;

  // 4. Criar metadados do arquivo na pasta de backups
  const createRes = await googleApiFetch('https://www.googleapis.com/drive/v3/files', accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: fileName,
      parents: [backupsFolderId],
      mimeType: 'application/json'
    })
  });

  if (!createRes.ok) {
    const errorDetails = await createRes.text();
    throw new Error(`Erro ao criar metadados do backup no Google Drive: ${errorDetails}`);
  }

  const fileData = await createRes.json();
  const fileId = fileData.id;

  // 5. Enviar o conteúdo do arquivo
  const fileContent = typeof backupData === 'string' ? backupData : JSON.stringify(backupData, null, 2);
  const uploadRes = await googleApiFetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, accessToken, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    body: fileContent
  });

  if (!uploadRes.ok) {
    const errorDetails = await uploadRes.text();
    throw new Error(`Erro ao enviar o conteúdo do backup para o Google Drive: ${errorDetails}`);
  }

  return fileName;
};

/**
 * Lista todos os arquivos de backup gerados na pasta 'appsheet/Backups' no Google Drive.
 */
export const listBackupsFromDrive = async (accessToken: string): Promise<any[]> => {
  const appsheetFolderId = await findOrCreateFolder(accessToken, 'appsheet');
  const backupsFolderId = await findOrCreateFolder(accessToken, 'Backups', appsheetFolderId);

  const query = `'${backupsFolderId}' in parents and name contains 'wealthflow_backup_' and mimeType = 'application/json' and trashed = false`;
  const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,createdTime,size)&orderBy=createdTime%20desc`;
  const res = await googleApiFetch(listUrl, accessToken);
  if (!res.ok) {
    throw new Error(`Erro ao listar backups do Google Drive: ${await res.text()}`);
  }
  const data = await res.json();
  return data.files || [];
};

/**
 * Baixa o conteúdo JSON de um backup do Google Drive a partir do fileId.
 */
export const downloadBackupFromDrive = async (accessToken: string, fileId: string): Promise<any> => {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await googleApiFetch(downloadUrl, accessToken);
  if (!res.ok) {
    throw new Error(`Erro ao baixar backup do Google Drive: ${await res.text()}`);
  }
  return await res.json();
};

/**
 * Sincroniza a lista de transações e de infrações/recursos com a planilha do Google Sheets em abas separadas.
 */
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
  categoryBudgets: { [category: string]: number } = {},
  customCategories: string[] = [],
  groceryItems: any[] = []
): Promise<string> => {
  const tokenStr = toSafeString(accessToken);
  const sheetIdStr = toSafeString(spreadsheetId);

  // Resolve effective token/URL if saved in localStorage
  const storedAppsScriptUrl = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_apps_script_url')) : '';
  const effectiveAppsScriptUrl = (tokenStr && (tokenStr.includes('script.google.com') || tokenStr.startsWith('http')))
    ? tokenStr
    : (storedAppsScriptUrl && (storedAppsScriptUrl.includes('script.google.com') || storedAppsScriptUrl.startsWith('http')))
      ? storedAppsScriptUrl
      : (sheetIdStr && (sheetIdStr.includes('script.google.com') || sheetIdStr.startsWith('http')))
        ? sheetIdStr
        : DEFAULT_APPS_SCRIPT_URL;

  // If using Google Apps Script Web App
  if (effectiveAppsScriptUrl) {
    const cleanSpreadsheetId = (sheetIdStr && !sheetIdStr.startsWith('http') && !sheetIdStr.includes('script.google.com') && sheetIdStr !== 'active_sheet')
      ? sheetIdStr
      : (typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_sheet_id')) || DEFAULT_SPREADSHEET_ID : DEFAULT_SPREADSHEET_ID);
    const safeSheetId = (cleanSpreadsheetId && cleanSpreadsheetId !== 'active_sheet') ? cleanSpreadsheetId : DEFAULT_SPREADSHEET_ID;

    // Apply expense category filter from localStorage if defined
    let txsToSync = Array.isArray(transactions) ? transactions : [];
    try {
      const syncCatsJson = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthflow_sync_categories') : null;
      if (syncCatsJson) {
        const allowedCats: string[] = JSON.parse(syncCatsJson);
        if (Array.isArray(allowedCats)) {
          const allowedUpper = new Set(allowedCats.map(c => String(c).trim().toUpperCase()));
          txsToSync = txsToSync.filter(tx => {
            const tipo = String(tx.tipo || '').toUpperCase();
            // Always keep RECEITA or filter expense transactions by category
            if (tipo === 'RECEITA') return true;
            const cat = String(tx.categoria || 'OUTROS').trim().toUpperCase();
            return allowedUpper.has(cat);
          });
        }
      }
    } catch (e) {
      console.warn('Erro ao filtrar categorias para sincronização:', e);
    }

    const formattedTxs = txsToSync.map(t => {
      const isAbast = String(t.categoria || t.Categoria || '').toUpperCase() === 'ABASTECIMENTO';
      const cartaoVal = t.Cartão_Id !== undefined && t.Cartão_Id !== null && String(t.Cartão_Id) !== ''
        ? String(t.Cartão_Id)
        : (t.cartaoid !== undefined && t.cartaoid !== null && String(t.cartaoid) !== ''
            ? String(t.cartaoid)
            : (t.cartaoId !== undefined && t.cartaoId !== null && String(t.cartaoId) !== ''
                ? String(t.cartaoId)
                : (t.bancoId || t.Banco_Id ? String(t.bancoId || t.Banco_Id) : '')));

      const valorPgVal = t.valorPg !== undefined ? t.valorPg : (t.Valor_PG !== undefined ? t.Valor_PG : (t.status === 'PAGO' ? t.valor : 0));
      const compTanque = t.completouTanque !== undefined ? (t.completouTanque ? 'Sim' : 'Não') : (t.Completou_O_Tanque !== undefined ? String(t.Completou_O_Tanque) : '');
      const mediaVal = t.mediaKmL !== undefined ? t.mediaKmL : (t['Média_(Km/L)'] !== undefined ? t['Média_(Km/L)'] : '');
      const kmPercVal = t.kmPercorrido !== undefined ? t.kmPercorrido : (t.KM_Percorrido !== undefined ? t.KM_Percorrido : '');

      return {
        ...t,
        Id: t.id || t.Id,
        Data: t.data || t.Data || '',
        Descrição: t.descricao || t.Descrição || '',
        Valor: t.valor !== undefined ? t.valor : t.Valor,
        Valor_PG: valorPgVal,
        Banco_Id: t.bancoId || t.Banco_Id || '',
        Cartão_Id: cartaoVal,
        Forma_Pagamento: t.formaPagamento || t.Forma_Pagamento || '',
        Tipo: t.tipo || t.Tipo || 'DESPESA',
        Categoria: t.categoria || t.Categoria || '',
        Status: t.status || t.Status || 'PAGO',
        KM: isAbast ? (t.km !== undefined ? t.km : (t.KM !== undefined ? t.KM : '')) : '',
        Litros: isAbast ? (t.litros !== undefined ? t.litros : (t.Litros !== undefined ? t.Litros : '')) : '',
        Preço_Litro: isAbast ? (t.precoLitro !== undefined ? t.precoLitro : (t.Preço_Litro !== undefined ? t.Preço_Litro : '')) : '',
        Completou_O_Tanque: compTanque,
        KM_Percorrido: isAbast ? kmPercVal : '',
        'Média_(Km/L)': isAbast ? mediaVal : '',
        Veiculo: isAbast ? (t.veiculo || t.Veiculo || 'CARRO') : '',
        Descrição_Do_Veículo: t.descricaoVeiculo || t.Descrição_Do_Veículo || '',
        Motorista: t.motorista || t.Motorista || '',
        Nome_Posto: t.nomePosto || t.Nome_Posto || '',
        Localização_Do_Posto: t.localizacaoPosto || t.Localização_Do_Posto || '',
        Comprovante_Url: t.comprovanteUrl || t.Comprovante_Url || '',
        OBS: t.obs || t.OBS || ''
      };
    });

    const payload = {
      action: 'syncData',
      spreadsheetId: cleanSpreadsheetId,
      transactions: formattedTxs,
      infractions: Array.isArray(infractions) ? infractions : [],
      riskZones: Array.isArray(riskZones) ? riskZones : [],
      appointments: Array.isArray(appointments) ? appointments : [],
      prescriptions: Array.isArray(prescriptions) ? prescriptions : [],
      compromissos: Array.isArray(compromissos) ? compromissos : [],
      registeredVehicles: Array.isArray(registeredVehicles) ? registeredVehicles : [],
      performedServices: Array.isArray(performedServices) ? performedServices : [],
      scheduledServices: Array.isArray(scheduledServices) ? scheduledServices : [],
      bankAccounts: Array.isArray(bankAccounts) ? bankAccounts : [],
      creditCards: Array.isArray(creditCards) ? creditCards : [],
      categoryBudgets: categoryBudgets || {},
      customCategories: Array.isArray(customCategories) ? customCategories : [],
      groceryItems: Array.isArray(groceryItems) ? groceryItems : []
    };

    const res = await callAppsScript(effectiveAppsScriptUrl, payload, 'POST');
    if (res && res.status === 'error') {
      throw new Error(res.error || 'Erro ao gravar dados na planilha do Google Apps Script');
    }

    if (res && res.spreadsheetId && typeof res.spreadsheetId === 'string' && !res.spreadsheetId.startsWith('http')) {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('wealthflow_sheet_id', res.spreadsheetId);
      }
    }

    return (cleanSpreadsheetId && cleanSpreadsheetId !== 'active_sheet') ? cleanSpreadsheetId : '';
  }

  // Guard against making legacy Google Sheets API calls with a Web App URL as spreadsheetId
  if (!sheetIdStr || sheetIdStr.startsWith('http') || sheetIdStr.includes('script.google.com') || sheetIdStr === 'active_sheet') {
    console.warn("syncDataToSpreadsheet: spreadsheetId é uma URL, inválido ou 'active_sheet' para API REST do Google. Operação concluída via dados locais.");
    return '';
  }

  // Direct sheets mode without external OAuth
  if (tokenStr === 'wealthflow_direct_sheets_connected' || tokenStr.startsWith('wealthflow_')) {
    if (storedAppsScriptUrl) {
      // Retry via stored Apps Script URL if available
      return syncDataToSpreadsheet(storedAppsScriptUrl, sheetIdStr, transactions, infractions, riskZones, appointments, prescriptions, compromissos, registeredVehicles, performedServices, scheduledServices, bankAccounts, creditCards, categoryBudgets, customCategories, groceryItems);
    }
    return sheetIdStr;
  }

  // 1. Buscar as abas atuais da planilha
  const metaRes = await googleApiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`, accessToken);
  
  if (!metaRes.ok) {
    throw new Error(`Erro ao buscar metadados da planilha: ${await metaRes.text()}`);
  }
  
  const metaData = await metaRes.json();
  const existingSheetTitles: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);
  
  // Normalizador de abas
  const normalizeSheetName = (str: string): string => {
    return String(str || '')
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "");
  };

  const normalizedExisting = existingSheetTitles.map((title: string) => ({
    original: title,
    normalized: normalizeSheetName(title)
  }));

  // Procurar correspondentes para as abas exatas
  const matchReceitas = normalizedExisting.find(item => item.normalized === 'RECEITAS');
  const matchDespesas = normalizedExisting.find(item => item.normalized === 'DESPESAS');
  const matchAbastecimentos = normalizedExisting.find(item => item.normalized === 'ABASTECIMENTOS');
  const matchOficina = normalizedExisting.find(item => item.normalized === 'OFICINA');
  const matchAgenda = normalizedExisting.find(item => item.normalized === 'AGENDA');
  const matchZonaRisco = normalizedExisting.find(item => 
    item.normalized === 'ZONADERISCO' || 
    item.normalized === 'ZONASDERISCO' ||
    item.normalized === 'ZONARISCO' ||
    item.normalized === 'ZONASRISCO'
  );
  const matchConsultas = normalizedExisting.find(item => item.normalized === 'CONSULTAS');
  const matchAnalise = normalizedExisting.find(item => item.normalized === 'ANALISE');
  const matchPerfil = normalizedExisting.find(item => item.normalized === 'PERFIL');
  const matchListaMercado = normalizedExisting.find(item => 
    item.normalized === 'LISTAMERCADO' || 
    item.normalized === 'MERCADO' ||
    item.normalized === 'LISTADEMERCADO'
  );

  let receitasSheetTitle = matchReceitas ? matchReceitas.original : 'Receitas';
  let despesasSheetTitle = matchDespesas ? matchDespesas.original : 'Despesas';
  let abastecimentosSheetTitle = matchAbastecimentos ? matchAbastecimentos.original : 'Abastecimentos';
  let oficinaSheetTitle = matchOficina ? matchOficina.original : 'Oficina';
  let agendaSheetTitle = matchAgenda ? matchAgenda.original : 'Agenda';
  let zonaRiscoSheetTitle = matchZonaRisco ? matchZonaRisco.original : 'Zona de risco';
  let consultasSheetTitle = matchConsultas ? matchConsultas.original : 'Consultas';
  let analiseSheetTitle = matchAnalise ? matchAnalise.original : 'Análise';
  let perfilSheetTitle = matchPerfil ? matchPerfil.original : 'Perfil';
  let listaMercadoSheetTitle = matchListaMercado ? matchListaMercado.original : 'ListaMercado';

  const requests: any[] = [];
  if (!matchReceitas) {
    requests.push({ addSheet: { properties: { title: 'Receitas' } } });
    receitasSheetTitle = 'Receitas';
  }
  if (!matchDespesas) {
    requests.push({ addSheet: { properties: { title: 'Despesas' } } });
    despesasSheetTitle = 'Despesas';
  }
  if (!matchAbastecimentos) {
    requests.push({ addSheet: { properties: { title: 'Abastecimentos' } } });
    abastecimentosSheetTitle = 'Abastecimentos';
  }
  if (!matchOficina) {
    requests.push({ addSheet: { properties: { title: 'Oficina' } } });
    oficinaSheetTitle = 'Oficina';
  }
  if (!matchAgenda) {
    requests.push({ addSheet: { properties: { title: 'Agenda' } } });
    agendaSheetTitle = 'Agenda';
  }
  if (!matchZonaRisco) {
    requests.push({ addSheet: { properties: { title: 'Zona de risco' } } });
    zonaRiscoSheetTitle = 'Zona de risco';
  }
  if (!matchConsultas) {
    requests.push({ addSheet: { properties: { title: 'Consultas' } } });
    consultasSheetTitle = 'Consultas';
  }
  if (!matchAnalise) {
    requests.push({ addSheet: { properties: { title: 'Análise' } } });
    analiseSheetTitle = 'Análise';
  }
  if (!matchPerfil) {
    requests.push({ addSheet: { properties: { title: 'Perfil' } } });
    perfilSheetTitle = 'Perfil';
  }
  if (!matchListaMercado) {
    requests.push({ addSheet: { properties: { title: 'ListaMercado' } } });
    listaMercadoSheetTitle = 'ListaMercado';
  }
  
  // Se houver abas faltando, criá-las via batchUpdate
  if (requests.length > 0) {
    const updateRes = await googleApiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, accessToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ requests })
    });
    if (!updateRes.ok) {
      console.warn("Aviso ao criar novas abas na planilha:", await updateRes.text());
    }
  }

  // 2. Preparar dados das Transações
  const sortedTx = [...transactions].sort((a, b) => {
    const partsA = (a.data || '').split('/');
    const partsB = (b.data || '').split('/');
    const dateA = partsA.length === 3 ? new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime() : 0;
    const dateB = partsB.length === 3 ? new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime() : 0;
    return dateA - dateB;
  });

  const kmMapByVehicle: { [vehicle: string]: number } = {};
  const kmPercorridoByTxId: { [txId: number]: number } = {};
  const mediaMapByTxId: { [txId: number]: number } = {};

  sortedTx.forEach(t => {
    if (t.categoria === 'ABASTECIMENTO' && t.km) {
      const vehicle = String(t.veiculo || 'FOX').toUpperCase();
      const prevKm = kmMapByVehicle[vehicle];
      if (prevKm !== undefined && t.km > prevKm) {
        const distance = t.km - prevKm;
        kmPercorridoByTxId[t.id] = distance;
        if (t.litros && t.litros > 0) {
          mediaMapByTxId[t.id] = distance / t.litros;
        }
      }
      kmMapByVehicle[vehicle] = t.km;
    }
  });

  const txHeaders = [
    "Id", "Data", "Descrição", "Valor", "Valor_PG", "Banco_Id", "Cartão_Id", "Forma_Pagamento",
    "Tipo", "Categoria", "Status", "KM", "Litros", "Preço_Litro", "Completou_O_Tanque",
    "KM_Percorrido", "Média_(Km/L)", "Veiculo", "Descrição_Do_Veículo", "Motorista",
    "Nome_Posto", "Localização_Do_Posto", "Comprovante_Url", "OBS"
  ];

  const isReceitaTx = (t: any) => {
    if (!t) return false;
    const tipo = String(t.tipo || '').trim().toUpperCase();
    const cat = String(t.categoria || '').trim().toUpperCase();
    const desc = String(t.descricao || '').trim().toUpperCase();
    return (
      tipo === 'RECEITA' ||
      tipo === 'RECEBIDO' ||
      tipo === 'ENTRADA' ||
      tipo.includes('RECEIT') ||
      cat === 'RECEITA' ||
      cat === 'RECEITAS' ||
      cat === 'ENTRADA' ||
      cat === 'ENTRADAS' ||
      cat === 'PROVENTOS' ||
      cat === 'SALARIO' ||
      cat === 'SALÁRIO' ||
      cat.includes('RECEIT') ||
      desc.startsWith('PIX RECEBIDO') ||
      desc.includes('RECEITA DE') ||
      desc.includes('RECEBIMENTO')
    );
  };

  const isAbastecimentoTx = (t: any) => {
    if (!t) return false;
    const cat = String(t.categoria || '').trim().toUpperCase();
    return cat === 'ABASTECIMENTO' || cat === 'ABASTECIMENTOS' || cat === 'COMBUSTIVEL' || cat === 'COMBUSTÍVEL';
  };

  const mapTxToRow = (t: any) => {
    const isAbast = isAbastecimentoTx(t);
    const isRec = isReceitaTx(t);
    const media = t.mediaKmL !== undefined ? t.mediaKmL : (t['Média_(Km/L)'] !== undefined ? t['Média_(Km/L)'] : mediaMapByTxId[t.id]);
    const kmPerc = t.kmPercorrido !== undefined ? t.kmPercorrido : (t.KM_Percorrido !== undefined ? t.KM_Percorrido : kmPercorridoByTxId[t.id]);
    const valorPgVal = t.valorPg !== undefined ? t.valorPg : (t.Valor_PG !== undefined ? t.Valor_PG : (t.status === 'PAGO' ? t.valor : 0));

    const numValor = typeof t.valor === 'number' ? t.valor : parseFloat(String(t.valor || 0).replace(/\./g, '').replace(',', '.'));
    const safeValor = isNaN(numValor) ? 0 : numValor;

    const numValorPg = typeof valorPgVal === 'number' ? valorPgVal : parseFloat(String(valorPgVal || 0).replace(/\./g, '').replace(',', '.'));
    const safeValorPg = isNaN(numValorPg) ? 0 : numValorPg;

    const numLitros = typeof t.litros === 'number' ? t.litros : (typeof t.Litros === 'number' ? t.Litros : parseFloat(String(t.litros || t.Litros || 0).replace(',', '.')));
    const numPrecoLitro = typeof t.precoLitro === 'number' ? t.precoLitro : (typeof t.Preço_Litro === 'number' ? t.Preço_Litro : parseFloat(String(t.precoLitro || t.Preço_Litro || 0).replace(',', '.')));
    const numMedia = typeof media === 'number' ? media : parseFloat(String(media || 0).replace(',', '.'));

    const cartaoVal = t.Cartão_Id !== undefined && t.Cartão_Id !== null && String(t.Cartão_Id) !== ''
      ? String(t.Cartão_Id)
      : (t.cartaoid !== undefined && t.cartaoid !== null && String(t.cartaoid) !== ''
          ? String(t.cartaoid)
          : (t.cartaoId !== undefined && t.cartaoId !== null && String(t.cartaoId) !== ''
              ? String(t.cartaoId)
              : (t.bancoId || t.Banco_Id ? String(t.bancoId || t.Banco_Id) : '')));

    const compTanqueBool = t.completouTanque !== undefined ? t.completouTanque : (t.Completou_O_Tanque !== undefined ? (t.Completou_O_Tanque === 'Sim' || t.Completou_O_Tanque === true) : true);

    return [
      t.id || t.Id,
      t.data || t.Data || '',
      t.descricao || t.Descrição || '',
      safeValor.toFixed(2).replace('.', ','),
      safeValorPg.toFixed(2).replace('.', ','),
      t.bancoId || t.Banco_Id || '',
      cartaoVal,
      t.formaPagamento || t.Forma_Pagamento || '',
      isAbast ? (t.tipo || t.Tipo || 'DESPESA') : (isRec ? 'RECEITA' : (t.tipo || t.Tipo || 'DESPESA')),
      t.categoria || t.Categoria || '',
      t.status || t.Status || 'PAGO',
      isAbast && (t.km || t.KM) ? String(t.km || t.KM) : '',
      isAbast && (t.litros || t.Litros) ? (isNaN(numLitros) ? '0,00' : numLitros.toFixed(2).replace('.', ',')) : '',
      isAbast && (t.precoLitro || t.Preço_Litro) ? (isNaN(numPrecoLitro) ? '0,000' : numPrecoLitro.toFixed(3).replace('.', ',')) : '',
      isAbast ? (compTanqueBool ? 'Sim' : 'Não') : '',
      isAbast && kmPerc !== undefined ? String(kmPerc) : '',
      isAbast && media !== undefined ? (isNaN(numMedia) ? '0,00' : numMedia.toFixed(2).replace('.', ',')) : '',
      isAbast ? (t.veiculo || t.Veiculo || 'CARRO') : '',
      t.descricaoVeiculo || t.Descrição_Do_Veículo || '',
      t.motorista || t.Motorista || '',
      t.nomePosto || t.Nome_Posto || '',
      t.localizacaoPosto || t.Localização_Do_Posto || '',
      t.comprovanteUrl || t.Comprovante_Url || '',
      t.obs || t.OBS || ''
    ];
  };

  // Load sync category filters if specified by user
  let allowedCategories: string[] = [];
  try {
    const savedCats = typeof localStorage !== 'undefined' ? localStorage.getItem('wealthflow_sync_categories') : null;
    if (savedCats) {
      allowedCategories = JSON.parse(savedCats);
    }
  } catch (e) {}

  const shouldIncludeCategory = (catName: string) => {
    if (!allowedCategories || allowedCategories.length === 0 || allowedCategories.includes('TODAS')) {
      return true;
    }
    const catUpper = String(catName || 'OUTROS').trim().toUpperCase();
    return allowedCategories.some(c => String(c).trim().toUpperCase() === catUpper);
  };

  // Split transactions into Receitas, Despesas, Abastecimentos
  const receitasRows = transactions.filter(t => isReceitaTx(t)).map(mapTxToRow);
  const abastecimentosRows = transactions.filter(t => isAbastecimentoTx(t) && !isReceitaTx(t) && shouldIncludeCategory(t.categoria || 'ABASTECIMENTO')).map(mapTxToRow);
  const despesasRows = transactions.filter(t => !isReceitaTx(t) && !isAbastecimentoTx(t) && shouldIncludeCategory(t.categoria)).map(mapTxToRow);

  // 3. Oficina (Serviços Realizados + Serviços Agendados)
  const oficinaHeaders = [
    "ID", "Tipo Registro", "Veículo", "Descrição do Serviço", "Data / Data Alvo", 
    "Quilometragem (KM)", "Valor Pago (R$)", "Oficina/Estabelecimento", 
    "Recorrente", "Frequência (Meses)", "Frequência (KM)", "Status", "Observações"
  ];
  const perfRows = performedServices.map(s => [
    s.id,
    "REALIZADO",
    s.veiculoDescricao || '',
    s.descricao || '',
    s.data || '',
    s.km !== undefined ? String(s.km) : '',
    s.valor !== undefined ? s.valor.toFixed(2).replace('.', ',') : '0,00',
    s.oficina || '',
    '', '', '', '',
    s.observacoes || ''
  ]);
  const schedRows = scheduledServices.map(s => [
    s.id,
    "AGENDADO",
    s.veiculoDescricao || '',
    s.descricao || '',
    s.dataAlvo || '',
    s.kmAlvo !== undefined ? String(s.kmAlvo) : '',
    '', '',
    s.recorrente ? 'Sim' : 'Não',
    s.frequenciaMeses !== undefined ? String(s.frequenciaMeses) : '',
    s.frequenciaKm !== undefined ? String(s.frequenciaKm) : '',
    s.status || 'PENDENTE',
    ''
  ]);
  const oficinaRows = [...perfRows, ...schedRows];

  // 4. Agenda (Compromissos)
  const agendaHeaders = [
    "ID", "Título", "Data", "Hora", "Descrição", "Cor de Identificação", "Efeito Alerta (Piscando)", "Lembrete Ativo", "Dias de Antecedência"
  ];
  const agendaRows = compromissos.map(c => [
    c.id,
    c.titulo || '',
    c.data || '',
    c.hora || '',
    c.descricao || '',
    c.cor || '',
    c.piscando ? 'Sim' : 'Não',
    c.lembreteAtivo ? 'Sim' : 'Não',
    c.diasAntecedencia !== undefined ? c.diasAntecedencia : 2
  ]);

  // 5. Zona de risco (Zonas de risco + Infrações)
  const zonaRiscoHeaders = [
    "ID", "Tipo Registro", "Nome / Título", "Nível de Risco / Placa", "Status Geral / Veículo", 
    "Ativo", "Mensagem de Alerta / Data Ocorrência", "Raio (m) / Data Submissão", 
    "Latitude / Status Multa", "Longitude / Valor Multa (R$)", "Data Registro / Pontos CNH", 
    "Justificativa / Recurso", "Descrição / Evidências"
  ];
  const zRows = riskZones.map(z => [
    z.id,
    "ZONA_RISCO",
    z.nomeLocal || '',
    z.nivelRisco || 'BAIXO',
    z.statusGeral || 'ALERTA',
    z.ativo ? 'Sim' : 'Não',
    z.mensagem || '',
    String(z.raioMetros || 100),
    z.latitude || '',
    z.longitude || '',
    z.dataRegistro || '',
    '',
    z.som || ''
  ]);
  // Módulo de Infrações descontinuado - não enviar para o Google Sheets
  const zonaRiscoRows = zRows;

  // 6. Consultas (Appointments + Prescriptions)
  const consultasHeaders = [
    "ID", "Tipo Registro", "Especialidade", "Médico", "Data / Emissão", 
    "Hora / Vencimento", "Local / Medicamentos", "Instruções", 
    "Lembrete Ativo", "Status / Possui Anexo", "Nome do Arquivo", "Observações"
  ];
  const apptRows = appointments.map(a => [
    a.id,
    "CONSULTA",
    a.especialidade || '',
    a.medico || '',
    a.data || '',
    a.hora || '',
    a.local || '',
    '',
    a.lembreteAtivo ? 'Sim' : 'Não',
    a.status || 'Agendada',
    '',
    a.observacoes || ''
  ]);
  const prescRows = prescriptions.map(p => [
    p.id,
    "RECEITA",
    p.especialidade || '',
    p.medico || '',
    p.data || '',
    p.dataVencimento || '',
    p.medicamentos || '',
    p.instrucoes || '',
    '',
    p.arquivoAnexo ? 'Sim' : 'Não',
    p.nomeArquivoAnexo || '',
    p.observacoes || ''
  ]);
  const consultasRows = [...apptRows, ...prescRows];

  // 7. Análise (Category Budgets and dynamic spending summary)
  const analiseHeaders = [
    "Categoria/Métrica", "Tipo de Registro", "Valor Planejado/Orçamento (R$)", 
    "Valor Gasto Atual (R$)", "Diferença / Saldo (R$)", "Status / Alerta", "Percentual de Uso"
  ];
  const spentByCategory: { [cat: string]: number } = {};
  transactions.forEach(t => {
    if (t.tipo === 'DESPESA') {
      const cat = t.categoria || 'OUTROS';
      spentByCategory[cat] = (spentByCategory[cat] || 0) + (t.valor || 0);
    }
  });

  const allCats = Array.from(new Set([
    ...Object.keys(categoryBudgets || {}),
    ...transactions.map(t => t.categoria).filter(Boolean),
    ...(customCategories || [])
  ])).filter(c => c !== 'RECEITA');

  const analiseRows = allCats.map(cat => {
    const budget = (categoryBudgets && categoryBudgets[cat]) || 0;
    const spent = spentByCategory[cat] || 0;
    const diff = budget - spent;
    const pct = budget > 0 ? (spent / budget) * 100 : 0;
    const status = budget === 0 ? 'Sem Teto' : (diff < 0 ? 'ESTOURADO ⚠️' : 'Dentro do Limite ✅');
    return [
      cat,
      "LIMITE_ORÇAMENTO",
      budget.toFixed(2).replace('.', ','),
      spent.toFixed(2).replace('.', ','),
      diff.toFixed(2).replace('.', ','),
      status,
      `${pct.toFixed(1).replace('.', ',')}%`
    ];
  });

  // 8. Perfil (Contas, Cartões, Veículos e Configurações Gerais)
  const perfilHeaders = [
    "ID / Chave", "Tipo Registro", "Nome / Parâmetro", "Agência / Tipo de Cartão / Placa", 
    "Conta / Limite Total (R$)", "Saldo Inicial / Gasto Atual (R$)", "Limite Especial / Limite Disponível (R$)"
  ];
  const bankRowsFormatted = bankAccounts.map(b => [
    String(b.id),
    "CONTA_BANCARIA",
    b.nome || '',
    b.tipo || 'BANCO',
    b.conta || '',
    b.saldoInicial !== undefined ? b.saldoInicial.toFixed(2).replace('.', ',') : '0,00',
    b.limite !== undefined ? b.limite.toFixed(2).replace('.', ',') : '0,00'
  ]);
  const cardRowsFormatted = creditCards.map(c => [
    String(c.id),
    "CARTAO_CREDITO",
    c.nome || '',
    c.tipo || 'CARTÃO',
    c.limite !== undefined ? c.limite.toFixed(2).replace('.', ',') : '0,00',
    c.gasto !== undefined ? c.gasto.toFixed(2).replace('.', ',') : '0,00',
    c.limite !== undefined && c.gasto !== undefined ? (c.limite - c.gasto).toFixed(2).replace('.', ',') : '0,00'
  ]);
  const vehRowsFormatted = (registeredVehicles || [])
    .filter(v => v && typeof v === 'object')
    .map(v => [
      String(v.id || ''),
      "VEICULO_REGISTRADO",
      String(v.descricao || v.modelo || ''),
      String(v.placa || ''),
      String(v.motorista || ''),
      v.mesFinalPlaca !== undefined && v.mesFinalPlaca !== null ? String(v.mesFinalPlaca) : '',
      ''
    ]);
  const perfilRows = [...bankRowsFormatted, ...cardRowsFormatted, ...vehRowsFormatted];

  // 9. ListaMercado
  const mercadoHeaders = ["ID", "Item", "Categoria", "Quantidade", "Valor Estimado (R$)", "Comprado", "Total (R$)", "Observação"];
  const mercadoRows = (groceryItems || []).map(g => [
    String(g.id || ''),
    g.nome || '',
    g.categoria || 'Outros',
    g.quantidade !== undefined ? String(g.quantidade) : '1',
    g.valorEstimado !== undefined ? Number(g.valorEstimado).toFixed(2).replace('.', ',') : '0,00',
    g.comprado ? 'SIM' : 'NÃO',
    g.valorEstimado && g.quantidade ? (Number(g.valorEstimado) * Number(g.quantidade)).toFixed(2).replace('.', ',') : '0,00',
    g.observacao || ''
  ]);

  // 10. Limpar dados anteriores de todas as abas usando os nomes resolvidos exatos
  const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchClear`;
  const clearRes = await googleApiFetch(clearUrl, accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ranges: [
        `'${receitasSheetTitle}'!A1:Z2000`, 
        `'${despesasSheetTitle}'!A1:Z2000`,
        `'${abastecimentosSheetTitle}'!A1:Z2000`,
        `'${oficinaSheetTitle}'!A1:N2000`,
        `'${agendaSheetTitle}'!A1:J2000`,
        `'${zonaRiscoSheetTitle}'!A1:O2000`,
        `'${consultasSheetTitle}'!A1:M2000`,
        `'${analiseSheetTitle}'!A1:H2000`,
        `'${perfilSheetTitle}'!A1:H2000`,
        `'${listaMercadoSheetTitle}'!A1:J2000`
      ]
    })
  });
  if (!clearRes.ok) {
    console.warn("Aviso ao limpar os dados antigos da planilha:", await clearRes.text());
  }

  // 11. Gravar os dados em lote nas abas correspondentes
  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  const writeBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: `'${receitasSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [txHeaders, ...receitasRows]
      },
      {
        range: `'${despesasSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [txHeaders, ...despesasRows]
      },
      {
        range: `'${abastecimentosSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [txHeaders, ...abastecimentosRows]
      },
      {
        range: `'${oficinaSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [oficinaHeaders, ...oficinaRows]
      },
      {
        range: `'${agendaSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [agendaHeaders, ...agendaRows]
      },
      {
        range: `'${zonaRiscoSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [zonaRiscoHeaders, ...zonaRiscoRows]
      },
      {
        range: `'${consultasSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [consultasHeaders, ...consultasRows]
      },
      {
        range: `'${analiseSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [analiseHeaders, ...analiseRows]
      },
      {
        range: `'${perfilSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [perfilHeaders, ...perfilRows]
      },
      {
        range: `'${listaMercadoSheetTitle}'!A1`,
        majorDimension: 'ROWS',
        values: [mercadoHeaders, ...mercadoRows]
      }
    ]
  };

  const writeRes = await googleApiFetch(writeUrl, accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(writeBody)
  });

  if (!writeRes.ok) {
    const errorDetails = await writeRes.text();
    throw new Error(`Erro ao gravar dados em lote na planilha: ${errorDetails}`);
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
};

/**
 * Sincroniza a lista de transações com a planilha do Google Sheets.
 */
export const syncTransactionsToSpreadsheet = async (
  accessToken: string,
  spreadsheetId: string,
  transactions: any[]
): Promise<string> => {
  // Limpar dados anteriores para evitar que sobrem linhas velhas se a nova lista for menor
  const clearRes = await googleApiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:Z1000:clear`, accessToken, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  if (!clearRes.ok) {
    console.warn("Aviso ao limpar planilha:", await clearRes.text());
  }

  // Order transactions by date (ascending) to calculate KM differences for fuel efficiency
  const sortedTx = [...transactions].sort((a, b) => {
    const partsA = (a.data || '').split('/');
    const partsB = (b.data || '').split('/');
    const dateA = partsA.length === 3 ? new Date(`${partsA[2]}-${partsA[1]}-${partsA[0]}`).getTime() : 0;
    const dateB = partsB.length === 3 ? new Date(`${partsB[2]}-${partsB[1]}-${partsB[0]}`).getTime() : 0;
    return dateA - dateB;
  });

  const kmMapByVehicle: { [vehicle: string]: number } = {};
  const kmPercorridoByTxId: { [txId: number]: number } = {};
  const mediaMapByTxId: { [txId: number]: number } = {};

  sortedTx.forEach(t => {
    if (t.categoria === 'ABASTECIMENTO' && t.km) {
      const vehicle = String(t.veiculo || 'FOX').toUpperCase();
      const prevKm = kmMapByVehicle[vehicle];
      if (prevKm !== undefined && t.km > prevKm) {
        const distance = t.km - prevKm;
        kmPercorridoByTxId[t.id] = distance;
        if (t.litros && t.litros > 0) {
          mediaMapByTxId[t.id] = distance / t.litros;
        }
      }
      kmMapByVehicle[vehicle] = t.km;
    }
  });

  const headers = [
    "Id", "Data", "Descrição", "Valor", "Valor_PG", "Banco_Id", "Cartão_Id", "Forma_Pagamento",
    "Tipo", "Categoria", "Status", "KM", "Litros", "Preço_Litro", "Completou_O_Tanque",
    "KM_Percorrido", "Média_(Km/L)", "Veiculo", "Descrição_Do_Veículo", "Motorista",
    "Nome_Posto", "Localização_Do_Posto", "Comprovante_Url", "OBS"
  ];

  const rows = transactions.map(t => {
    const isAbastecimento = t.categoria === 'ABASTECIMENTO' || t.Categoria === 'ABASTECIMENTO';
    const media = t.mediaKmL !== undefined ? t.mediaKmL : (t['Média_(Km/L)'] !== undefined ? t['Média_(Km/L)'] : mediaMapByTxId[t.id]);
    const kmPerc = t.kmPercorrido !== undefined ? t.kmPercorrido : (t.KM_Percorrido !== undefined ? t.KM_Percorrido : kmPercorridoByTxId[t.id]);
    const valorPgVal = t.valorPg !== undefined ? t.valorPg : (t.Valor_PG !== undefined ? t.Valor_PG : (t.status === 'PAGO' ? t.valor : 0));

    const numValor = typeof t.valor === 'number' ? t.valor : parseFloat(String(t.valor || 0).replace(/\./g, '').replace(',', '.'));
    const safeValor = isNaN(numValor) ? 0 : numValor;

    const numValorPg = typeof valorPgVal === 'number' ? valorPgVal : parseFloat(String(valorPgVal || 0).replace(/\./g, '').replace(',', '.'));
    const safeValorPg = isNaN(numValorPg) ? 0 : numValorPg;

    const numLitros = typeof t.litros === 'number' ? t.litros : (typeof t.Litros === 'number' ? t.Litros : parseFloat(String(t.litros || t.Litros || 0).replace(',', '.')));
    const numPrecoLitro = typeof t.precoLitro === 'number' ? t.precoLitro : (typeof t.Preço_Litro === 'number' ? t.Preço_Litro : parseFloat(String(t.precoLitro || t.Preço_Litro || 0).replace(',', '.')));
    const numMedia = typeof media === 'number' ? media : parseFloat(String(media || 0).replace(',', '.'));

    const cartaoVal = t.Cartão_Id !== undefined && t.Cartão_Id !== null && String(t.Cartão_Id) !== ''
      ? String(t.Cartão_Id)
      : (t.cartaoid !== undefined && t.cartaoid !== null && String(t.cartaoid) !== ''
          ? String(t.cartaoid)
          : (t.cartaoId !== undefined && t.cartaoId !== null && String(t.cartaoId) !== ''
              ? String(t.cartaoId)
              : (t.bancoId || t.Banco_Id ? String(t.bancoId || t.Banco_Id) : '')));

    const compTanqueBool = t.completouTanque !== undefined ? t.completouTanque : (t.Completou_O_Tanque !== undefined ? (t.Completou_O_Tanque === 'Sim' || t.Completou_O_Tanque === true) : true);

    return [
      t.id || t.Id,
      t.data || t.Data || '',
      t.descricao || t.Descrição || '',
      safeValor.toFixed(2).replace('.', ','),
      safeValorPg.toFixed(2).replace('.', ','),
      t.bancoId || t.Banco_Id || '',
      cartaoVal,
      t.formaPagamento || t.Forma_Pagamento || '',
      isAbastecimento ? (t.tipo || t.Tipo || 'DESPESA') : (t.tipo === 'RECEITA' ? 'RECEITA' : (t.tipo || t.Tipo || 'DESPESA')),
      t.categoria || t.Categoria || '',
      t.status || t.Status || 'PAGO',
      isAbastecimento && (t.km || t.KM) ? String(t.km || t.KM) : '',
      isAbastecimento && (t.litros || t.Litros) ? (isNaN(numLitros) ? '0,00' : numLitros.toFixed(2).replace('.', ',')) : '',
      isAbastecimento && (t.precoLitro || t.Preço_Litro) ? (isNaN(numPrecoLitro) ? '0,000' : numPrecoLitro.toFixed(3).replace('.', ',')) : '',
      isAbastecimento ? (compTanqueBool ? 'Sim' : 'Não') : '',
      isAbastecimento && kmPerc !== undefined ? String(kmPerc) : '',
      isAbastecimento && media !== undefined ? (isNaN(numMedia) ? '0,00' : numMedia.toFixed(2).replace('.', ',')) : '',
      isAbastecimento ? (t.veiculo || t.Veiculo || 'CARRO') : '',
      t.descricaoVeiculo || t.Descrição_Do_Veículo || '',
      t.motorista || t.Motorista || '',
      t.nomePosto || t.Nome_Posto || '',
      t.localizacaoPosto || t.Localização_Do_Posto || '',
      t.comprovanteUrl || t.Comprovante_Url || '',
      t.obs || t.OBS || ''
    ];
  });

  const body = {
    range: 'A1',
    majorDimension: 'ROWS',
    values: [headers, ...rows]
  };

  const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1?valueInputOption=USER_ENTERED`;
  const writeRes = await googleApiFetch(writeUrl, accessToken, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!writeRes.ok) {
    const errorDetails = await writeRes.text();
    throw new Error(`Erro ao gravar dados na planilha: ${errorDetails}`);
  }

  return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
};

/**
 * Busca transações da planilha do Google Sheets.
 */
/**
 * Helper para decodificar linhas de transações de uma aba do Google Sheets.
 */
export const parseTransactionRows = (rows: any[], defaultSheetKey?: string): any[] => {
  if (!rows || rows.length === 0) return [];

  const sheetKeyUpper = String(defaultSheetKey || '').trim().toUpperCase();
  const isReceitasSheet = sheetKeyUpper.includes('RECEITA');
  const isAbastecimentosSheet = sheetKeyUpper.includes('ABASTECIMENTO') || sheetKeyUpper.includes('COMBUSTIVEL');
  const isDespesasSheet = sheetKeyUpper.includes('DESPESA');

  // Normalizador para cabeçalhos e termos de busca
  const normalizeHeader = (str: string): string => {
    return String(str || '')
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove acentos
      .replace(/[^A-Z0-9]/g, "");     // remove tudo que não for letra ou número
  };

  // Encontra a linha de cabeçalho dinamicamente procurando por palavras-chave conhecidas
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Se o vetor tiver campos de ID, DATA, CATEGORIA ou DESCRICAO
    const hasHeaderKeywords = row.some((cell: any) => {
      const norm = normalizeHeader(String(cell || ''));
      return norm === 'ID' || norm === 'DATA' || norm.includes('DESCRIC') || norm === 'CATEGORIA' || norm === 'VALOR';
    });
    
    if (hasHeaderKeywords) {
      headerRowIndex = i;
      break;
    }
  }

  // Fallback se não encontrar nenhuma linha com palavras-chave claras
  if (headerRowIndex === -1) {
    headerRowIndex = 0;
  }

  const headers = rows[headerRowIndex].map((h: string) => String(h || '').trim());
  const normalizedHeaders = headers.map((h: string) => normalizeHeader(h));
  
  const getColIndex = (names: string[], defaultIdx: number) => {
    const normalizedNames = names.map(n => normalizeHeader(n));
    for (const name of normalizedNames) {
      const idx = normalizedHeaders.indexOf(name);
      if (idx !== -1) return idx;
    }
    return defaultIdx;
  };

  const idxId = getColIndex(["Id", "id", "ID", "CODIGO", "CÓDIGO", "IDENTIFICADOR"], 0);
  const idxData = getColIndex(["Data", "data", "DATE", "DIAS"], 1);
  const idxDesc = getColIndex(["Descrição", "descricao", "DESCRICAO", "DESCRIPTION", "DESCRIÇÃO", "DESC", "DESCR", "NOME"], 2);
  const idxValor = getColIndex(["Valor", "valor", "Valor (R$)", "VALOR", "VALUE", "PRECO", "PREÇO", "MONTANTE"], 3);
  const idxValorPg = getColIndex(["Valor_PG", "valorPg", "VALOR_PG", "Valor Pago", "VALOR_PAGO"], 4);
  const idxBancoId = getColIndex(["Banco_Id", "bancoid", "bancoId", "BANCOID", "BANCO_ID", "BANCO"], 5);
  const idxCartaoId = getColIndex(["Cartão_Id", "cartaoid", "cartaoId", "CARTAO_ID", "ID do Cartão / Conta"], 6);
  const idxFormaPagamento = getColIndex(["Forma_Pagamento", "formaPagamento", "FORMAPAGAMENTO", "FORMA_PAGAMENTO", "FORMA DE PAGAMENTO"], 7);
  const idxTipo = getColIndex(["Tipo", "tipo", "TIPO", "TYPE", "COMBUSTIVEL", "COMBUSTÍVEL"], 8);
  const idxCat = getColIndex(["Categoria", "categoria", "CATEGORIA", "CATEGORY", "CAT", "GRUPO", "CLASSIFICACAO", "CLASSIFICAÇÃO"], 9);
  const idxStatus = getColIndex(["Status", "status", "STATUS", "SITUACAO", "SITUAÇÃO"], 10);
  const idxKm = getColIndex(["KM", "km"], 11);
  const idxLitros = getColIndex(["Litros", "litros", "LITROS", "LITERS"], 12);
  const idxPrecoLitro = getColIndex(["Preço_Litro", "precoLitro", "Preço por Litro", "Preco por Litro", "PRECO_LITRO", "PREÇO POR LITRO"], 13);
  const idxCompletou = getColIndex(["Completou_O_Tanque", "Completou_o_Tanque", "completouTanque", "Completou o Tanque", "Completou", "COMPLETOU_TANQUE", "COMPLETOU O TANQUE"], 14);
  const idxKmPercorrido = getColIndex(["KM_Percorrido", "kmPercorrido", "KM Percorrido", "KM_PERCORRIDO"], 15);
  const idxMediaKmL = getColIndex(["Média_(Km/L)", "Media_(Km/L)", "mediaKmL", "Media (Km/L)", "Média (Km/L)", "MEDIA_KML"], 16);
  const idxVeiculo = getColIndex(["Veiculo", "veiculo", "Veículo", "VEHICLE", "VEÍCULO"], 17);
  const idxDescricaoVeiculo = getColIndex(["Descrição_Do_Veículo", "Descrição_do_Veículo", "descricaoVeiculo", "Descrição do Veículo", "Descricao do Veiculo", "DESCRIÇÃO DO VEÍCULO", "DESCRICAO_VEICULO"], 18);
  const idxMotorista = getColIndex(["Motorista", "motorista", "MOTORISTA", "DRIVER"], 19);
  const idxNomePosto = getColIndex(["Nome_Posto", "nomePosto", "Nome Posto", "POSTO", "GAS_STATION", "NOME POSTO"], 20);
  const idxLocalPosto = getColIndex(["Localização_Do_Posto", "Localizacao_do_Posto", "localizacaoPosto", "Localização do Posto", "LOCALIZACAO_POSTO", "LOCALIZAÇÃO DO POSTO"], 21);
  const idxComprovanteUrl = getColIndex(["Comprovante_Url", "comprovanteUrl", "COMPROVANTEURL", "COMPROVANTE_URL", "COMPROVANTE"], 22);
  const idxObs = getColIndex(["OBS", "obs", "Observação", "Observações", "OBSERVACOES", "NOTE"], 23);

  const parseBrazilianOrRawNumber = (valStr: string): number => {
    let clean = String(valStr || '').trim().toUpperCase().replace(/\s/g, '').replace('R$', '');
    if (clean === '' || clean === '-') return 0;
    if (clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  };

  const transactions: any[] = [];
  const seenIds = new Set<number>();

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row) || row.length === 0) continue;
    
    // Ignorar linhas completamente vazias
    const isRowEmpty = !row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (isRowEmpty) continue;

    const valor = parseBrazilianOrRawNumber(row[idxValor]);
    const valorPgVal = row[idxValorPg] !== undefined && row[idxValorPg] !== null && String(row[idxValorPg]).trim() !== ''
      ? parseBrazilianOrRawNumber(row[idxValorPg]) 
      : undefined;

    const km = row[idxKm] !== undefined && row[idxKm] !== null && String(row[idxKm]).trim() !== '' 
      ? parseBrazilianOrRawNumber(row[idxKm]) 
      : undefined;
    const litros = row[idxLitros] !== undefined && row[idxLitros] !== null && String(row[idxLitros]).trim() !== '' 
      ? parseBrazilianOrRawNumber(row[idxLitros]) 
      : undefined;
    const precoLitro = row[idxPrecoLitro] !== undefined && row[idxPrecoLitro] !== null && String(row[idxPrecoLitro]).trim() !== '' 
      ? parseBrazilianOrRawNumber(row[idxPrecoLitro]) 
      : undefined;

    const rawPosto = row[idxNomePosto] !== undefined && row[idxNomePosto] !== null ? String(row[idxNomePosto]).trim() : '';
    const rawVeiculo = row[idxVeiculo] !== undefined && row[idxVeiculo] !== null ? String(row[idxVeiculo]).trim() : '';
    const rawDesc = row[idxDesc] !== undefined && row[idxDesc] !== null ? String(row[idxDesc]).trim() : '';
    const rawCat = String(row[idxCat] || (isReceitasSheet ? 'RECEITA' : 'OUTROS')).trim().toUpperCase();
    const normalizedCat = rawCat.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
    const rawTipo = String(row[idxTipo] || '').trim().toUpperCase();

    // Categorização inteligente
    let category = 'OUTROS';
    const isFuelType = ['ETANOL', 'GAS. COMUM', 'GAS. ADITIVADA', 'DIESEL', 'GAS COMUM', 'GAS ADITIVADA', 'GASOLINA', 'ALCOOL', 'ETANOL ADITIVADA'].includes(rawTipo);
    const descUpper = (rawDesc || '').toUpperCase();
    const hasFuelKeywords = descUpper.includes('POSTO') || descUpper.includes('ABASTECE') || descUpper.includes('COMBUS') || descUpper.includes('IPIRANGA') || descUpper.includes('SHELL') || descUpper.includes('BR ') || descUpper.includes('GASPRIME') || descUpper.includes('TAURIS');

    if (isAbastecimentosSheet || normalizedCat.includes('ABASTECIMENTO') || normalizedCat.includes('COMBUSTIVEL') || isFuelType || (hasFuelKeywords && (normalizedCat === '' || normalizedCat === 'OUTROS' || normalizedCat === 'DESPESA')) || !!rawPosto || (km !== undefined && km > 0) || (litros !== undefined && litros > 0)) {
      category = 'ABASTECIMENTO';
    } else if (normalizedCat.includes('RECEITA') || normalizedCat.includes('ENTRADA')) {
      category = rawCat && rawCat !== 'ENTRADA' ? rawCat : 'RECEITA';
    } else if (normalizedCat.includes('CASA')) {
      category = 'CASA';
    } else if (normalizedCat.includes('CONSUMO') || normalizedCat.includes('CUMSUMO')) {
      category = 'CONSUMO';
    } else if (normalizedCat.includes('TRABALHO')) {
      category = 'TRABALHO';
    } else if (normalizedCat.includes('PESSOAL')) {
      category = 'PESSOAL';
    } else if (normalizedCat.includes('SHOPPING')) {
      category = 'SHOPPING';
    } else if (normalizedCat.includes('ALIMENTACAO') || normalizedCat.includes('ALIMENTACA')) {
      category = 'ALIMENTAÇÃO';
    } else if (normalizedCat.includes('SAUDE')) {
      category = 'SAÚDE';
    } else {
      category = rawCat || (isReceitasSheet ? 'RECEITA' : 'OUTROS');
    }

    let finalDesc = rawDesc;
    if (!finalDesc) {
      if (rawPosto) {
        finalDesc = `ABASTECIMENTO: ${(rawPosto || '').toUpperCase()}`;
      } else if (rawVeiculo) {
        finalDesc = `ABASTECIMENTO (${(rawVeiculo || '').toUpperCase()})`;
      } else if (category === 'ABASTECIMENTO') {
        finalDesc = 'ABASTECIMENTO';
      } else {
        finalDesc = 'LANÇAMENTO';
      }
    }

    let parsedId = parseInt(row[idxId]);
    if (isNaN(parsedId) || parsedId <= 0) {
      const dataStr = String(row[idxData] || '');
      const tipoStr = String(row[idxTipo] || 'DESPESA');
      const hashStr = `${dataStr}_${finalDesc}_${valor}_${tipoStr}`;
      let hash = 0;
      for (let charIdx = 0; charIdx < hashStr.length; charIdx++) {
        hash = (hash << 5) - hash + hashStr.charCodeAt(charIdx);
        hash = hash & hash;
      }
      parsedId = 100000000 + Math.abs(hash % 900000000);
    }

    let salt = 0;
    while (seenIds.has(parsedId)) {
      salt++;
      const dataStr = String(row[idxData] || '');
      const tipoStr = String(row[idxTipo] || 'DESPESA');
      const hashStr = `${dataStr}_${finalDesc}_${valor}_${tipoStr}_${salt}`;
      let hash = 0;
      for (let charIdx = 0; charIdx < hashStr.length; charIdx++) {
        hash = (hash << 5) - hash + hashStr.charCodeAt(charIdx);
        hash = hash & hash;
      }
      parsedId = 100000000 + Math.abs(hash % 900000000);
    }
    seenIds.add(parsedId);
    
    const completouStr = String(row[idxCompletou] || '').toUpperCase();
    const completouTanque = completouStr === 'SIM' || completouStr === 'TRUE' || completouStr === 'S' || completouStr === '1';

    let finalTipo = rawTipo;
    if (
      isReceitasSheet || 
      category === 'RECEITA' || 
      rawCat === 'RECEITA' || 
      rawCat === 'RECEITAS' ||
      rawTipo === 'RECEITA' ||
      rawTipo === 'RECEBIDO' ||
      rawTipo === 'ENTRADA' ||
      rawTipo.includes('RECEIT')
    ) {
      finalTipo = 'RECEITA';
    } else if (isAbastecimentosSheet || category === 'ABASTECIMENTO') {
      finalTipo = rawTipo || 'DESPESA';
    } else {
      finalTipo = rawTipo || (isDespesasSheet ? 'DESPESA' : 'DESPESA');
    }

    let dataStr = String(row[idxData] || '').trim();
    if (!dataStr || dataStr === 'undefined' || dataStr === 'null') {
      dataStr = new Date().toLocaleDateString('pt-BR');
    }

    const tx = {
      id: parsedId,
      data: dataStr,
      descricao: (finalDesc || '').toUpperCase(),
      categoria: category,
      valor,
      tipo: finalTipo,
      status: String(row[idxStatus] || 'PENDENTE').toUpperCase(),
      bancoId: row[idxBancoId] ? String(row[idxBancoId]).trim() : undefined,
      formaPagamento: row[idxFormaPagamento] ? String(row[idxFormaPagamento]).trim() : undefined,
      comprovanteUrl: row[idxComprovanteUrl] ? String(row[idxComprovanteUrl]).trim() : undefined,
      valorPg: valorPgVal !== undefined && isNaN(valorPgVal) ? undefined : valorPgVal,
      km: km !== undefined && isNaN(km) ? undefined : km,
      litros: litros !== undefined && isNaN(litros) ? undefined : litros,
      precoLitro: precoLitro !== undefined && isNaN(precoLitro) ? undefined : precoLitro,
      veiculo: rawVeiculo ? String(rawVeiculo || '').toUpperCase() : undefined,
      descricaoVeiculo: row[idxDescricaoVeiculo] ? String(row[idxDescricaoVeiculo] || '').trim() : undefined,
      completouTanque,
      nomePosto: rawPosto ? String(rawPosto || '').toUpperCase() : undefined,
      localizacaoPosto: row[idxLocalPosto] ? String(row[idxLocalPosto]).trim().toUpperCase() : undefined,
      motorista: row[idxMotorista] ? String(row[idxMotorista]).trim().toUpperCase() : undefined,
      obs: row[idxObs] ? String(row[idxObs]).trim() : undefined
    };

    transactions.push(tx);
  }

  return transactions;
};

/**
 * Converte um valor numérico em número com segurança total (suporta 'Valor (R$)', '2.3', 'R$ 2.30', 2.3, etc.).
 */
export function parseNumericValue(val: any): number {
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
}

/**
 * Normaliza objetos de transação vindos do Google Apps Script ou Google Sheets API,
 * garantindo compatibilidade com chaves 'Valor (R$)', 'Valor', 'valor', 'Descrição', etc.
 */
export function normalizeTransactionObject(item: any): any {
  if (!item || typeof item !== 'object') return null;

  // Se já for uma linha de array da planilha, ignora
  if (Array.isArray(item)) return item;

  // Filtragem para ignorar objetos/linhas totalmente vazias
  const values = Object.values(item);
  const hasContent = values.some(v => v !== null && v !== undefined && String(v).trim() !== '');
  if (!hasContent) return null;

  // Mapeamento flexível de Nome do Posto
  const rawPosto = item['Nome Posto'] ?? item.nomePosto ?? item.POSTO ?? item.posto ?? item.Posto ?? item['Nome do Posto'] ?? '';
  const nomePosto = String(rawPosto || '').trim().toUpperCase() || undefined;

  // Mapeamento flexível de Veículo
  const rawVeiculo = item['Veículo'] ?? item.Veiculo ?? item.veiculo ?? item.VEICULO ?? '';
  const veiculo = String(rawVeiculo || '').trim().toUpperCase() || undefined;

  // Mapeamento flexível de ID
  const rawId = item.id ?? item.ID ?? item.Id ?? item['Id'] ?? item['idNum'];
  let parsedId = Number(rawId);
  if (isNaN(parsedId) || parsedId <= 0) {
    parsedId = Math.floor(Date.now() + Math.random() * 100000);
  }

  // Mapeamento flexível de Valor
  const rawValor = item['Valor (R$)'] ?? item['Valor (R$) '] ?? item['Valor'] ?? item.Valor ?? item.valor ?? item.VALOR ?? item.valorPg ?? item['Valor Pago (R$)'] ?? item['Valor Pago'] ?? 0;
  const valor = parseNumericValue(rawValor);

  // Mapeamento flexível de Categoria
  const rawCat = item.Categoria ?? item.categoria ?? item.CATEGORIA ?? '';
  let category = String(rawCat || '').trim().toUpperCase();
  if (!category || category === 'UNDEFINED' || category === 'NULL') {
    if (nomePosto || item.KM || item.km || item.Litros || item.litros || item.PrecoLitro || item.precoLitro) {
      category = 'ABASTECIMENTO';
    } else {
      category = 'OUTROS';
    }
  }

  // Mapeamento flexível de Descrição
  const rawDesc = item['Descrição'] ?? item.Descricao ?? item.descricao ?? item['DESCRIÇÃO'] ?? item['DESCRICAO'] ?? item['Descrição/Estabelecimento'] ?? item.descricaoServico ?? item.titulo ?? '';
  let descricao = String(rawDesc || '').trim();
  if (!descricao || descricao === 'LANÇAMENTO') {
    if (nomePosto) {
      descricao = `ABASTECIMENTO: ${nomePosto}`;
    } else if (veiculo) {
      descricao = `ABASTECIMENTO (${veiculo})`;
    } else if (category === 'ABASTECIMENTO') {
      descricao = 'ABASTECIMENTO';
    } else {
      descricao = 'LANÇAMENTO';
    }
  }

  // Mapeamento flexível de Data
  let dataStr = item.Data ?? item.data ?? item.DATA ?? item['Data / Data Alvo'] ?? item['dataPagamento'] ?? '';
  if (dataStr instanceof Date) {
    const y = dataStr.getFullYear();
    const m = ('0' + (dataStr.getMonth() + 1)).slice(-2);
    const d = ('0' + dataStr.getDate()).slice(-2);
    dataStr = `${d}/${m}/${y}`;
  } else {
    dataStr = String(dataStr || '').trim();
  }

  // Mapeamento flexível de Tipo
  let rawTipo = String(item.Tipo ?? item.tipo ?? item.TIPO ?? item['Tipo Registro'] ?? '').trim().toUpperCase();
  if (!rawTipo || rawTipo === 'UNDEFINED' || rawTipo === 'NULL') {
    if (category.includes('RECEITA') || category === 'ENTRADA') {
      rawTipo = 'RECEITA';
    } else {
      rawTipo = 'DESPESA';
    }
  }

  // Mapeamento flexível de Status
  let status = String(item.Status ?? item.status ?? item.STATUS ?? 'PAGO').trim().toUpperCase();
  if (!status || status === 'UNDEFINED' || status === 'NULL') {
    status = 'PAGO';
  }

  // Mapeamento flexível de Observação
  const obs = String(item['Observação'] ?? item['Observações'] ?? item.Observacao ?? item.obs ?? item.OBS ?? item.observacoes ?? '').trim();

  // Campos numéricos auxiliares
  const km = parseNumericValue(item.KM ?? item.Km ?? item.km ?? item['Quilometragem (KM)']);
  const litros = parseNumericValue(item.Litros ?? item.litros ?? item.LITROS);
  const precoLitro = parseNumericValue(item['Preço/L'] ?? item['Preco/L'] ?? item.precoLitro ?? item.PrecoLitro);
  const valorPgVal = item.valorPg !== undefined && item.valorPg !== null ? parseNumericValue(item.valorPg) : (status === 'PAGO' ? valor : undefined);

  const rawLocalPostoVal = item['Localização do Posto'] ?? item.localizacaoPosto ?? item.LOCALIZACAO_POSTO;
  const localizacaoPosto = rawLocalPostoVal ? String(rawLocalPostoVal).trim().toUpperCase() : undefined;

  const rawMotoristaVal = item.Motorista ?? item.motorista;
  const motorista = rawMotoristaVal ? String(rawMotoristaVal).trim().toUpperCase() : undefined;

  const rawDescVeiculoVal = item['Descrição do Veículo'] ?? item.descricaoVeiculo;
  const descricaoVeiculo = rawDescVeiculoVal ? String(rawDescVeiculoVal).trim() : undefined;

  const completouRaw = String(item['Completou o Tanque'] ?? item.completouTanque ?? item.completou ?? '').toUpperCase();
  const completouTanque = completouRaw === 'SIM' || completouRaw === 'TRUE' || completouRaw === 'S' || completouRaw === '1';

  return {
    ...item,
    id: parsedId,
    data: dataStr || new Date().toLocaleDateString('pt-BR'),
    descricao: (descricao || 'ABASTECIMENTO').toUpperCase(),
    categoria: category,
    valor: isNaN(valor) ? 0 : valor,
    tipo: rawTipo || 'DESPESA',
    status: status || 'PAGO',
    obs: obs || '',
    valorPg: valorPgVal,
    km: km > 0 ? km : (typeof item.km === 'number' && !isNaN(item.km) ? item.km : undefined),
    litros: litros > 0 ? litros : (typeof item.litros === 'number' && !isNaN(item.litros) ? item.litros : undefined),
    precoLitro: precoLitro > 0 ? precoLitro : (typeof item.precoLitro === 'number' && !isNaN(item.precoLitro) ? item.precoLitro : undefined),
    veiculo: veiculo || (item.veiculo ? String(item.veiculo).toUpperCase() : undefined),
    descricaoVeiculo,
    completouTanque,
    nomePosto,
    localizacaoPosto,
    motorista,
  };
}

/**
 * Busca transações da planilha do Google Sheets.
 */
export const fetchTransactionsFromSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any
): Promise<any[]> => {
  const tokenStr = toSafeString(accessToken);
  const sheetIdStr = toSafeString(spreadsheetId);

  const storedAppsScriptUrl = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_apps_script_url')) : '';
  const effectiveAppsScriptUrl = (tokenStr && (tokenStr.includes('script.google.com') || tokenStr.startsWith('http')))
    ? tokenStr
    : (storedAppsScriptUrl && (storedAppsScriptUrl.includes('script.google.com') || storedAppsScriptUrl.startsWith('http')))
      ? storedAppsScriptUrl
      : (sheetIdStr && (sheetIdStr.includes('script.google.com') || sheetIdStr.startsWith('http')))
        ? sheetIdStr
        : DEFAULT_APPS_SCRIPT_URL;

  if (effectiveAppsScriptUrl) {
    const cleanSpreadsheetId = (sheetIdStr && !sheetIdStr.startsWith('http') && !sheetIdStr.includes('script.google.com') && sheetIdStr !== 'active_sheet')
      ? sheetIdStr
      : (typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_sheet_id')) || DEFAULT_SPREADSHEET_ID : DEFAULT_SPREADSHEET_ID);
    const safeSheetId = (cleanSpreadsheetId && cleanSpreadsheetId !== 'active_sheet') ? cleanSpreadsheetId : DEFAULT_SPREADSHEET_ID;

    try {
      const res = await callAppsScript(effectiveAppsScriptUrl, { action: 'fetchTransactions', spreadsheetId: safeSheetId }, 'GET');
      if (res) {
        if (res.spreadsheetId && typeof res.spreadsheetId === 'string' && !res.spreadsheetId.startsWith('http')) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('wealthflow_sheet_id', res.spreadsheetId);
          }
        }
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
  }

  // Guard against making legacy Google Sheets API calls with a Web App URL as spreadsheetId
  if (!sheetIdStr || sheetIdStr.startsWith('http') || sheetIdStr.includes('script.google.com')) {
    console.warn("fetchTransactionsFromSpreadsheet: spreadsheetId é uma URL ou inválido para API REST. Retornando lista vazia.");
    return [];
  }

  if (tokenStr === 'wealthflow_direct_sheets_connected' || tokenStr.startsWith('wealthflow_')) {
    return [];
  }

  // 1. Buscar metadados para saber os nomes das abas reais da planilha
  const metaRes = await googleApiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetIdStr}?fields=sheets.properties`, tokenStr);
  
  if (!metaRes.ok) {
    throw new Error(`Erro ao buscar metadados da planilha: ${await metaRes.text()}`);
  }

  const metaData = await metaRes.json();
  const existingSheetTitles: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);
  
  // Normalizador de abas
  const normalizeSheetName = (str: string): string => {
    return String(str || '')
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "");
  };

  const hasNewSheets = existingSheetTitles.some(title => {
    const norm = normalizeSheetName(title);
    return norm === 'RECEITAS' || norm === 'DESPESAS' || norm === 'ABASTECIMENTOS';
  });

  if (hasNewSheets) {
    // Buscar em lote de Receitas, Despesas, Abastecimentos
    const targetSheets = ['Receitas', 'Despesas', 'Abastecimentos'].map(name => {
      return existingSheetTitles.find(t => normalizeSheetName(t) === normalizeSheetName(name)) || name;
    });

    const ranges = targetSheets.map(s => `'${s}'!A1:Z2000`);
    const rangesQuery = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const batchGetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`;
    
    const batchRes = await googleApiFetch(batchGetUrl, accessToken);
    if (batchRes.ok) {
      const batchData = await batchRes.json();
      const valueRanges = batchData.valueRanges || [];
      const combinedTxs: any[] = [];
      const seenIds = new Set<number>();

      valueRanges.forEach((vr: any, idx: number) => {
        const rows = vr.values;
        if (!rows || rows.length === 0) return;

        const sheetName = targetSheets[idx];
        const parsedTxs = parseTransactionRows(rows, sheetName);
        parsedTxs.forEach((t: any) => {
          if (!seenIds.has(t.id)) {
            seenIds.add(t.id);
            combinedTxs.push(t);
          }
        });
      });
      return combinedTxs;
    }
  }

  // Fallback para aba única 'Transações'
  let targetSheetName = 'Transações';
  const match = existingSheetTitles.find(title => {
    const norm = normalizeSheetName(title);
    return norm === 'TRANSACOES' || norm === 'TRANSACAOES' || norm === 'TRANSACAO' || norm === 'TRANSACOESFINANCAS';
  });
  
  if (match) {
    targetSheetName = match;
  } else if (existingSheetTitles.length > 0) {
    const firstNonRecurso = existingSheetTitles.find(t => !String(t || '').toUpperCase().includes('RECURSO'));
    if (firstNonRecurso) {
      targetSheetName = firstNonRecurso;
    } else {
      targetSheetName = existingSheetTitles[0];
    }
  }

  const range = encodeURIComponent(`'${targetSheetName}'!A1:T2000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await googleApiFetch(url, accessToken);

  if (!response.ok) {
    const errorDetails = await response.text();
    throw new Error(`Erro ao buscar dados da aba '${targetSheetName}': ${errorDetails}`);
  }

  const data = await response.json();
  const rows = data.values;
  return parseTransactionRows(rows);
};

export const parseOficinaRows = (rows: any[]): { performed: any[]; scheduled: any[] } => {
  const performed: any[] = [];
  const scheduled: any[] = [];
  if (!rows || rows.length <= 1) return { performed, scheduled };

  const parseNum = (v: any) => {
    if (v === undefined || v === null || v === '') return 0;
    let s = String(v).trim().replace('R$', '').replace(/\s/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    const type = String(row[1] || '').toUpperCase();

    if (type === 'REALIZADO') {
      performed.push({
        id: parseInt(row[0]) || Date.now() + Math.random(),
        veiculoDescricao: String(row[2] || ''),
        descricao: String(row[3] || ''),
        data: String(row[4] || ''),
        km: parseNum(row[5]),
        valor: parseNum(row[6]),
        oficina: String(row[7] || ''),
        observacoes: String(row[12] || '')
      });
    } else if (type === 'AGENDADO') {
      scheduled.push({
        id: parseInt(row[0]) || Date.now() + Math.random(),
        veiculoDescricao: String(row[2] || ''),
        descricao: String(row[3] || ''),
        dataAlvo: String(row[4] || ''),
        kmAlvo: parseNum(row[5]),
        recorrente: String(row[8] || '').toUpperCase() === 'SIM',
        frequenciaMeses: parseNum(row[9]),
        frequenciaKm: parseNum(row[10]),
        status: (String(row[11] || 'PENDENTE').toUpperCase()) as any,
        observacoes: String(row[12] || '')
      });
    }
  }
  return { performed, scheduled };
};

export const parseAgendaRows = (rows: any[]): any[] => {
  const result: any[] = [];
  if (!rows || rows.length <= 1) return result;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    result.push({
      id: parseInt(r[0]) || Date.now() + Math.random(),
      titulo: String(r[1] || ''),
      data: String(r[2] || ''),
      hora: String(r[3] || ''),
      descricao: String(r[4] || ''),
      cor: String(r[5] || '#3B82F6'),
      piscando: String(r[6] || '').toUpperCase() === 'SIM',
      lembreteAtivo: String(r[7] || '').toUpperCase() === 'SIM',
      diasAntecedencia: parseInt(r[8]) || 2
    });
  }
  return result;
};

export const parseZonaRiscoRows = (rows: any[]): { riskZones: any[]; infractions: any[] } => {
  const riskZones: any[] = [];
  const infractions: any[] = [];
  if (!rows || rows.length <= 1) return { riskZones, infractions };

  const parseNum = (v: any) => {
    if (v === undefined || v === null || v === '') return 0;
    let s = String(v).trim().replace('R$', '').replace(/\s/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const type = String(r[1] || '').toUpperCase();

    if (type === 'ZONA_RISCO') {
      riskZones.push({
        id: parseInt(r[0]) || Date.now() + Math.random(),
        nomeLocal: String(r[2] || ''),
        nivelRisco: (String(r[3] || 'BAIXO').toUpperCase()) as any,
        statusGeral: String(r[4] || 'ALERTA'),
        ativo: String(r[5] || '').toUpperCase() === 'SIM',
        mensagem: String(r[6] || ''),
        raioMetros: parseNum(r[7]) || 100,
        latitude: r[8] ? String(r[8]) : undefined,
        longitude: r[9] ? String(r[9]) : undefined,
        dataRegistro: String(r[10] || ''),
        som: String(r[12] || '')
      });
    } else if (type === 'INFRACAO') {
      // Módulo de Infrações descontinuado - ignorar linhas de infração da planilha
    }
  }
  return { riskZones, infractions: [] };
};

export const parseConsultasRows = (rows: any[]): { appointments: any[]; prescriptions: any[] } => {
  const appointments: any[] = [];
  const prescriptions: any[] = [];
  if (!rows || rows.length <= 1) return { appointments, prescriptions };

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const type = String(r[1] || '').toUpperCase();

    if (type === 'CONSULTA') {
      appointments.push({
        id: parseInt(r[0]) || Date.now() + Math.random(),
        especialidade: String(r[2] || ''),
        medico: String(r[3] || ''),
        data: String(r[4] || ''),
        hora: String(r[5] || ''),
        local: String(r[6] || ''),
        lembreteAtivo: String(r[7] || '').toUpperCase() === 'SIM',
        status: String(r[8] || 'Agendada'),
        observacoes: String(r[11] || '')
      });
    } else if (type === 'RECEITA') {
      prescriptions.push({
        id: parseInt(r[0]) || Date.now() + Math.random(),
        especialidade: String(r[2] || ''),
        medico: String(r[3] || ''),
        data: String(r[4] || ''),
        dataVencimento: String(r[5] || ''),
        medicamentos: String(r[6] || ''),
        instrucoes: String(r[7] || ''),
        arquivoAnexo: String(r[9] || '').toUpperCase() === 'SIM' ? 'anexo_existente' : undefined,
        nomeArquivoAnexo: String(r[10] || ''),
        observacoes: String(r[11] || '')
      });
    }
  }
  return { appointments, prescriptions };
};

export const parseAnaliseRows = (rows: any[]): { [key: string]: number } => {
  const result: { [key: string]: number } = {};
  if (!rows || rows.length <= 1) return result;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;
    const cat = String(r[0] || '').trim();
    if (!cat) continue;
    let s = String(r[2] || '').trim().replace('R$', '').replace(/\s/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const val = parseFloat(s);
    if (!isNaN(val)) {
      result[cat] = val;
    }
  }
  return result;
};

export function normalizeVehicleObject(v: any): any | null {
  if (!v || typeof v !== 'object') return null;
  const desc = String(v.descricao || v.modelo || v.nome || (v.marca ? `${v.marca} ${v.modelo || ''}` : '') || '').trim();
  const placa = String(v.placa || '').trim().toUpperCase();
  const motorista = String(v.motorista || '').trim().toUpperCase();
  const id = v.id ? String(v.id) : String(Date.now() + Math.random());
  if (!desc && !placa) return null;
  return {
    ...v,
    id,
    descricao: (desc || '').toUpperCase(),
    placa,
    motorista,
    mesFinalPlaca: v.mesFinalPlaca ? String(v.mesFinalPlaca).trim() : undefined,
    marca: v.marca ? String(v.marca).trim() : undefined,
    modelo: v.modelo ? String(v.modelo).trim() : undefined,
    kmAtual: typeof v.kmAtual === 'number' ? v.kmAtual : (parseNumericValue(v.kmAtual) || undefined)
  };
}

export const parsePerfilRows = (rows: any[]): { vehicles: any[] } => {
  const vehicles: any[] = [];
  if (!rows || !Array.isArray(rows) || rows.length <= 1) return { vehicles };
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || !Array.isArray(r) || r.length === 0) continue;
    const type = String(r[1] || '').trim().toUpperCase();
    if (type === 'VEICULO_REGISTRADO' || type === 'VEICULO' || type === 'VEÍCULO') {
      const descVal = String(r[2] || r[3] || '').trim();
      const placaVal = String(r[3] || '').trim().toUpperCase();
      if (!descVal && !placaVal) continue;
      vehicles.push({
        id: r[0] ? String(r[0]) : String(Date.now() + Math.random()),
        descricao: (descVal || 'VEÍCULO').toUpperCase(),
        placa: placaVal,
        motorista: String(r[4] || '').trim().toUpperCase(),
        mesFinalPlaca: String(r[5] || '').trim()
      });
    }
  }
  return { vehicles };
};

export interface AllSpreadsheetData {
  transactions: any[];
  riskZones: any[];
  infractions: any[];
  appointments: any[];
  prescriptions: any[];
  compromissos: any[];
  registeredVehicles: any[];
  performedServices: any[];
  scheduledServices: any[];
  bankAccounts?: any[];
  creditCards?: any[];
  categoryBudgets: { [key: string]: number };
  customCategories?: any[];
  groceryItems: any[];
  status?: string;
  error?: string;
}

export const parseGroceryRows = (rows: any[]): any[] => {
  if (!rows || rows.length <= 1) return [];
  return rows.slice(1).map((r, idx) => {
    if (!r || r.length === 0) return null;
    const id = String(r[0] || `g_${idx}_${Date.now()}`);
    const nome = String(r[1] || '').trim();
    if (!nome) return null;
    const categoria = String(r[2] || 'Outros').trim();
    let qStr = String(r[3] || '1').replace(',', '.');
    const quantidade = parseFloat(qStr) || 1;
    let vStr = String(r[4] || '0').replace('R$', '').trim().replace(/\s/g, '');
    if (vStr.includes(',')) vStr = vStr.replace(/\./g, '').replace(',', '.');
    const valorEstimado = parseFloat(vStr) || 0;
    const comprado = String(r[5] || '').toUpperCase() === 'SIM' || String(r[5] || '').toUpperCase() === 'TRUE';
    const observacao = String(r[7] || '').trim();
    return {
      id,
      nome,
      categoria,
      quantidade,
      valorEstimado,
      comprado,
      observacao,
      updatedAt: Date.now()
    };
  }).filter(Boolean);
};

/**
 * Carrega e parseia TODOS os dados de todas as abas da planilha do Google Sheets.
 */
export const fetchAllDataFromSpreadsheet = async (
  accessToken: any,
  spreadsheetId: any
): Promise<AllSpreadsheetData> => {
  const emptyResult: AllSpreadsheetData = {
    transactions: [],
    riskZones: [],
    infractions: [],
    appointments: [],
    prescriptions: [],
    compromissos: [],
    registeredVehicles: [],
    performedServices: [],
    scheduledServices: [],
    categoryBudgets: {},
    groceryItems: []
  };

  const tokenStr = toSafeString(accessToken);
  const sheetIdStr = toSafeString(spreadsheetId);

  const storedAppsScriptUrl = typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_apps_script_url')) : '';
  const effectiveAppsScriptUrl = (tokenStr && (tokenStr.includes('script.google.com') || tokenStr.startsWith('http')))
    ? tokenStr
    : (storedAppsScriptUrl && (storedAppsScriptUrl.includes('script.google.com') || storedAppsScriptUrl.startsWith('http')))
      ? storedAppsScriptUrl
      : (sheetIdStr && (sheetIdStr.includes('script.google.com') || sheetIdStr.startsWith('http')))
        ? sheetIdStr
        : DEFAULT_APPS_SCRIPT_URL;

  if (effectiveAppsScriptUrl) {
    const cleanSpreadsheetId = (sheetIdStr && !sheetIdStr.startsWith('http') && !sheetIdStr.includes('script.google.com') && sheetIdStr !== 'active_sheet')
      ? sheetIdStr
      : (typeof localStorage !== 'undefined' ? toSafeString(localStorage.getItem('wealthflow_sheet_id')) || DEFAULT_SPREADSHEET_ID : DEFAULT_SPREADSHEET_ID);
    const safeSheetId = (cleanSpreadsheetId && cleanSpreadsheetId !== 'active_sheet') ? cleanSpreadsheetId : DEFAULT_SPREADSHEET_ID;

    try {
      const res = await callAppsScript(effectiveAppsScriptUrl, { action: 'fetchAllData', spreadsheetId: safeSheetId }, 'GET');
      if (res && typeof res === 'object') {
        if (res.spreadsheetId && typeof res.spreadsheetId === 'string' && !res.spreadsheetId.startsWith('http')) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('wealthflow_sheet_id', res.spreadsheetId);
          }
        }
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
          compromissos: Array.isArray(res.compromissos || res.data?.compromissos) ? (res.compromissos || res.data?.compromissos) : emptyResult.compromissos,
          registeredVehicles: Array.isArray(res.registeredVehicles || res.data?.registeredVehicles) ? (res.registeredVehicles || res.data?.registeredVehicles).map(normalizeVehicleObject).filter(Boolean) : emptyResult.registeredVehicles,
          performedServices: Array.isArray(res.performedServices || res.data?.performedServices) ? (res.performedServices || res.data?.performedServices) : emptyResult.performedServices,
          scheduledServices: Array.isArray(res.scheduledServices || res.data?.scheduledServices) ? (res.scheduledServices || res.data?.scheduledServices) : emptyResult.scheduledServices,
          bankAccounts: Array.isArray(res.bankAccounts || res.data?.bankAccounts) ? (res.bankAccounts || res.data?.bankAccounts) : emptyResult.bankAccounts,
          creditCards: Array.isArray(res.creditCards || res.data?.creditCards) ? (res.creditCards || res.data?.creditCards) : emptyResult.creditCards,
          categoryBudgets: res.categoryBudgets || res.data?.categoryBudgets || emptyResult.categoryBudgets,
          customCategories: Array.isArray(res.customCategories || res.data?.customCategories) ? (res.customCategories || res.data?.customCategories) : emptyResult.customCategories,
          groceryItems: Array.isArray(res.groceryItems || res.data?.groceryItems) ? (res.groceryItems || res.data?.groceryItems) : emptyResult.groceryItems,
          status: res.status,
          error: res.error
        };
      }
    } catch (e) {
      console.warn("Erro ao buscar todos os dados via Apps Script:", e);
    }
    return emptyResult;
  }

  // Guard against making legacy Google Sheets API calls with a Web App URL as spreadsheetId
  if (!sheetIdStr || sheetIdStr.startsWith('http') || sheetIdStr.includes('script.google.com')) {
    console.warn("fetchAllDataFromSpreadsheet: spreadsheetId é uma URL ou inválido para API REST. Retornando dados vazios.");
    return emptyResult;
  }

  if (tokenStr === 'wealthflow_direct_sheets_connected' || tokenStr.startsWith('wealthflow_')) {
    return emptyResult;
  }

  const metaRes = await googleApiFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetIdStr}?fields=sheets.properties`, tokenStr);
  if (!metaRes.ok) {
    throw new Error(`Erro ao buscar metadados da planilha: ${await metaRes.text()}`);
  }

  const metaData = await metaRes.json();
  const existingSheetTitles: string[] = (metaData.sheets || []).map((s: any) => s.properties.title);

  const normalizeSheetName = (str: string): string => {
    return String(str || '')
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]/g, "");
  };

  const findSheetTitle = (expectedName: string) => {
    const targetNorm = normalizeSheetName(expectedName);
    const exact = existingSheetTitles.find(t => normalizeSheetName(t) === targetNorm);
    if (exact) return exact;

    if (expectedName === 'ListaMercado') {
      const alias = existingSheetTitles.find(t => {
        const norm = normalizeSheetName(t);
        return norm === 'LISTAMERCADO' || norm === 'MERCADO' || norm === 'LISTADEMERCADO' || norm === 'GROCERY';
      });
      if (alias) return alias;
    }

    return expectedName;
  };

  const sheetsToFetch = [
    { key: 'Receitas', title: findSheetTitle('Receitas'), range: 'A1:Z2000' },
    { key: 'Despesas', title: findSheetTitle('Despesas'), range: 'A1:Z2000' },
    { key: 'Abastecimentos', title: findSheetTitle('Abastecimentos'), range: 'A1:Z2000' },
    { key: 'Oficina', title: findSheetTitle('Oficina'), range: 'A1:N2000' },
    { key: 'Agenda', title: findSheetTitle('Agenda'), range: 'A1:J2000' },
    { key: 'Zona de risco', title: findSheetTitle('Zona de risco'), range: 'A1:O2000' },
    { key: 'Consultas', title: findSheetTitle('Consultas'), range: 'A1:M2000' },
    { key: 'Análise', title: findSheetTitle('Análise'), range: 'A1:H2000' },
    { key: 'Perfil', title: findSheetTitle('Perfil'), range: 'A1:H2000' },
    { key: 'ListaMercado', title: findSheetTitle('ListaMercado'), range: 'A1:J2000' },
  ];

  const ranges = sheetsToFetch.map(s => `'${s.title}'!${s.range}`);
  const rangesQuery = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
  const batchGetUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}`;

  const response = await googleApiFetch(batchGetUrl, accessToken);
  if (!response.ok) {
    throw new Error(`Erro ao carregar abas da planilha: ${await response.text()}`);
  }

  const batchData = await response.json();
  const valueRanges = batchData.valueRanges || [];

  const result: AllSpreadsheetData = {
    transactions: [],
    riskZones: [],
    infractions: [],
    appointments: [],
    prescriptions: [],
    compromissos: [],
    registeredVehicles: [],
    performedServices: [],
    scheduledServices: [],
    categoryBudgets: {},
    groceryItems: []
  };

  const seenTxIds = new Set<number>();

  valueRanges.forEach((vr: any, idx: number) => {
    const sheetKey = sheetsToFetch[idx]?.key;
    const rows = vr.values || [];
    if (!rows || rows.length <= 1) return;

    if (sheetKey === 'Receitas' || sheetKey === 'Despesas' || sheetKey === 'Abastecimentos') {
      const parsed = parseTransactionRows(rows, sheetKey);
      parsed.forEach((t: any) => {
        if (!seenTxIds.has(t.id)) {
          seenTxIds.add(t.id);
          result.transactions.push(t);
        }
      });
    } else if (sheetKey === 'Oficina') {
      const { performed, scheduled } = parseOficinaRows(rows);
      result.performedServices.push(...performed);
      result.scheduledServices.push(...scheduled);
    } else if (sheetKey === 'Agenda') {
      result.compromissos.push(...parseAgendaRows(rows));
    } else if (sheetKey === 'Zona de risco') {
      const { riskZones, infractions } = parseZonaRiscoRows(rows);
      result.riskZones.push(...riskZones);
      result.infractions.push(...infractions);
    } else if (sheetKey === 'Consultas') {
      const { appointments, prescriptions } = parseConsultasRows(rows);
      result.appointments.push(...appointments);
      result.prescriptions.push(...prescriptions);
    } else if (sheetKey === 'Análise') {
      result.categoryBudgets = parseAnaliseRows(rows);
    } else if (sheetKey === 'Perfil') {
      result.registeredVehicles.push(...parsePerfilRows(rows).vehicles);
    } else if (sheetKey === 'ListaMercado') {
      result.groceryItems.push(...parseGroceryRows(rows));
    }
  });

  return result;
};
