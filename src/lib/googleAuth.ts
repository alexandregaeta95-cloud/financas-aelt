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
    id: item.id !== undefined && item.id !== null ? item.id : (item.ID || Date.now()),
    descricao: item.descricao || item.nomeLocal || item.nome || item.Descrição || 'ZONA DE RISCO',
    nivelDeRisco: item.nivelDeRisco || item.nivelRisco || 'BAIXO',
    latitudi: item.latitudi || item.latitude || item.Latitudi || '',
    longitude: item.longitude || item.Longitude || '',
    raioM: item.raioM !== undefined ? Number(item.raioM) : Number(item.raioMetros || item['Raio_(M)'] || 100),
    ativo: (item.ativo === true || String(item.ativo).toUpperCase() === 'SIM' || String(item.ativo) === 'TRUE') ? 'SIM' : 'NÃO',
    mensagemDeAlerta: item.mensagemDeAlerta || item.mensagem || item.Mensagem_De_Alerta || '',
    dataRegistro: item.dataRegistro || item.Data_Registro || new Date().toLocaleDateString('pt-BR'),
    obs: item.obs || item.OBS || item.som || ''
  }));

  const rawWorkshopSource = (Array.isArray(workshop) && workshop.length > 0)
    ? workshop
    : (Array.isArray(performedServices) ? performedServices : []);

  const mappedWorkshop = rawWorkshopSource.map((item: any) => {
    let rawDate = item.data || item.Data || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!rawDate) rawDate = new Date().toLocaleDateString('pt-BR');

    const rawValAPG = item.valorAPG ?? item['Valor_A_PG'] ?? item.valorAPagar ?? 0;
    const rawValPago = item.valorPago ?? item['Valor_Pago'] ?? item.valor ?? 0;

    const valAPGNum = typeof rawValAPG === 'string' ? (parseFloat(rawValAPG.replace(/\./g, '').replace(',', '.')) || 0) : Number(rawValAPG || 0);
    const valPagoNum = typeof rawValPago === 'string' ? (parseFloat(rawValPago.replace(/\./g, '').replace(',', '.')) || 0) : Number(rawValPago || 0);
    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : String(Date.now());
    const descStr = item.descricao || item['Descrição'] || item['Descrição do Serviço'] || '';
    const kmVal = item.km !== undefined && item.km !== null ? item.km : (item['KM'] || '');
    const oficinaStr = item.oficinaNome || item.oficina || item['Oficina_Nome'] || item['Oficina/Estabelecimento'] || '';
    const compStr = item.comprovanteUrl || item.comprovante || item['Comprovante_Url'] || '';
    const obsStr = item.observacoes || item.obs || item['Observações'] || '';
    const vehIdStr = item.veiculoId || item.veiculo || item.veiculoDescricao || item['VeiculoID'] || item['Veículo'] || '';

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

  const mappedVehicles = (Array.isArray(registeredVehicles) ? registeredVehicles : []).map((item: any) => {
    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : String(Date.now());
    const descStr = item.descricao || item['Descrição'] || item.nome || item.modelo || '';
    const motStr = item.motorista || item['Motorista'] || '';
    const placaStr = item.placa || item['Placa'] || '';
    const renavanStr = item.renavan || item.renavam || item['Renavan'] || item['Renavam'] || '';
    const chassiStr = item.chassi || item['Chassi'] || '';
    const marcaStr = item.marca || item['Marca'] || '';
    const modeloStr = item.modelo || item['Modelo'] || '';
    const anoVal = item.ano !== undefined && item.ano !== null ? item.ano : (item['Ano'] || '');
    const anoFabVal = item.anoFabricacao !== undefined && item.anoFabricacao !== null ? item.anoFabricacao : (item['Ano_Fabricação'] || item['Ano_Fabricacao'] || '');

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
  const mappedCompromissos = rawCompList.map((item: any) => {
    let rawDate = item.data || item.Data || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : (item.ID ? String(item.ID) : String(Date.now()));
    const tituloStr = item.titulo || item.Titulo || item.title || '';
    const horaStr = item.hora || item.Hora || item.horario || item.Horario || '';
    const descStr = item.descricao || item['Descrição'] || item.Descricao || item.description || '';
    const corStr = item.cor || item.Cor || item.Cor_De_Identificação || item['Cor_De_Identificação'] || '#22c55e';
    const piscandoVal = (item.piscando === true || String(item.piscando).toUpperCase() === 'SIM' || String(item['Efeito_Alerta_(Piscando)']).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
    const lembreteVal = (item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM' || String(item['Lembrete_Ativo']).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
    const diasVal = item.diasAntecedencia !== undefined && item.diasAntecedencia !== null ? Number(item.diasAntecedencia) : (Number(item['Dias_De_Antecedência']) || 2);

    return {
      id: idStr,
      titulo: tituloStr,
      data: rawDate,
      hora: horaStr,
      descricao: descStr,
      cor: corStr,
      piscando: item.piscando ?? (piscandoVal === 'SIM'),
      lembreteAtivo: item.lembreteAtivo ?? (lembreteVal === 'SIM'),
      diasAntecedencia: diasVal,
      concluido: item.concluido ?? false,

      // Column Header Aliases for Aba 19_Agenda_E_Compromissos
      // A: ID | B: Titulo | C: Data | D: Hora | E: Descrição | F: Cor_De_Identificação | G: Efeito_Alerta_(Piscando) | H: Lembrete_Ativo | I: Dias_De_Antecedência
      ID: idStr,
      Titulo: tituloStr,
      Data: rawDate,
      Hora: horaStr,
      Descrição: descStr,
      Cor_De_Identificação: corStr,
      "Efeito_Alerta_(Piscando)": piscandoVal,
      Lembrete_Ativo: lembreteVal,
      Dias_De_Antecedência: diasVal
    };
  });

  const rawApptsSource = Array.isArray(appointments) && appointments.length > 0 ? appointments : [];
  const mappedAppointments = rawApptsSource.map((item: any) => {
    let rawDate = item.data || item.Data || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3 && parts[0].length === 4) {
        rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    const idStr = item.id !== undefined && item.id !== null && String(item.id).trim() !== '' ? String(item.id) : (item.ID ? String(item.ID) : String(Date.now()));
    const espStr = item.especialidade || item.Especialidade || '';
    const medStr = item.medico || item.Medico || item.Médico || '';
    const horaStr = item.hora || item.Hora || item.horas || item.Horas || item.horario || item.Horario || '';
    const localStr = item.local || item.Local || '';
    const lembreteVal = (item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM' || String(item['Lembrete_Ativo']).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
    const statusStr = item.status || item.Status || 'Agendada';
    const obsStr = item.observacoes || item.observacao || item['Observação'] || item['Observações'] || item.obs || item.OBS || '';

    return {
      id: idStr,
      especialidade: espStr,
      medico: medStr,
      data: rawDate,
      hora: horaStr,
      local: localStr,
      lembreteAtivo: item.lembreteAtivo ?? (lembreteVal === 'SIM'),
      status: statusStr,
      observacoes: obsStr,

      // Column Header Aliases for Aba 6_Consultas_Médicas
      // A: ID | B: Especialidade | C: Médico | D: Data | E: Horas | F: Local | G: Lembrete_Ativo | H: Status | I: Observação
      ID: idStr,
      Especialidade: espStr,
      "Médico": medStr,
      Medico: medStr,
      Data: rawDate,
      Horas: horaStr,
      Hora: horaStr,
      Local: localStr,
      "Lembrete_Ativo": lembreteVal,
      Status: statusStr,
      "Observação": obsStr,
      "Observações": obsStr,
      Observacao: obsStr,
      Observacoes: obsStr
    };
  });

  const mappedTransactions = (Array.isArray(transactions) ? transactions : []).map((t: any) => {
    let rawDate = t.data || t.Data || '';
    if (rawDate && rawDate.includes('-')) {
      const parts = rawDate.split('T')[0].split('-');
      if (parts.length === 3) rawDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    if (!rawDate) rawDate = new Date().toLocaleDateString('pt-BR');

    const idStr = t.id !== undefined && t.id !== null && String(t.id).trim() !== '' ? String(t.id) : (t.ID ? String(t.ID) : String(Date.now()));
    const descStr = t.descricao || t.Descrição || '';
    const valorNum = typeof t.valor === 'number' ? t.valor : (parseFloat(String(t.valor || 0).replace(',', '.')) || 0);
    const valorPgNum = typeof t.valorPg === 'number' ? t.valorPg : (typeof t.valorPago === 'number' ? t.valorPago : (typeof t.Valor_PG === 'number' ? t.Valor_PG : (t.status === 'PAGO' ? valorNum : 0)));
    const bancoIdVal = t.bancoId || t.Banco_Id || '';
    const cartaoIdVal = t.cartaoid || t.cartaoId || t.Cartão_Id || '';
    const formaPagVal = t.formaPagamento || t.Forma_Pagamento || '';
    const tipoVal = t.tipo || t.Tipo || 'DESPESA';
    const catVal = t.categoria || t.Categoria || 'OUTROS';
    const statusVal = t.status || t.Status || 'PAGO';

    const kmVal = t.km !== undefined && t.km !== null ? t.km : (t.KM !== undefined ? t.KM : '');
    const litrosVal = t.litros !== undefined && t.litros !== null ? t.litros : (t.Litros !== undefined ? t.Litros : '');
    const precoLitroVal = t.precoLitro !== undefined && t.precoLitro !== null ? t.precoLitro : (t.Preço_Litro !== undefined ? t.Preço_Litro : '');
    const compTanqueVal = t.completouTanque === true || String(t.completouTanque).toUpperCase() === 'SIM' || String(t.Completou_O_Tanque).toUpperCase() === 'SIM' ? 'SIM' : 'NÃO';
    const kmPercVal = t.kmPercorrido !== undefined && t.kmPercorrido !== null ? t.kmPercorrido : (t.KM_Percorrido !== undefined ? t.KM_Percorrido : '');
    const mediaVal = t.mediaKmL !== undefined && t.mediaKmL !== null ? t.mediaKmL : (t['Média_(Km/L)'] !== undefined ? t['Média_(Km/L)'] : '');

    const veiculoVal = t.veiculo || t.Veiculo || '';
    const descVeiculoVal = t.descricaoVeiculo || t.Descrição_Do_Veículo || t['Descrição_Do_Viculo'] || '';
    const motoristaVal = t.motorista || t.Motorista || '';
    const nomePostoVal = t.nomePosto || t.Nome_Posto || '';
    const localPostoVal = t.localizacaoPosto || t.Localização_Do_Posto || '';
    const compUrlVal = t.comprovanteUrl || t.Comprovante_Url || '';
    const obsVal = t.obs || t.OBS || t.observacoes || '';

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
      // A: ID | B: Data | C: Descrição | D: Valor | E: Valor_Pago | F: Banco_Id | G: Cartão_Id | H: Forma_Pagamento
      // I: Tipo | J: Categoria | K: Status | L: KM | M: Litros | N: Preço_Litro | O: Completou_O_Tanque | P: KM_Percorrido
      // Q: Média_(Km/L) | R: Veiculo | S: Descrição_Do_Viculo | T: Motorista | U: Nome_Posto | V: Localização_Do_Posto
      // W: Comprovante_Url | X: OBS
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

  const mappedFuelings = mappedTransactions.filter((t: any) => String(t.categoria || t.Categoria || '').toUpperCase() === 'ABASTECIMENTO');

  const payload = {
    action: 'syncData',
    spreadsheetId: cleanSheetId,
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