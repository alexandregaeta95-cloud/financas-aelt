/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT BACKEND ENGINE - WEALTHFLOW / FINANÇAS GAETA (v4.0 - INCREMENTAL UPSERT)
 * ==============================================================================
 */

export const APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT BACKEND ENGINE - WEALTHFLOW / FINANÇAS GAETA (v4.0 - INCREMENTAL UPSERT)
 * ==============================================================================
 */

var txHeaders = [
  'Id', 'Data', 'Descrição', 'Valor', 'Valor_PG', 'Banco_Id', 'Cartão_Id', 'Forma_Pagamento',
  'Tipo', 'Categoria', 'Status', 'KM', 'Litros', 'Preço_Litro', 'Completou_O_Tanque',
  'KM_Percorrido', 'Média_(Km/L)', 'Veiculo', 'Descrição_Do_Veículo', 'Motorista',
  'Nome_Posto', 'Localização_Do_Posto', 'Comprovante_Url', 'OBS'
];

var DEFAULT_SPREADSHEET_ID = '1JL1LlHmBtXj_dvWXvaedlDTWrSfptXzbhYlMJH1RNO4';

function doGet(e) {
  var startTime = new Date().getTime();
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'fetchAllData';
    var ssId = (e && e.parameter && e.parameter.spreadsheetId) ? e.parameter.spreadsheetId : null;
    var ss = getSpreadsheet(ssId);

    if (action === 'fetchTransactions') {
      var txs = readTransactions(ss);
      return createJsonResponse({ status: 'success', transactions: txs });
    }

    var allData = fetchAllDataFromSheet(ss);
    return createJsonResponse({
      status: 'success',
      data: allData,
      executionTimeMs: new Date().getTime() - startTime
    });
  } catch (err) {
    Logger.log('Erro no doGet: ' + err.toString());
    return createJsonResponse({ status: 'error', error: err.toString() });
  }
}

function doPost(e) {
  var startTime = new Date().getTime();
  try {
    var postData = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postData = JSON.parse(e.postData.contents);
      } catch (pErr) {
        postData = {};
      }
    }

    var action = postData.action || (e && e.parameter && e.parameter.action) || 'syncData';
    var ssId = postData.spreadsheetId || (e && e.parameter && e.parameter.spreadsheetId);
    var ss = getSpreadsheet(ssId);

    if (action === 'fetchAllData') {
      var data = fetchAllDataFromSheet(ss);
      return createJsonResponse({ status: 'success', data: data });
    }

    if (action === 'fetchTransactions') {
      var txs = readTransactions(ss);
      return createJsonResponse({ status: 'success', transactions: txs });
    }

    if (action === 'uploadBackup') {
      var backupRes = handleUploadBackup(ss, postData);
      return createJsonResponse(backupRes);
    }

    var report = saveAllDataToSheet(ss, postData);
    var updatedData = fetchAllDataFromSheet(ss);
    var endTime = new Date().getTime();

    return createJsonResponse({
      status: 'success',
      message: 'Dados sincronizados com sucesso na planilha (upsert incremental)!',
      data: updatedData,
      stats: {
        executionTimeMs: endTime - startTime,
        timestamp: new Date().toISOString()
      },
      report: report
    });
  } catch (err) {
    Logger.log('Erro no doPost: ' + err.toString());
    return createJsonResponse({ status: 'error', error: err.toString() });
  }
}

