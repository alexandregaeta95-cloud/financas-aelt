/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT BACKEND ENGINE - WEALTHFLOW / FINANÇAS GAETA (v3.0 - FULL)
 * ==============================================================================
 * Sincronização Completa e Suporte Multimódulo com Mapeamento Inteligente de Abas,
 * Leitura Dinâmica de Cabeçalhos, Tratamento de Erros Isolado e Relatório de Execução.
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

    // Ação Padrão: Sincronizar Todos os Módulos
    var report = saveAllDataToSheet(ss, postData);
    var endTime = new Date().getTime();

    return createJsonResponse({
      status: 'success',
      message: 'Dados sincronizados com sucesso na planilha!',
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

// ------------------------------------------------------------------------------
// MAPEAMENTO E LOCALIZAÇÃO DE ABAS (FUZZY & ALIASES)
// ------------------------------------------------------------------------------

function findOrCreateSheet(ss, primaryName, aliases) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Busca Direta por Nome Primário
  var sheet = ss.getSheetByName(primaryName);
  if (sheet) return sheet;

  // 2. Busca Direta por Aliases
  if (aliases && Array.isArray(aliases)) {
    for (var i = 0; i < aliases.length; i++) {
      var s = ss.getSheetByName(aliases[i]);
      if (s) return s;
    }
  }

  // 3. Busca Fuzzy / Normalizada
  var allSheets = ss.getSheets();
  var normalize = function(str) {
    if (!str) return '';
    return String(str)
      .toUpperCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/^\d+[_-\s]*/, '') // Remove prefixos como 9_ ou 14_
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

  // 4. Criação Automática
  return ss.insertSheet(primaryName);
}

// ------------------------------------------------------------------------------
// LEITURA INTELIGENTE DE DADOS
// ------------------------------------------------------------------------------

function fetchAllDataFromSheet(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var txs = readTransactions(ss);
  var riskZones = readGenericSheet(ss, '17_Zonas_De_Risco', ['ZonasDeRisco', 'ZonaDeRisco', 'Zona de risco', 'RiskZones']);
  var appointments = readGenericSheet(ss, '6_Consultas_Médicas', ['6_Consultas_Medicas', 'ConsultasMedicas', 'Consultas Médicas', 'Consultas', 'Appointments']);
  var prescriptions = readGenericSheet(ss, '7_Receitas_Médicas', ['7_Receitas_Medicas', 'ReceitasMedicas', 'Receitas Médicas', 'Prescriptions']);
  var compromissos = readGenericSheet(ss, '19_Agenda_E_Compromissos', ['Agenda', 'Compromissos', 'AgendaECompromissos', 'Agenda e Compromissos']);
  var vehicles = readGenericSheet(ss, '9_Veiculos', ['9_Veículos', 'Veiculos', 'Veículos', 'Veiculos Registrados', 'RegisteredVehicles']);
  var performedServices = readGenericSheet(ss, '14_Oficina', ['Oficina', 'ServicosRealizados', 'Serviços Realizados', 'Workshop']);
  var scheduledServices = readGenericSheet(ss, '15_Manutenções_Agendadas', ['15_Manutencoes_Agendadas', 'ServicosAgendados', 'Serviços Agendados', 'Manutenções Agendadas']);
  var groceryItems = readGenericSheet(ss, '16_Lista_De_Mercado', ['ListaMercado', 'Lista de Mercado', 'GroceryItems']);
  var bankAccounts = readGenericSheet(ss, '5_Contas_Bancarias', ['5_Contas_Bancárias', 'Contas Bancárias', 'ContasBancarias', 'Contas']);
  var creditCards = readGenericSheet(ss, '18_Cartões_De_Crédito', ['18_Cartoes_De_Credito', 'Cartões de Crédito', 'CartoesDeCredito']);
  var infractions = readGenericSheet(ss, '8_Infracoes', ['Infrações', 'Infracoes', 'Multas']);
  var categoryBudgets = readGenericSheet(ss, '10_Metas_De_Categoria', ['MetasDeCategoria', 'Metas de Categoria', 'CategoryBudgets']);
  var customCategories = readGenericSheet(ss, '11_Categorias_Customizadas', ['CategoriasCustomizadas', 'Categorias Customizadas', 'CustomCategories']);
  var analysis = readGenericSheet(ss, '12_Analises', ['12_Análises', 'Analises', 'Análises', 'Analysis']);
  var profile = readGenericSheet(ss, '13_Perfil', ['Perfil', 'Profile']);

  return {
    transactions: txs,
    abastecimentos: txs.filter(function(t) { return String(t.categoria || '').toUpperCase() === 'ABASTECIMENTO'; }),
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
  var sheetsToRead = [
    { name: '1_Lancamentos', aliases: ['Lançamentos', 'Lancamentos', 'Transacoes'] },
    { name: '2_Receitas', aliases: ['Receitas'] },
    { name: '3_Despesas', aliases: ['Despesas'] },
    { name: '4_Abastecimentos', aliases: ['Abastecimentos', 'Abastecimento'] }
  ];

  var allTx = [];
  var seenIds = {};

  sheetsToRead.forEach(function(sConfig) {
    var items = readGenericSheet(ss, sConfig.name, sConfig.aliases);
    if (!items || items.length === 0) return;

    items.forEach(function(item) {
      var rawId = item.id || item.Id || item.ID;
      if (!rawId) return;
      var idStr = String(rawId).trim();
      if (seenIds[idStr]) return;
      seenIds[idStr] = true;

      allTx.push(item);
    });
  });

  return allTx;
}

function readGenericSheet(ss, primaryName, aliases) {
  try {
    var sheet = findOrCreateSheet(ss, primaryName, aliases);
    var data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) return [];

    var headers = data[0].map(function(h) { return String(h || '').trim(); });
    var result = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0) continue;

      var hasContent = row.some(function(cell) {
        return cell !== null && cell !== undefined && String(cell).trim() !== '';
      });
      if (!hasContent) continue;

      var item = {};
      for (var j = 0; j < headers.length; j++) {
        var headerKey = headers[j];
        if (!headerKey) continue;

        var val = row[j];
        if (val instanceof Date) {
          var y = val.getFullYear();
          var m = ('0' + (val.getMonth() + 1)).slice(-2);
          var d = ('0' + val.getDate()).slice(-2);
          val = d + '/' + m + '/' + y;
        } else if (val !== null && val !== undefined) {
          val = String(val).trim();
        } else {
          val = '';
        }

        // Raw header property
        item[headerKey] = val;

        // Normalized camelCase property key
        var normKey = normalizeHeaderKey(headerKey);
        if (normKey && !(normKey in item)) {
          item[normKey] = parseTypedValue(normKey, val);
        }
      }

      if (!item.id && (item.Id || item.ID)) item.id = item.Id || item.ID;

      result.push(item);
    }
    return result;
  } catch (err) {
    Logger.log('Erro ao ler aba ' + primaryName + ': ' + err.toString());
    return [];
  }
}

function normalizeHeaderKey(hName) {
  if (!hName) return '';
  var clean = String(hName).trim();
  var upper = clean.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

  if (upper === 'ID') return 'id';
  if (upper === 'DATA' || upper === 'DATAEMISSAO' || upper === 'DATAREGISTRO' || upper === 'DATAALVO') return 'data';
  if (upper === 'DESCRICAO' || upper === 'DESCRICAODOVEICULO' || upper === 'NOMETITULO') return 'descricao';
  if (upper === 'VALOR' || upper === 'VALORLIMITE' || upper === 'VALORESTIMADO') return 'valor';
  if (upper === 'VALORPG' || upper === 'VALORPAGO') return 'valorPago';
  if (upper === 'VALORAPG' || upper === 'VALORAPAGAR') return 'valorAPG';
  if (upper === 'BANCOID') return 'bancoId';
  if (upper === 'CARTAID' || upper === 'CARTAOID') return 'cartaoId';
  if (upper === 'FORMAPAGAMENTO') return 'formaPagamento';
  if (upper === 'TIPO') return 'tipo';
  if (upper === 'CATEGORIA') return 'categoria';
  if (upper === 'STATUS') return 'status';
  if (upper === 'KM' || upper === 'KMALVO') return 'km';
  if (upper === 'LITROS') return 'litros';
  if (upper === 'PRECOLITRO') return 'precoLitro';
  if (upper === 'COMPLETOUOTANQUE') return 'completouTanque';
  if (upper === 'KMPERCORRIDO') return 'kmPercorrido';
  if (upper === 'MEDIAKML') return 'mediaKmL';
  if (upper === 'VEICULO' || upper === 'VEICULOID') return 'veiculoId';
  if (upper === 'MOTORISTA') return 'motorista';
  if (upper === 'NOMEPOSTO') return 'nomePosto';
  if (upper === 'LOCALIZACAODOPOSTO' || upper === 'LOCAL') return 'local';
  if (upper === 'COMPROVANTEURL') return 'comprovanteUrl';
  if (upper === 'OBS' || upper === 'OBSERVACAO' || upper === 'OBSERVACOES') return 'obs';
  if (upper === 'TITULO') return 'titulo';
  if (upper === 'HORA' || upper === 'HORAS' || upper === 'HORARIO') return 'hora';
  if (upper === 'MEDICO') return 'medico';
  if (upper === 'ESPECIALIDADE') return 'especialidade';
  if (upper === 'MEDICAMENTO') return 'medicamento';
  if (upper === 'DOSAGEM') return 'dosagem';
  if (upper === 'FREQUENCIA') return 'frequencia';
  if (upper === 'PLACA') return 'placa';
  if (upper === 'RENAVAN' || upper === 'RENAMAM') return 'renavan';
  if (upper === 'CHASSI') return 'chassi';
  if (upper === 'MARCA') return 'marca';
  if (upper === 'MODELO') return 'modelo';
  if (upper === 'ANO') return 'ano';
  if (upper === 'ANOFABRICACAO') return 'anoFabricacao';
  if (upper === 'NOME' || upper === 'ITEM') return 'nome';
  if (upper === 'QUANTIDADE') return 'quantidade';
  if (upper === 'UNIDADE') return 'unidade';
  if (upper === 'COMPRADO') return 'comprado';
  if (upper === 'NIVELDERISCO' || upper === 'NIVELRISCO') return 'nivelRisco';
  if (upper === 'LATITUDE') return 'latitude';
  if (upper === 'LONGITUDE') return 'longitude';
  if (upper === 'RAIOM' || upper === 'RAIO') return 'raioMetros';
  if (upper === 'ATIVO' || upper === 'LEMBRETEATIVO') return 'ativo';
  if (upper === 'COR' || upper === 'CORDEIDENTIFICACAO') return 'cor';
  if (upper === 'ICONE') return 'icone';

  return clean.toLowerCase();
}