function getSpreadsheet(ssId) {
  if (ssId && String(ssId).trim() !== '' && ssId !== 'active_sheet') {
    try {
      return SpreadsheetApp.openById(ssId);
    } catch (err) {
      Logger.log('Não foi possível abrir planilha com ID ' + ssId + '. Tentando padrão...');
    }
  }
  try {
    return SpreadsheetApp.openById(DEFAULT_SPREADSHEET_ID);
  } catch (e2) {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function findOrCreateSheet(ss, primaryName, aliases) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var sheet = ss.getSheetByName(primaryName);
  if (sheet) return sheet;

  if (aliases && Array.isArray(aliases)) {
    for (var i = 0; i < aliases.length; i++) {
      var s = ss.getSheetByName(aliases[i]);
      if (s) return s;
    }
  }

  var allSheets = ss.getSheets();
  var normalize = function(str) {
    if (!str) return '';
    return String(str)
      .toUpperCase()
      .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
      .replace(/^\\d+[_-\\s]*/, '')
      .replace(/[^A-Z0-9]/g, '');
  };

  var normTarget = normalize(primaryName);
  for (var k = 0; k < allSheets.length; k++) {
    var title = allSheets[k].getName();
    var normTitle = normalize(title);
    if (normTitle && normTarget && (normTitle === normTarget || (normTarget.length >= 4 && normTitle.indexOf(normTarget) !== -1))) {
      return allSheets[k];
    }
  }

  if (aliases && Array.isArray(aliases)) {
    for (var a = 0; a < aliases.length; a++) {
      var normAlias = normalize(aliases[a]);
      for (var k2 = 0; k2 < allSheets.length; k2++) {
        var t2 = allSheets[k2].getName();
        var n2 = normalize(t2);
        if (n2 && normAlias && n2 === normAlias) {
          return allSheets[k2];
        }
      }
    }
  }

  return ss.insertSheet(primaryName);
}

function fetchAllDataFromSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var txs = readTransactions(ss);
  var abastecimentos = readAbastecimentos(ss, txs);
  var riskZones = readGenericSheet(ss, '17_Zonas_De_Risco', ['ZonasDeRisco', 'ZonaDeRisco', 'Zona de risco', 'RiskZones'], ['ID', 'Tipo_Registro', 'Nome_Título', 'Nível_De_Risco', 'Latitude', 'Longitude', 'Raio (m)', 'Ativo', 'Mensagem_De_Alerta', 'Data_Registro', 'Observação']);
  var appointments = readGenericSheet(ss, '6_Consultas_Médicas', ['6_Consultas_Medicas', 'ConsultasMedicas', 'Consultas Médicas', 'Consultas', 'Appointments'], ['ID', 'Especialidade', 'Médico', 'Data', 'Horas', 'Local', 'Lembrete_Ativo', 'Status', 'Observação']);
  var prescriptions = readGenericSheet(ss, '7_Receitas_Médicas', ['7_Receitas_Medicas', 'ReceitasMedicas', 'Receitas Médicas', 'Prescriptions'], ['ID', 'Medicamento', 'Dosagem', 'Frequência', 'Médico', 'Especialidade', 'Data_Emissão', 'Data_Vencimento', 'Instruções', 'Observação', 'Arquivo_Anexo']);
  var compromissos = readGenericSheet(ss, '19_Agenda_E_Compromissos', ['Agenda', 'Compromissos', 'AgendaECompromissos', 'Agenda e Compromissos'], ['ID', 'Titulo', 'Data', 'Hora', 'Descrição', 'Cor_De_Identificação', 'Efeito_Alerta_(Piscando)', 'Lembrete_Ativo', 'Dias_De_Antecedência', 'Concluído', 'Categoria']);
  var vehicles = readGenericSheet(ss, '9_Veiculos', ['9_Veículos', 'Veiculos', 'Veículos', 'Veiculos Registrados', 'RegisteredVehicles'], ['ID', 'Descrição', 'Motorista', 'Placa', 'Renavan', 'Chassi', 'Marca', 'Modelo', 'Ano', 'Ano_Fabricação', 'Mês_Final_Placa', 'KM_Atual', 'Combustível']);
  var performedServices = readGenericSheet(ss, '14_Oficina', ['Oficina', 'ServicosRealizados', 'Serviços Realizados', 'Workshop'], ['ID', 'Data', 'Descrição', 'KM', 'Valor_A_PG', 'Valor_Pago', 'Oficina_Nome', 'Comprovante_Url', 'Observações', 'VeiculoID']);
  var scheduledServices = readGenericSheet(ss, '15_Manutenções_Agendadas', ['15_Manutencoes_Agendadas', 'ServicosAgendados', 'Serviços Agendados', 'Manutenções Agendadas'], ['ID', 'Data_Alvo', 'KM_Alvo', 'Descrição', 'Status', 'Prioridade', 'Oficina_Nome', 'Observações', 'VeiculoID', 'Tipo_Agendamento', 'Recorrente', 'Frequência_Meses', 'Frequência_KM']);
  var groceryItems = readGenericSheet(ss, '16_Lista_De_Mercado', ['ListaMercado', 'Lista de Mercado', 'GroceryItems'], ['ID', 'Item', 'Categoria', 'Quantidade', 'Unidade', 'Valor_Estimado', 'Comprado', 'Observação']);
  var bankAccounts = readGenericSheet(ss, '5_Contas_Bancarias', ['5_Contas_Bancárias', 'Contas Bancárias', 'ContasBancarias', 'Contas'], ['ID', 'Nome', 'Saldo_Inicial', 'Cor', 'Ícone', 'Tipo', 'Agência', 'Conta', 'Limite']);
  var creditCards = readGenericSheet(ss, '18_Cartões_De_Crédito', ['18_Cartoes_De_Credito', 'Cartões de Crédito', 'CartoesDeCredito'], ['ID', 'Nome', 'Limite', 'Fechamento', 'Vencimento', 'Cor', 'Banco_Id', 'Gasto']);
  var infractions = readGenericSheet(ss, '8_Infracoes', ['Infrações', 'Infracoes', 'Multas'], ['ID', 'Protocolo', 'Título', 'Veículo', 'Placa', 'Data', 'Descrição', 'Valor', 'Pontos', 'Status', 'Localização', 'Observação']);
  var categoryBudgets = readGenericSheet(ss, '10_Metas_De_Categoria', ['MetasDeCategoria', 'Metas de Categoria', 'CategoryBudgets'], ['ID', 'Categoria', 'Valor_Limite', 'Período', 'Observação']);
  var customCategories = readGenericSheet(ss, '11_Categorias_Customizadas', ['CategoriasCustomizadas', 'Categorias Customizadas', 'CustomCategories'], ['ID', 'Nome', 'Tipo', 'Cor', 'Ícone']);
  var analysis = readGenericSheet(ss, '12_Analises', ['12_Análises', 'Analises', 'Análises', 'Analysis'], ['ID', 'Título', 'Data', 'Resultado', 'Observação']);
  var profile = readGenericSheet(ss, '13_Perfil', ['Perfil', 'Profile'], ['ID', 'Nome', 'Email', 'Telefone', 'Configurações']);

  Logger.log('[AUDIT - FETCH ALL DATA] Lidos da planilha: Transações=' + txs.length + ', Abastecimentos=' + abastecimentos.length + ', Agenda=' + compromissos.length + ', Veículos=' + vehicles.length + ', Mercado=' + groceryItems.length);

  return {
    transactions: txs,
    abastecimentos: abastecimentos,
    "4_Abastecimentos": abastecimentos,
    riskZones: riskZones,
    appointments: appointments,
    consultas: appointments,
    prescriptions: prescriptions,
    compromissos: compromissos,
    agenda: compromissos,
    registeredVehicles: vehicles,
    veiculos: vehicles,
    performedServices: performedServices,
    workshop: performedServices,
    oficina: performedServices,
    "14_Oficina": performedServices,
    scheduledServices: scheduledServices,
    groceryItems: groceryItems,
    bankAccounts: bankAccounts,
    creditCards: creditCards,
    infractions: infractions,
    categoryBudgets: categoryBudgets,
    customCategories: customCategories,
    analysis: analysis,
    profile: profile
  };
}

function readTransactions(ss) {
  var items = readGenericSheet(ss, '1_Lancamentos', ['Lançamentos', 'Lancamentos', 'Transacoes'], txHeaders);
  Logger.log('[AUDIT - READ TRANSACTIONS] Aba 1_Lancamentos lida. Total de registros: ' + items.length);
  return items;
}

function readAbastecimentos(ss, optionalTxs) {
  var abs = readGenericSheet(ss, '4_Abastecimentos', ['Abastecimentos', 'Abastecimento', '4_Abastecimentos'], txHeaders);
  var txs = optionalTxs || readTransactions(ss);
  var txAbs = txs.filter(function(t) {
    var cat = String(t.categoria || t.Categoria || '').toUpperCase();
    return cat === 'ABASTECIMENTO';
  });

  var absMap = {};
  var result = [];

  for (var i = 0; i < abs.length; i++) {
    var item = abs[i];
    var idKey = String(item.id || item.Id || item.ID || '').trim();
    if (idKey) {
      absMap[idKey] = item;
      result.push(item);
    }
  }

  for (var j = 0; j < txAbs.length; j++) {
    var txItem = txAbs[j];
    var txIdKey = String(txItem.id || txItem.Id || txItem.ID || '').trim();
    if (txIdKey && !absMap[txIdKey]) {
      absMap[txIdKey] = txItem;
      result.push(txItem);
    }
  }

  Logger.log('[AUDIT - READ ABASTECIMENTOS] Lidos de 4_Abastecimentos: ' + abs.length + ' | Lidos de 1_Lancamentos: ' + txAbs.length + ' | Total deduplicado: ' + result.length);
  return result;
}

function readGenericSheet(ss, primaryName, aliases, defaultHeaders) {
  var sheet = findOrCreateSheet(ss, primaryName, aliases);
  var data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];

  var rawHeadersRow = data[0];
  var headerMap = {};
  var headersList = [];
  var idColIndex = -1;

  for (var col = 0; col < rawHeadersRow.length; col++) {
    var hName = String(rawHeadersRow[col] || '').trim();
    if (!hName) continue;

    headersList.push({ name: hName, colIndex: col });
    headerMap[hName] = col;
    headerMap[hName.toUpperCase()] = col;

    if (hName.toUpperCase() === 'ID') {
      idColIndex = col;
    }
  }

  if (idColIndex === -1) {
    idColIndex = 0;
  }

  var result = [];
  var idsAssignedCount = 0;

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row) continue;

    var hasContent = row.some(function(cell) {
      return cell !== undefined && cell !== null && String(cell).trim() !== '';
    });
    if (!hasContent) continue;

    var item = {};
    for (var hIdx = 0; hIdx < headersList.length; hIdx++) {
      var hObj = headersList[hIdx];
      var headerKey = hObj.name;
      var colIndex = hObj.colIndex;

      var val = (colIndex < row.length) ? row[colIndex] : '';
      item[headerKey] = val;

      var normProp = normalizeHeaderKey(headerKey);
      if (normProp) {
        item[normProp] = val;
      }
    }

    var rawId = item.id || item.Id || item.ID;
    var idStr = (rawId !== undefined && rawId !== null) ? String(rawId).trim() : '';

    if (!idStr) {
      // Se a linha existe no Google Sheets mas NÃO tem ID no cabeçalho:
      // Gera um ID estável e GRAVA IMEDIATAMENTE NA CÉLULA da planilha!
      idStr = 'ID_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000) + '_' + i;
      sheet.getRange(i + 1, idColIndex + 1).setValue(idStr);
      idsAssignedCount++;
    }

    item.id = idStr;
    item.Id = idStr;
    item.ID = idStr;

    result.push(item);
  }

  Logger.log('[AUDIT - READ GENERIC SHEET] Aba [' + primaryName + ']: Registros lidos=' + result.length + ' | IDs gerados e gravados na célula=' + idsAssignedCount);
  return result;
}