function parseTypedValue(key, val) {
  if (val === '' || val === null || val === undefined) return '';
  if (key === 'completouTanque' || key === 'ativo' || key === 'comprado' || key === 'lembreteAtivo') {
    return val === true || val === 'true' || String(val).toUpperCase() === 'SIM' || String(val).toUpperCase() === 'TRUE';
  }
  if (key === 'valor' || key === 'valorPago' || key === 'valorAPG' || key === 'litros' || key === 'precoLitro' || key === 'km' || key === 'quantidade' || key === 'latitude' || key === 'longitude' || key === 'raioMetros') {
    var num = Number(String(val).replace(/\./g, '').replace(',', '.'));
    return !isNaN(num) ? num : val;
  }
  return val;
}

// ------------------------------------------------------------------------------
// GRAVAÇÃO INTELIGENTE DE DADOS
// ------------------------------------------------------------------------------

function saveAllDataToSheet(ss, payload) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var report = [];

  var modules = [
    {
      name: 'Lançamentos',
      primaryName: '1_Lancamentos',
      aliases: ['Lançamentos', 'Lancamentos', 'Transacoes'],
      headers: txHeaders,
      data: payload.transactions || payload['1_Lancamentos'] || []
    },
    {
      name: 'Receitas',
      primaryName: '2_Receitas',
      aliases: ['Receitas'],
      headers: txHeaders,
      data: filterTransactions(payload.transactions, 'RECEITA')
    },
    {
      name: 'Despesas',
      primaryName: '3_Despesas',
      aliases: ['Despesas'],
      headers: txHeaders,
      data: filterTransactions(payload.transactions, 'DESPESA')
    },
    {
      name: 'Abastecimentos',
      primaryName: '4_Abastecimentos',
      aliases: ['Abastecimentos', 'Abastecimento'],
      headers: txHeaders,
      data: payload.abastecimentos || payload['4_Abastecimentos'] || filterTransactions(payload.transactions, 'ABASTECIMENTO')
    },
    {
      name: 'Contas Bancárias',
      primaryName: '5_Contas_Bancarias',
      aliases: ['5_Contas_Bancárias', 'Contas Bancárias', 'ContasBancarias', 'Contas'],
      headers: ['ID', 'Nome', 'Saldo_Inicial', 'Cor', 'Ícone', 'Tipo'],
      data: payload.bankAccounts || payload.contasBancarias || []
    },
    {
      name: 'Consultas Médicas',
      primaryName: '6_Consultas_Médicas',
      aliases: ['6_Consultas_Medicas', 'ConsultasMedicas', 'Consultas Médicas', 'Consultas', 'Appointments'],
      headers: ['ID', 'Especialidade', 'Médico', 'Data', 'Horas', 'Local', 'Lembrete_Ativo', 'Status', 'Observação'],
      data: payload.appointments || payload.consultas || payload.consultasMedicas || []
    },
    {
      name: 'Receitas Médicas',
      primaryName: '7_Receitas_Médicas',
      aliases: ['7_Receitas_Medicas', 'ReceitasMedicas', 'Receitas Médicas', 'Prescriptions'],
      headers: ['ID', 'Medicamento', 'Dosagem', 'Frequência', 'Médico', 'Data_Emissão', 'Observação'],
      data: payload.prescriptions || payload.receitasMedicas || []
    },
    {
      name: 'Infrações',
      primaryName: '8_Infracoes',
      aliases: ['Infrações', 'Infracoes', 'Multas'],
      headers: ['ID', 'Veículo', 'Data', 'Descrição', 'Valor', 'Pontos', 'Status', 'Observação'],
      data: payload.infractions || payload.infracoes || []
    },
    {
      name: 'Veículos',
      primaryName: '9_Veiculos',
      aliases: ['9_Veículos', 'Veiculos', 'Veículos', 'Veiculos Registrados', 'RegisteredVehicles'],
      headers: ['ID', 'Descrição', 'Motorista', 'Placa', 'Renavan', 'Chassi', 'Marca', 'Modelo', 'Ano', 'Ano_Fabricação'],
      data: payload.registeredVehicles || payload.veiculos || []
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
      data: payload.performedServices || payload.workshop || payload.oficina || []
    },
    {
      name: 'Manutenções Agendadas',
      primaryName: '15_Manutenções_Agendadas',
      aliases: ['15_Manutencoes_Agendadas', 'ServicosAgendados', 'Serviços Agendados', 'Manutenções Agendadas'],
      headers: ['ID', 'Data_Alvo', 'KM_Alvo', 'Descrição', 'Status', 'Prioridade', 'Oficina_Nome', 'Observações', 'VeiculoID'],
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
      name: 'Zonas de Risco',
      primaryName: '17_Zonas_De_Risco',
      aliases: ['ZonasDeRisco', 'ZonaDeRisco', 'Zona de risco', 'RiskZones'],
      headers: ['ID', 'Tipo_Registro', 'Nome_Título', 'Nível_De_Risco', 'Latitude', 'Longitude', 'Raio (m)', 'Ativo', 'Mensagem_De_Alerta', 'Data_Registro'],
      data: payload.riskZones || []
    },
    {
      name: 'Cartões de Crédito',
      primaryName: '18_Cartões_De_Crédito',
      aliases: ['18_Cartoes_De_Credito', 'Cartões de Crédito', 'CartoesDeCredito'],
      headers: ['ID', 'Nome', 'Limite', 'Fechamento', 'Vencimento', 'Cor', 'Banco_Id'],
      data: payload.creditCards || []
    },
    {
      name: 'Agenda e Compromissos',
      primaryName: '19_Agenda_E_Compromissos',
      aliases: ['Agenda', 'Compromissos', 'AgendaECompromissos'],
      headers: ['ID', 'Titulo', 'Data', 'Hora', 'Descrição', 'Cor_De_Identificação', 'Efeito_Alerta_(Piscando)', 'Lembrete_Ativo', 'Dias_De_Antecedência'],
      data: payload.compromissos || payload.agenda || []
    }
  ];

  modules.forEach(function(mod) {
    try {
      var res = writeRowsToSheet(ss, mod.primaryName, mod.aliases, mod.headers, mod.data);
      report.push({
        module: mod.name,
        sheet: mod.primaryName,
        status: 'ok',
        count: res.saved
      });
      Logger.log('Módulo [' + mod.name + '] salvo com sucesso: ' + res.saved + ' registros.');
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

function filterTransactions(txs, targetCategoryOrType) {
  if (!txs || !Array.isArray(txs)) return [];
  return txs.filter(function(t) {
    if (!t) return false;
    var cat = String(t.categoria || t.Categoria || '').toUpperCase();
    var tipo = String(t.tipo || t.Tipo || '').toUpperCase();

    if (targetCategoryOrType === 'ABASTECIMENTO') {
      return cat === 'ABASTECIMENTO' || cat === 'COMBUSTIVEL';
    }
    if (targetCategoryOrType === 'RECEITA') {
      return tipo === 'RECEITA' || cat === 'RECEITA' || cat === 'RECEITAS';
    }
    if (targetCategoryOrType === 'DESPESA') {
      return tipo === 'DESPESA' && cat !== 'ABASTECIMENTO' && cat !== 'COMBUSTIVEL';
    }
    return true;
  });
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

function writeRowsToSheet(ss, primaryName, aliases, defaultHeaders, items) {
  var sheet = findOrCreateSheet(ss, primaryName, aliases);

  var existingData = sheet.getDataRange().getValues();
  var headers = defaultHeaders;

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
  }

  sheet.clearContents();

  var rows = (items || []).map(function(item) {
    if (!item) return headers.map(function() { return ''; });

    return headers.map(function(h) {
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
  });

  var allValues = [headers].concat(rows);
  sheet.getRange(1, 1, allValues.length, headers.length).setValues(allValues);

  return { saved: items ? items.length : 0 };
}

function extractFieldValue(item, headerName) {
  if (!item || !headerName) return '';

  // 1. Busca exata pela chave no objeto
  if (headerName in item && item[headerName] !== undefined && item[headerName] !== null) {
    return item[headerName];
  }

  var hUpper = String(headerName).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

  // 2. Procura nas chaves do objeto por correspondência insensível a maiúsculas/acentos
  for (var k in item) {
    if (item.hasOwnProperty(k) && item[k] !== undefined && item[k] !== null) {
      var kUpper = String(k).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
      if (kUpper === hUpper) {
        return item[k];
      }
    }
  }

  // 3. Mapeamentos de Alias por Nome de Cabeçalho Específico
  if (hUpper === 'ID') return item.id || item.Id || item.ID || '';
  if (hUpper === 'DATA') return item.data || item.Data || item.dataEmissao || item.dataRegistro || item.dataAlvo || '';
  if (hUpper === 'DESCRICAO') return item.descricao || item['Descrição'] || item.nome || item.nomeTitulo || item.item || item.titulo || '';
  if (hUpper === 'VALOR') return item.valor !== undefined ? item.valor : (item.Valor !== undefined ? item.Valor : (item.valorEstimado !== undefined ? item.valorEstimado : 0));
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
  if (hUpper === 'LOCALIZACAODOPOSTO' || hUpper === 'LOCAL') return item.localizacaoPosto || item.local || item['Localização_Do_Posto'] || '';
  if (hUpper === 'COMPROVANTEURL') return item.comprovanteUrl || item.Comprovante_Url || '';
  if (hUpper === 'OBS' || hUpper === 'OBSERVACAO' || hUpper === 'OBSERVACOES') return item.obs || item.observacoes || item.observacao || item.OBS || '';
  if (hUpper === 'TITULO') return item.titulo || item.Titulo || item.item || '';
  if (hUpper === 'HORA' || hUpper === 'HORAS' || hUpper === 'HORARIO') return item.hora || item.horario || item.Horas || item.Horario || '';
  if (hUpper === 'MEDICO') return item.medico || item.Medico || item['Médico'] || '';
  if (hUpper === 'ESPECIALIDADE') return item.especialidade || item.Especialidade || '';
  if (hUpper === 'MEDICAMENTO') return item.medicamento || item.Medicamento || '';
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
  if (hUpper === 'FECHAMENTO') return item.fechamento || item.Fechamento || 1;
  if (hUpper === 'VENCIMENTO') return item.vencimento || item.Vencimento || 10;
  if (hUpper === 'COR' || hUpper === 'CORDEIDENTIFICACAO') return item.cor || item.Cor || item.corIdentificacao || '#22c55e';
  if (hUpper === 'ICONE') return item.icone || item.Icone || 'account_balance';
  if (hUpper === 'SALDOINICIAL') return item.saldoInicial || item.saldo || 0;
  if (hUpper === 'EFEITOALERTAPISCANDO') return (item.piscando === true || String(item.piscando).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
  if (hUpper === 'LEMBRETEATIVO') return (item.lembreteAtivo === true || String(item.lembreteAtivo).toUpperCase() === 'SIM') ? 'SIM' : 'NÃO';
  if (hUpper === 'DIASDEANTECEDENCIA') return item.diasAntecedencia || 2;

  return '';
}