function normalizeHeaderKey(key) {
  if (!key) return '';
  var clean = String(key).trim()
    .normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, '');
  if (!clean) return '';
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

function saveAllDataToSheet(ss, payload) {
  var report = [];
  var forceOverwrite = (payload && (payload.forceOverwrite === true || payload.forceOverwrite === 'true'));
  var deletedIds = (payload && Array.isArray(payload.deletedIds)) ? payload.deletedIds : [];

  Logger.log('================================================================');
  Logger.log('[AUDIT - SAVE ALL DATA] Início de gravação incremental (UPSERT)');
  Logger.log('forceOverwrite: ' + forceOverwrite + ' | Total de IDs deletados explicitamente: ' + deletedIds.length);
  Logger.log('IDs deletados: ' + JSON.stringify(deletedIds));
  Logger.log('================================================================');

  var rawTxs = payload.transactions || payload.transacoes || payload.lancamentos || [];
  var allTxs = Array.isArray(rawTxs) ? rawTxs : [];

  var modules = [
    {
      name: 'Lançamentos',
      primaryName: '1_Lancamentos',
      aliases: ['Lançamentos', 'Lancamentos', 'Transacoes'],
      headers: txHeaders,
      data: allTxs
    },
    {
      name: 'Abastecimentos',
      primaryName: '4_Abastecimentos',
      aliases: ['4_Abastecimentos', 'Abastecimentos', 'Abastecimento', '4_Abastecimento'],
      headers: txHeaders,
      data: payload.abastecimentos || payload['4_Abastecimentos'] || []
    },
    {
      name: 'Zonas de Risco',
      primaryName: '17_Zonas_De_Risco',
      aliases: ['ZonasDeRisco', 'ZonaDeRisco', 'Zona de risco', 'RiskZones'],
      headers: ['ID', 'Tipo_Registro', 'Nome_Título', 'Nível_De_Risco', 'Latitude', 'Longitude', 'Raio (m)', 'Ativo', 'Mensagem_De_Alerta', 'Data_Registro', 'Observação'],
      data: payload.riskZones || []
    },
    {
      name: 'Consultas Médicas',
      primaryName: '6_Consultas_Médicas',
      aliases: ['6_Consultas_Medicas', 'ConsultasMedicas', 'Consultas Médicas', 'Consultas', 'Appointments'],
      headers: ['ID', 'Especialidade', 'Médico', 'Data', 'Horas', 'Local', 'Lembrete_Ativo', 'Status', 'Observação'],
      data: payload.appointments || payload.consultas || payload.consultasMedicas || payload['6_Consultas_Médicas'] || []
    },
    {
      name: 'Receitas Médicas',
      primaryName: '7_Receitas_Médicas',
      aliases: ['7_Receitas_Medicas', 'ReceitasMedicas', 'Receitas Médicas', 'Prescriptions'],
      headers: ['ID', 'Medicamento', 'Dosagem', 'Frequência', 'Médico', 'Especialidade', 'Data_Emissão', 'Data_Vencimento', 'Instruções', 'Observação', 'Arquivo_Anexo'],
      data: payload.prescriptions || payload.receitasMedicas || []
    },
    {
      name: 'Infrações',
      primaryName: '8_Infracoes',
      aliases: ['Infrações', 'Infracoes', 'Multas'],
      headers: ['ID', 'Protocolo', 'Título', 'Veículo', 'Placa', 'Data', 'Descrição', 'Valor', 'Pontos', 'Status', 'Localização', 'Observação'],
      data: payload.infractions || payload.infracoes || []
    },
    {
      name: 'Veículos',
      primaryName: '9_Veiculos',
      aliases: ['9_Veículos', 'Veiculos', 'Veículos', 'Veiculos Registrados', 'RegisteredVehicles'],
      headers: ['ID', 'Descrição', 'Motorista', 'Placa', 'Renavan', 'Chassi', 'Marca', 'Modelo', 'Ano', 'Ano_Fabricação', 'Mês_Final_Placa', 'KM_Atual', 'Combustível'],
      data: payload.registeredVehicles || payload.veiculos || payload['9_Veiculos'] || []
    },
    {
      name: 'Metas de Categoria',
      primaryName: '10_Metas_De_Categoria',
      aliases: ['MetasDeCategoria', 'Metas de Categoria', 'CategoryBudgets'],
      headers: ['ID', 'Categoria', 'Valor_Limite', 'Período', 'Observação'],
      data: convertObjectOrArray(payload.categoryBudgets)
    },
    {
      name: 'Categorias Customizadas',
      primaryName: '11_Categorias_Customizadas',
      aliases: ['CategoriasCustomizadas', 'Categorias Customizadas', 'CustomCategories'],
      headers: ['ID', 'Nome', 'Tipo', 'Cor', 'Ícone'],
      data: payload.customCategories || []
    },
    {
      name: 'Análises',
      primaryName: '12_Analises',
      aliases: ['12_Análises', 'Analises', 'Análises', 'Analysis'],
      headers: ['ID', 'Título', 'Data', 'Resultado', 'Observação'],
      data: payload.analysis || []
    },
    {
      name: 'Perfil',
      primaryName: '13_Perfil',
      aliases: ['Perfil', 'Profile'],
      headers: ['ID', 'Nome', 'Email', 'Telefone', 'Configurações'],
      data: payload.profile || []
    },
    {
      name: 'Oficina / Serviços Realizados',
      primaryName: '14_Oficina',
      aliases: ['Oficina', 'ServicosRealizados', 'Serviços Realizados', 'Workshop'],
      headers: ['ID', 'Data', 'Descrição', 'KM', 'Valor_A_PG', 'Valor_Pago', 'Oficina_Nome', 'Comprovante_Url', 'Observações', 'VeiculoID'],
      data: payload.performedServices || payload.workshop || payload.oficina || payload['14_Oficina'] || []
    },
    {
      name: 'Manutenções Agendadas',
      primaryName: '15_Manutenções_Agendadas',
      aliases: ['15_Manutencoes_Agendadas', 'ServicosAgendados', 'Serviços Agendados', 'Manutenções Agendadas'],
      headers: ['ID', 'Data_Alvo', 'KM_Alvo', 'Descrição', 'Status', 'Prioridade', 'Oficina_Nome', 'Observações', 'VeiculoID', 'Tipo_Agendamento', 'Recorrente', 'Frequência_Meses', 'Frequência_KM'],
      data: payload.scheduledServices || payload.scheduledMaintenance || []
    },
    {
      name: 'Lista de Mercado',
      primaryName: '16_Lista_De_Mercado',
      aliases: ['ListaMercado', 'Lista de Mercado', 'GroceryItems'],
      headers: ['ID', 'Item', 'Categoria', 'Quantidade', 'Unidade', 'Valor_Estimado', 'Comprado', 'Observação'],
      data: payload.groceryItems || []
    },
    {
      name: 'Contas Bancárias',
      primaryName: '5_Contas_Bancarias',
      aliases: ['5_Contas_Bancárias', 'Contas Bancárias', 'ContasBancarias', 'Contas'],
      headers: ['ID', 'Nome', 'Saldo_Inicial', 'Cor', 'Ícone', 'Tipo', 'Agência', 'Conta', 'Limite'],
      data: payload.bankAccounts || []
    },
    {
      name: 'Cartões de Crédito',
      primaryName: '18_Cartões_De_Crédito',
      aliases: ['18_Cartoes_De_Credito', 'Cartões de Crédito', 'CartoesDeCredito'],
      headers: ['ID', 'Nome', 'Limite', 'Fechamento', 'Vencimento', 'Cor', 'Banco_Id', 'Gasto'],
      data: payload.creditCards || []
    },
    {
      name: 'Agenda e Compromissos',
      primaryName: '19_Agenda_E_Compromissos',
      aliases: ['Agenda', 'Compromissos', 'AgendaECompromissos', '19_Agenda_E_Compromissos'],
      headers: ['ID', 'Titulo', 'Data', 'Hora', 'Descrição', 'Cor_De_Identificação', 'Efeito_Alerta_(Piscando)', 'Lembrete_Ativo', 'Dias_De_Antecedência', 'Concluído', 'Categoria'],
      data: payload.compromissos || payload.agenda || payload['19_Agenda_E_Compromissos'] || []
    }
  ];

  modules.forEach(function(mod) {
    try {
      var res = upsertRowsToSheet(ss, mod.primaryName, mod.aliases, mod.headers, mod.data, deletedIds, forceOverwrite);
      report.push({
        module: mod.name,
        sheet: mod.primaryName,
        status: 'ok',
        updated: res.updated,
        inserted: res.inserted,
        deleted: res.deleted,
        total: res.total
      });
      Logger.log('Módulo [' + mod.name + '] sincronizado via UPSERT: Atualizados=' + res.updated + ', Inseridos=' + res.inserted + ', Deletados=' + res.deleted + ', Total Atual=' + res.total);
    } catch (mErr) {
      Logger.log('Erro ao salvar módulo [' + mod.name + ']: ' + mErr.toString());
      report.push({
        module: mod.name,
        sheet: mod.primaryName,
        status: 'error',
        error: mErr.toString()
      });
    }
  });

  return report;
}

function convertObjectOrArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  if (typeof obj === 'object') {
    var list = [];
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        list.push({ id: k, categoria: k, valorLimite: obj[k] });
      }
    }
    return list;
  }
  return [];
}

/**
 * FUNÇÃO DE GRAVAÇÃO INCREMENTAL BASEADA EM ID (UPSERT)
 * NUNCA USA clearContents() para sincronização normal.
 * - Atualiza linhas existentes correspondentes pelo ID.
 * - Insere novas linhas ao final.
 * - Preserva linhas da planilha que não foram enviadas.
 * - Deleta APENAS registros cujos IDs estejam explicitamente em deletedIds.
 */
function upsertRowsToSheet(ss, primaryName, aliases, defaultHeaders, items, deletedIds, forceOverwrite) {
  var sheet = findOrCreateSheet(ss, primaryName, aliases);

  if (forceOverwrite === true) {
    Logger.log('FORCE OVERWRITE SOLICITADO para a aba [' + primaryName + ']. Limpando conteúdo...');
    sheet.clearContents();
    var overwriteRows = (items || []).map(function(item) {
      return defaultHeaders.map(function(h) { return extractFieldValue(item, h); });
    });
    var allVals = [defaultHeaders].concat(overwriteRows);
    sheet.getRange(1, 1, allVals.length, defaultHeaders.length).setValues(allVals);
    return { updated: 0, inserted: items ? items.length : 0, deleted: 0, total: items ? items.length : 0 };
  }

  var existingData = sheet.getDataRange().getValues();
  var headers = defaultHeaders.slice();

  if (existingData && existingData.length > 0 && existingData[0] && existingData[0].length > 0) {
    var existingHeaders = existingData[0].map(function(h) { return String(h || '').trim(); });
    var hasValidHeaders = existingHeaders.some(function(h) { return h.length > 0; });
    if (hasValidHeaders) {
      headers = existingHeaders.slice();
      defaultHeaders.forEach(function(dh) {
        if (!headers.some(function(eh) { return eh.toUpperCase() === dh.toUpperCase(); })) {
          headers.push(dh);
        }
      });
    }
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    existingData = [headers];
  }

  var idColIndex = -1;
  for (var c = 0; c < headers.length; c++) {
    if (String(headers[c] || '').toUpperCase() === 'ID') {
      idColIndex = c;
      break;
    }
  }
  if (idColIndex === -1) idColIndex = 0;

  var existingIdRowMap = {};
  if (existingData.length > 1) {
    for (var r = 1; r < existingData.length; r++) {
      var row = existingData[r];
      var rawId = (idColIndex < row.length && row[idColIndex] !== undefined && row[idColIndex] !== null) ? String(row[idColIndex]).trim() : '';
      if (rawId) {
        existingIdRowMap[rawId] = r + 1;
      }
    }
  }

  var deletedCount = 0;
  var delSet = {};
  (deletedIds || []).forEach(function(dId) {
    if (dId !== undefined && dId !== null) {
      delSet[String(dId).trim()] = true;
    }
  });

  var rowsToDelete = [];
  for (var idKey in existingIdRowMap) {
    if (delSet[idKey] === true) {
      rowsToDelete.push(existingIdRowMap[idKey]);
    }
  }
  rowsToDelete.sort(function(a, b) { return b - a; });
  rowsToDelete.forEach(function(rowIdx) {
    sheet.deleteRow(rowIdx);
    deletedCount++;
  });

  if (deletedCount > 0) {
    existingData = sheet.getDataRange().getValues();
    existingIdRowMap = {};
    if (existingData.length > 1) {
      for (var r2 = 1; r2 < existingData.length; r2++) {
        var row2 = existingData[r2];
        var rawId2 = (idColIndex < row2.length && row2[idColIndex] !== undefined && row2[idColIndex] !== null) ? String(row2[idColIndex]).trim() : '';
        if (rawId2) {
          existingIdRowMap[rawId2] = r2 + 1;
        }
      }
    }
  }

  var updatedCount = 0;
  var insertedCount = 0;

  (items || []).forEach(function(item) {
    if (!item) return;

    var rawItemId = item.id || item.Id || item.ID;
    var itemIdStr = (rawItemId !== undefined && rawItemId !== null) ? String(rawItemId).trim() : '';

    if (!itemIdStr) {
      itemIdStr = 'ID_' + new Date().getTime() + '_' + Math.floor(Math.random() * 10000);
      item.id = itemIdStr;
    }

    if (delSet[itemIdStr] === true) return;

    var rowValues = headers.map(function(h) {
      var val = extractFieldValue(item, h);
      if (val instanceof Date) {
        var y = val.getFullYear();
        var m = ('0' + (val.getMonth() + 1)).slice(-2);
        var d = ('0' + val.getDate()).slice(-2);
        return d + '/' + m + '/' + y;
      }
      if (typeof val === 'boolean') {
        return val ? 'SIM' : 'NÃO';
      }
      return val !== undefined && val !== null ? val : '';
    });

    if (existingIdRowMap[itemIdStr] !== undefined) {
      var targetRow = existingIdRowMap[itemIdStr];
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([rowValues]);
      updatedCount++;
    } else {
      sheet.appendRow(rowValues);
      var newLastRow = sheet.getLastRow();
      existingIdRowMap[itemIdStr] = newLastRow;
      insertedCount++;
    }
  });

  var finalTotal = Math.max(0, sheet.getLastRow() - 1);
  Logger.log('[AUDIT - UPSERT SUCCESS] Aba [' + primaryName + ']: Atualizados=' + updatedCount + ', Inseridos=' + insertedCount + ', Deletados=' + deletedCount + ', Total Final na Aba=' + finalTotal);

  return {
    updated: updatedCount,
    inserted: insertedCount,
    deleted: deletedCount,
    total: finalTotal
  };
}

function extractFieldValue(item, headerName) {
  if (!item || !headerName) return '';

  if (headerName in item && item[headerName] !== undefined && item[headerName] !== null) {
    return item[headerName];
  }

  var hUpper = String(headerName).toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

  for (var k in item) {
    if (item.hasOwnProperty(k) && item[k] !== undefined && item[k] !== null) {
      var kUpper = String(k).toUpperCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
      if (kUpper === hUpper) {
        return item[k];
      }
    }
  }

  if (hUpper === 'ID') return item.id || item.Id || item.ID || '';
  if (hUpper === 'DATA') return item.data || item.Data || item.dataEmissao || item.dataRegistro || item.dataAlvo || item.dataOcorrencia || '';
  if (hUpper === 'DESCRICAO') return item.descricao || item['Descrição'] || item.nome || item.nomeTitulo || item.item || item.titulo || item.justificativa || '';
  if (hUpper === 'VALOR') return item.valor !== undefined ? item.valor : (item.Valor !== undefined ? item.Valor : (item.valorEstimado !== undefined ? item.valorEstimado : (item.valorMulta !== undefined ? item.valorMulta : 0)));
  if (hUpper === 'VALORPG' || hUpper === 'VALORPAGO') return item.valorPago !== undefined ? item.valorPago : (item.valorPg !== undefined ? item.valorPg : (item.Valor_PG !== undefined ? item.Valor_PG : 0));
  if (hUpper === 'VALORAPG' || hUpper === 'VALORAPAGAR') return item.valorAPG !== undefined ? item.valorAPG : (item.Valor_A_PG !== undefined ? item.Valor_A_PG : 0);
  if (hUpper === 'BANCOID') return item.bancoId || item.Banco_Id || '';
  if (hUpper === 'CARTAID' || hUpper === 'CARTAOID') return item.cartaoId || item.cartaoid || item['Cartão_Id'] || '';
  if (hUpper === 'FORMAPAGAMENTO') return item.formaPagamento || item.Forma_Pagamento || '';
  if (hUpper === 'TIPO') return item.tipo || item.Tipo || 'DESPESA';
  if (hUpper === 'CATEGORIA') return item.categoria || item.Categoria || '';
  if (hUpper === 'STATUS') return item.status || item.Status || 'CONCLUÍDO';
  if (hUpper === 'KM') return item.km !== undefined ? item.km : (item.KM !== undefined ? item.KM : '');
  if (hUpper === 'LITROS') return item.litros !== undefined ? item.litros : (item.Litros !== undefined ? item.Litros : '');
  if (hUpper === 'PRECOLITRO') return item.precoLitro !== undefined ? item.precoLitro : (item['Preço_Litro'] !== undefined ? item['Preço_Litro'] : '');
  if (hUpper === 'COMPLETOUOTANQUE') {
    var cVal = item.completouTanque !== undefined ? item.completouTanque : item.Completou_O_Tanque;
    return (cVal === true || String(cVal).toUpperCase() === 'SIM' || String(cVal).toUpperCase() === 'TRUE') ? 'SIM' : 'NÃO';
  }
  if (hUpper === 'KMPERCORRIDO') return item.kmPercorrido !== undefined ? item.kmPercorrido : (item.KM_Percorrido !== undefined ? item.KM_Percorrido : '');
  if (hUpper === 'MEDIAKML') return item.mediaKmL !== undefined ? item.mediaKmL : (item['Média_(Km/L)'] !== undefined ? item['Média_(Km/L)'] : '');
  if (hUpper === 'VEICULO' || hUpper === 'VEICULOID') return item.veiculoId || item.veiculo || item.veiculoDescricao || item['VeiculoID'] || item['Veículo'] || '';
  if (hUpper === 'DESCRICAODOVEICULO') return item.descricaoVeiculo || item['Descrição_Do_Veículo'] || item.descricaoDoVeiculo || '';
  if (hUpper === 'MOTORISTA') return item.motorista || item.Motorista || '';
  if (hUpper === 'NOMEPOSTO') return item.nomePosto || item.Nome_Posto || '';
  if (hUpper === 'LOCALIZACAODOPOSTO' || hUpper === 'LOCAL' || hUpper === 'LOCALIZACAO') return item.localizacaoPosto || item.local || item.localizacao || item['Localização_Do_Posto'] || '';
  if (hUpper === 'COMPROVANTEURL') return item.comprovanteUrl || item.Comprovante_Url || '';
  if (hUpper === 'OBS' || hUpper === 'OBSERVACAO' || hUpper === 'OBSERVACOES') return item.obs || item.observacoes || item.observacao || item.OBS || item.instrucoes || '';
  if (hUpper === 'TITULO') return item.titulo || item.Titulo || item.item || item.title || '';
  if (hUpper === 'HORA' || hUpper === 'HORAS' || hUpper === 'HORARIO') return item.hora || item.horario || item.Horas || item.Horario || '';
  if (hUpper === 'MEDICO') return item.medico || item.Medico || item['Médico'] || '';
  if (hUpper === 'ESPECIALIDADE') return item.especialidade || item.Especialidade || '';
  if (hUpper === 'MEDICAMENTO') return item.medicamento || item.Medicamento || item.medicamentos || '';
  if (hUpper === 'DOSAGEM') return item.dosagem || item.Dosagem || '';
  if (hUpper === 'FREQUENCIA') return item.frequencia || item.Frequência || '';
  if (hUpper === 'DATAEMISSAO') return item.dataEmissao || item['Data Emissão'] || item.data || '';
  if (hUpper === 'PLACA') return item.placa || item.Placa || '';
  if (hUpper === 'RENAVAN' || hUpper === 'RENAMAM') return item.renavan || item.renavam || item.Renavan || '';
  if (hUpper === 'CHASSI') return item.chassi || item.Chassi || '';
  if (hUpper === 'MARCA') return item.marca || item.Marca || '';
  if (hUpper === 'MODELO') return item.modelo || item.Modelo || '';
  if (hUpper === 'ANO') return item.ano || item.Ano || '';
  if (hUpper === 'ANOFABRICACAO') return item.anoFabricacao || item['Ano_Fabricação'] || '';
  if (hUpper === 'VALORLIMITE') return item.valorLimite || item.limite || item.Valor_Limite || 0;
  if (hUpper === 'PERIODO') return item.periodo || item.Período || 'MENSAL';
  if (hUpper === 'NOME' || hUpper === 'ITEM') return item.nome || item.item || item.Nome || '';
  if (hUpper === 'QUANTIDADE') return item.quantidade || item.qtd || item.Quantidade || 1;
  if (hUpper === 'UNIDADE') return item.unidade || item.Unidade || 'UN';
  if (hUpper === 'VALORESTIMADO') return item.valorEstimado || item['Valor Estimado'] || 0;
  if (hUpper === 'COMPRADO') return (item.comprado === true || String(item.comprado).toUpperCase() === 'SIM' || String(item.comprado) === 'TRUE') ? 'SIM' : 'NÃO';
  if (hUpper === 'TIPOREGISTRO') return item.tipoRegistro || item.tipo || 'LOCAL';
  if (hUpper === 'NOMETITULO') return item.nomeTitulo || item.titulo || item.nomeLocal || item.nome || '';
  if (hUpper === 'NIVELDERISCO' || hUpper === 'NIVELRISCO') return item.nivelDeRisco || item.nivelRisco || 'MÉDIO';
  if (hUpper === 'LATITUDE') return item.latitude || item.latitudi || '';
  if (hUpper === 'LONGITUDE') return item.longitude || '';
  if (hUpper === 'RAIOM' || hUpper === 'RAIO') return item.raioMetros || item.raioM || item.raio || 500;
  if (hUpper === 'ATIVO') return (item.ativo === true || String(item.ativo).toUpperCase() === 'SIM' || String(item.ativo) === 'TRUE') ? 'SIM' : 'NÃO';
  if (hUpper === 'MENSAGEMDEALERTA') return item.mensagemDeAlerta || item.mensagem || '';
  if (hUpper === 'DATAREGISTRO') return item.dataRegistro || item.data || '';
  if (hUpper === 'LIMITE') return item.limite || item.Limite || 0;
  if (hUpper === 'FECHAMENTO') return item.fechamento || item.diaFechamento || item.Fechamento || 1;
  if (hUpper === 'VENCIMENTO') return item.vencimento || item.diaVencimento || item.Vencimento || 10;
  if (hUpper === 'COR' || hUpper === 'CORDEIDENTIFICACAO') return item.cor || item.Cor || item.corIdentificacao || '#22c55e';
  if (hUpper === 'ICONE') return item.icone || item.Icone || 'account_balance';
  if (hUpper === 'SALDOINICIAL') return item.saldoInicial || item.saldo || 0;
  if (hUpper === 'EFEITOALERTAPISCANDO') return (item.piscando === true || String(item.piscando).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
  if (hUpper === 'LEMBRETEATIVO') return (item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
  if (hUpper === 'DIASDEANTECEDENCIA') return item.diasAntecedencia || 2;
  if (hUpper === 'CONCLUIDO') return (item.concluido === true || String(item.concluido).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
  if (hUpper === 'AGENCIA') return item.agencia || '';
  if (hUpper === 'CONTA') return item.conta || '';
  if (hUpper === 'PONTOS') return item.pontos || item.pontosCnh || 0;
  if (hUpper === 'PROTOCOLO') return item.protocolo || '';
  if (hUpper === 'GASTO') return item.gasto || 0;

  return '';
}

function handleUploadBackup(ss, payload) {
  try {
    var rawData = payload.data || payload.jsonData;
    if (!rawData) {
      return { status: 'error', error: 'Nenhum dado de backup fornecido no payload.' };
    }
    var sheet = findOrCreateSheet(ss, 'Backup_Configuracoes', ['Backup', 'Backups']);
    sheet.clearContents();
    sheet.getRange(1, 1).setValue('Data_Backup');
    sheet.getRange(1, 2).setValue('Conteudo_JSON');
    sheet.getRange(2, 1).setValue(new Date().toISOString());
    sheet.getRange(2, 2).setValue(typeof rawData === 'string' ? rawData : JSON.stringify(rawData));
    return { status: 'success', message: 'Backup salvo com sucesso na planilha!' };
  } catch (err) {
    return { status: 'error', error: 'Erro ao salvar backup: ' + err.toString() };
  }
}
`;
