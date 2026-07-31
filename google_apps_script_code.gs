/**
 * ==============================================================================
 * CÓDIGO GOOGLE APPS SCRIPT PARA O SISTEMA DE FINANÇAS & GESTÃO (FINANÇAS GAETA)
 * ==============================================================================
 *
 * Instruções de Instalação no Google Apps Script:
 * 1. Abra sua planilha no Google Sheets (Google Drive).
 * 2. No menu superior, clique em "Extensões" > "Apps Script".
 * 3. Selecione todo o código existente no editor e apague-o.
 * 4. Cole este código atualizado na íntegra.
 * 5. Clique no ícone de salvar (Disco).
 * 6. Clique em "Implantar" (Deploy) > "Gerenciar implantações" ou "Nova implantação".
 * 7. Escolha "App da Web" (Web app), Executar como "Eu", Acesso "Qualquer pessoa".
 * 8. Implante e copie a URL do Web App.
 */

var txHeaders = [
  'Id', 'Data', 'Descrição', 'Valor', 'Valor_PG', 'Banco_Id', 'Cartão_Id', 'Forma_Pagamento',
  'Tipo', 'Categoria', 'Status', 'KM', 'Litros', 'Preço_Litro', 'Completou_O_Tanque',
  'KM_Percorrido', 'Média_(Km/L)', 'Veiculo', 'Descrição_Do_Veículo', 'Motorista',
  'Nome_Posto', 'Localização_Do_Posto', 'Comprovante_Url', 'OBS'
];

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'fetchAllData';
    var result = {};

    if (action === 'fetchTransactions') {
      result = { status: 'success', transactions: fetchTransactionsFromSheet() };
    } else {
      result = { status: 'success', data: fetchAllDataFromSheet() };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
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

    if (action === 'fetchAllData') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: fetchAllDataFromSheet() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'fetchTransactions') {
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', transactions: fetchTransactionsFromSheet() }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Ação Padrão: Gravar/Sincronizar todos os dados na planilha
    saveAllDataToSheet(postData);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Dados salvos com sucesso na planilha!',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ------------------------------------------------------------------------------
// FUNÇÕES AUXILIARES DE LEITURA
// ------------------------------------------------------------------------------

/**
 * Lê uma aba e converta-a em array de objetos associando cabeçalhos (Linha 1).
 * Reconhece a aba "Abastecimentos" (no plural) e formata Date -> "DD/MM/YYYY".
 */
function readSheetToArray(ss, sheetName) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var targetSheet = ss.getSheetByName(sheetName);
  if (!targetSheet) {
    if (sheetName === 'Abastecimentos') targetSheet = ss.getSheetByName('Abastecimento');
    else if (sheetName === 'Abastecimento') targetSheet = ss.getSheetByName('Abastecimentos');
  }
  if (!targetSheet) return [];

  var data = targetSheet.getDataRange().getValues();
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
      }
      item[headerKey] = val !== undefined ? val : '';
    }
    result.push(item);
  }

  return result;
}

function fetchTransactionsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allTx = [];
  var seenIds = {};

  var sheetsToRead = ['Abastecimentos', 'Abastecimento', 'Receitas', 'Despesas', 'Lançamentos'];

  sheetsToRead.forEach(function(sheetName) {
    var rawItems = readSheetToArray(ss, sheetName);
    if (!rawItems || rawItems.length === 0) return;

    rawItems.forEach(function(item) {
      var rawId = item.Id || item.id || item.ID;
      var idNum = Number(rawId);
      if (!rawId || isNaN(idNum) || idNum <= 0) return;

      if (seenIds[idNum]) return;
      seenIds[idNum] = true;

      var isAbastSheet = (sheetName === 'Abastecimentos' || sheetName === 'Abastecimento');
      var cat = String(item.Categoria || item.categoria || '').trim();
      if (isAbastSheet && !cat) cat = 'ABASTECIMENTO';

      var dateVal = item.Data || item.data || '';
      if (dateVal instanceof Date) {
        var y = dateVal.getFullYear();
        var m = ('0' + (dateVal.getMonth() + 1)).slice(-2);
        var d = ('0' + dateVal.getDate()).slice(-2);
        dateVal = d + '/' + m + '/' + y;
      } else {
        dateVal = String(dateVal || '').trim();
      }

      var completouVal = item.Completou_O_Tanque !== undefined ? item.Completou_O_Tanque : (item.completouOTanque !== undefined ? item.completouOTanque : item.completouTanque);
      var compTanqueStr = (completouVal === true || completouVal === 'Sim' || completouVal === 'SIM' || completouVal === '1') ? 'Sim' : 'Não';

      allTx.push({
        id: idNum,
        Id: idNum,
        data: dateVal,
        Data: dateVal,
        descricao: String(item.Descrição || item.descricao || '').trim(),
        Descrição: String(item.Descrição || item.descricao || '').trim(),
        valor: Number(item.Valor !== undefined ? item.Valor : (item.valor || 0)) || 0,
        Valor: Number(item.Valor !== undefined ? item.Valor : (item.valor || 0)) || 0,
        valorPg: item.Valor_PG !== undefined ? Number(item.Valor_PG) : (item.valorPg !== undefined ? Number(item.valorPg) : undefined),
        Valor_PG: item.Valor_PG !== undefined ? Number(item.Valor_PG) : (item.valorPg !== undefined ? Number(item.valorPg) : undefined),
        bancoId: String(item.Banco_Id || item.bancoId || '').trim(),
        Banco_Id: String(item.Banco_Id || item.bancoId || '').trim(),
        cartaoId: String(item['Cartão_Id'] || item.cartaoId || item.cartaoid || '').trim(),
        'Cartão_Id': String(item['Cartão_Id'] || item.cartaoId || item.cartaoid || '').trim(),
        formaPagamento: String(item.Forma_Pagamento || item.formaPagamento || '').trim(),
        Forma_Pagamento: String(item.Forma_Pagamento || item.formaPagamento || '').trim(),
        tipo: String(item.Tipo || item.tipo || (sheetName === 'Receitas' ? 'RECEITA' : 'DESPESA')).trim(),
        Tipo: String(item.Tipo || item.tipo || (sheetName === 'Receitas' ? 'RECEITA' : 'DESPESA')).trim(),
        categoria: cat || 'OUTROS',
        Categoria: cat || 'OUTROS',
        status: String(item.Status || item.status || 'PAGO').trim(),
        Status: String(item.Status || item.status || 'PAGO').trim(),
        km: item.KM !== undefined && item.KM !== '' ? item.KM : (item.km !== undefined ? item.km : ''),
        KM: item.KM !== undefined && item.KM !== '' ? item.KM : (item.km !== undefined ? item.km : ''),
        litros: item.Litros !== undefined && item.Litros !== '' ? item.Litros : (item.litros !== undefined ? item.litros : ''),
        Litros: item.Litros !== undefined && item.Litros !== '' ? item.Litros : (item.litros !== undefined ? item.litros : ''),
        precoLitro: item['Preço_Litro'] !== undefined && item['Preço_Litro'] !== '' ? item['Preço_Litro'] : (item.precoLitro !== undefined ? item.precoLitro : ''),
        'Preço_Litro': item['Preço_Litro'] !== undefined && item['Preço_Litro'] !== '' ? item['Preço_Litro'] : (item.precoLitro !== undefined ? item.precoLitro : ''),
        completouOTanque: compTanqueStr,
        Completou_O_Tanque: compTanqueStr,
        completouTanque: compTanqueStr === 'Sim',
        kmPercorrido: item.KM_Percorrido !== undefined && item.KM_Percorrido !== '' ? item.KM_Percorrido : (item.kmPercorrido !== undefined ? item.kmPercorrido : ''),
        KM_Percorrido: item.KM_Percorrido !== undefined && item.KM_Percorrido !== '' ? item.KM_Percorrido : (item.kmPercorrido !== undefined ? item.kmPercorrido : ''),
        mediaKmL: item['Média_(Km/L)'] !== undefined && item['Média_(Km/L)'] !== '' ? item['Média_(Km/L)'] : (item.mediaKmL !== undefined ? item.mediaKmL : ''),
        'Média_(Km/L)': item['Média_(Km/L)'] !== undefined && item['Média_(Km/L)'] !== '' ? item['Média_(Km/L)'] : (item.mediaKmL !== undefined ? item.mediaKmL : ''),
        veiculo: String(item.Veiculo || item.veiculo || '').trim(),
        Veiculo: String(item.Veiculo || item.veiculo || '').trim(),
        descricaoVeiculo: String(item['Descrição_Do_Veículo'] || item.descricaoDoVeiculo || item.descricaoVeiculo || '').trim(),
        descricaoDoVeiculo: String(item['Descrição_Do_Veículo'] || item.descricaoDoVeiculo || item.descricaoVeiculo || '').trim(),
        'Descrição_Do_Veículo': String(item['Descrição_Do_Veículo'] || item.descricaoDoVeiculo || item.descricaoVeiculo || '').trim(),
        motorista: String(item.Motorista || item.motorista || '').trim(),
        Motorista: String(item.Motorista || item.motorista || '').trim(),
        nomePosto: String(item.Nome_Posto || item.nomePosto || '').trim(),
        Nome_Posto: String(item.Nome_Posto || item.nomePosto || '').trim(),
        localizacaoPosto: String(item['Localização_Do_Posto'] || item.localizacaoPosto || '').trim(),
        'Localização_Do_Posto': String(item['Localização_Do_Posto'] || item.localizacaoPosto || '').trim(),
        comprovanteUrl: String(item.Comprovante_Url || item.comprovanteUrl || '').trim(),
        Comprovante_Url: String(item.Comprovante_Url || item.comprovanteUrl || '').trim(),
        obs: String(item.OBS || item.obs || '').trim(),
        OBS: String(item.OBS || item.obs || '').trim()
      });
    });
  });

  return allTx;
}

function fetchAllDataFromSheet() {
  var transactions = fetchTransactionsFromSheet();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  return {
    transactions: transactions,
    riskZones: readGenericSheet(ss, 'ZonasDeRisco', ['id', 'titulo', 'descricao', 'nivel', 'localizacao', 'data']),
    appointments: readGenericSheet(ss, 'ConsultasMedicas', ['id', 'especialidade', 'medico', 'data', 'horario', 'local', 'valor', 'status', 'obs']),
    prescriptions: readGenericSheet(ss, 'ReceitasMedicas', ['id', 'medicamento', 'dosagem', 'frequencia', 'medico', 'dataEmissao', 'obs']),
    compromissos: readGenericSheet(ss, 'Agenda', ['id', 'titulo', 'data', 'horario', 'categoria', 'status', 'lembreteAtivo', 'obs']),
    registeredVehicles: readGenericSheet(ss, 'Veiculos', ['id', 'descricao', 'motorista', 'placa', 'renavam', 'chassi', 'marca', 'modelo', 'ano']),
    performedServices: readGenericSheet(ss, 'ServicosRealizados', ['id', 'veiculo', 'data', 'servico', 'oficina', 'valor', 'km', 'obs']),
    scheduledServices: readGenericSheet(ss, 'ServicosAgendados', ['id', 'veiculo', 'data', 'servico', 'oficina', 'valorEstimado', 'status', 'obs']),
    groceryItems: readGenericSheet(ss, 'ListaMercado', ['id', 'item', 'categoria', 'quantidade', 'unidade', 'valorEstimado', 'comprado'])
  };
}

function readGenericSheet(ss, sheetName, fields) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var items = [];
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;

    var item = {};
    for (var j = 0; j < fields.length; j++) {
      var val = row[j] !== undefined ? row[j] : '';
      if (val instanceof Date) {
        var y = val.getFullYear();
        var m = ('0' + (val.getMonth() + 1)).slice(-2);
        var d = ('0' + val.getDate()).slice(-2);
        val = d + '/' + m + '/' + y;
      }
      item[fields[j]] = val;
    }
    items.push(item);
  }
  return items;
}

// ------------------------------------------------------------------------------
// FUNÇÕES AUXILIARES DE GRAVAÇÃO
// ------------------------------------------------------------------------------

/**
 * Monte cada linha respeitando rigorosamente os índices A (1) até X (24),
 * utilizando a Linha 1 (cabeçalho) como referência de mapeamento.
 */
function upsertArrayToSheet(ss, sheetName, headers, items) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();

  var targetName = sheetName;
  if (targetName === 'Abastecimento') targetName = 'Abastecimentos';

  var sheet = ss.getSheetByName(targetName);
  if (!sheet) {
    sheet = ss.insertSheet(targetName);
  }

  var sheetHeaders = headers || txHeaders;
  sheet.clearContents();

  var rows = (items || []).map(function(item) {
    if (Array.isArray(item)) return item;

    return sheetHeaders.map(function(header) {
      var hNorm = String(header || '').trim();
      var hUpper = hNorm.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");

      if (hNorm === 'Id' || hUpper === 'ID') return item.Id !== undefined ? item.Id : (item.id !== undefined ? item.id : '');
      if (hNorm === 'Data' || hUpper === 'DATA') {
        var dVal = item.Data !== undefined ? item.Data : (item.data !== undefined ? item.data : '');
        if (dVal instanceof Date) {
          var y = dVal.getFullYear();
          var m = ('0' + (dVal.getMonth() + 1)).slice(-2);
          var d = ('0' + dVal.getDate()).slice(-2);
          return d + '/' + m + '/' + y;
        }
        return dVal || '';
      }
      if (hNorm === 'Descrição' || hUpper === 'DESCRICAO') return item['Descrição'] !== undefined ? item['Descrição'] : (item.descricao !== undefined ? item.descricao : '');
      if (hNorm === 'Valor' || hUpper === 'VALOR') return item.Valor !== undefined ? item.Valor : (item.valor !== undefined ? item.valor : 0);
      if (hNorm === 'Valor_PG' || hUpper === 'VALORPG') return item.Valor_PG !== undefined ? item.Valor_PG : (item.valorPg !== undefined ? item.valorPg : 0);
      if (hNorm === 'Banco_Id' || hUpper === 'BANCOID') return item.Banco_Id !== undefined ? item.Banco_Id : (item.bancoId !== undefined ? item.bancoId : '');
      if (hNorm === 'Cartão_Id' || hUpper === 'CARTAID') return item['Cartão_Id'] !== undefined ? item['Cartão_Id'] : (item.cartaoId !== undefined ? item.cartaoId : (item.cartaoid !== undefined ? item.cartaoid : ''));
      if (hNorm === 'Forma_Pagamento' || hUpper === 'FORMAPAGAMENTO') return item.Forma_Pagamento !== undefined ? item.Forma_Pagamento : (item.formaPagamento !== undefined ? item.formaPagamento : '');
      if (hNorm === 'Tipo' || hUpper === 'TIPO') return item.Tipo !== undefined ? item.Tipo : (item.tipo !== undefined ? item.tipo : '');
      if (hNorm === 'Categoria' || hUpper === 'CATEGORIA') return item.Categoria !== undefined ? item.Categoria : (item.categoria !== undefined ? item.categoria : '');
      if (hNorm === 'Status' || hUpper === 'STATUS') return item.Status !== undefined ? item.Status : (item.status !== undefined ? item.status : 'PAGO');
      if (hNorm === 'KM' || hUpper === 'KM') return item.KM !== undefined ? item.KM : (item.km !== undefined ? item.km : '');
      if (hNorm === 'Litros' || hUpper === 'LITROS') return item.Litros !== undefined ? item.Litros : (item.litros !== undefined ? item.litros : '');
      if (hNorm === 'Preço_Litro' || hUpper === 'PRECOLITRO') return item['Preço_Litro'] !== undefined ? item['Preço_Litro'] : (item.precoLitro !== undefined ? item.precoLitro : '');
      if (hNorm === 'Completou_O_Tanque' || hUpper === 'COMPLETOUOTANQUE') {
        var cVal = item.Completou_O_Tanque !== undefined ? item.Completou_O_Tanque : (item.completouOTanque !== undefined ? item.completouOTanque : item.completouTanque);
        if (cVal === true || cVal === 'Sim' || cVal === 'SIM' || cVal === '1') return 'Sim';
        if (cVal === false || cVal === 'Não' || cVal === 'NAO' || cVal === '0') return 'Não';
        return cVal || '';
      }
      if (hNorm === 'KM_Percorrido' || hUpper === 'KMPERCORRIDO') return item.KM_Percorrido !== undefined ? item.KM_Percorrido : (item.kmPercorrido !== undefined ? item.kmPercorrido : '');
      if (hNorm === 'Média_(Km/L)' || hUpper === 'MEDIAKML') return item['Média_(Km/L)'] !== undefined ? item['Média_(Km/L)'] : (item.mediaKmL !== undefined ? item.mediaKmL : '');
      if (hNorm === 'Veiculo' || hUpper === 'VEICULO') return item.Veiculo !== undefined ? item.Veiculo : (item.veiculo !== undefined ? item.veiculo : '');
      if (hNorm === 'Descrição_Do_Veículo' || hUpper === 'DESCRICAODOVEICULO') return item['Descrição_Do_Veículo'] !== undefined ? item['Descrição_Do_Veículo'] : (item.descricaoDoVeiculo !== undefined ? item.descricaoDoVeiculo : (item.descricaoVeiculo !== undefined ? item.descricaoVeiculo : ''));
      if (hNorm === 'Motorista' || hUpper === 'MOTORISTA') return item.Motorista !== undefined ? item.Motorista : (item.motorista !== undefined ? item.motorista : '');
      if (hNorm === 'Nome_Posto' || hUpper === 'NOMEPOSTO') return item.Nome_Posto !== undefined ? item.Nome_Posto : (item.nomePosto !== undefined ? item.nomePosto : '');
      if (hNorm === 'Localização_Do_Posto' || hUpper === 'LOCALIZACAODOPOSTO') return item['Localização_Do_Posto'] !== undefined ? item['Localização_Do_Posto'] : (item.localizacaoPosto !== undefined ? item.localizacaoPosto : '');
      if (hNorm === 'Comprovante_Url' || hUpper === 'COMPROVANTEURL') return item.Comprovante_Url !== undefined ? item.Comprovante_Url : (item.comprovanteUrl !== undefined ? item.comprovanteUrl : '');
      if (hNorm === 'OBS' || hUpper === 'OBS') return item.OBS !== undefined ? item.OBS : (item.obs !== undefined ? item.obs : '');

      return item[header] !== undefined ? item[header] : '';
    });
  });

  var allValues = [sheetHeaders];
  if (rows && rows.length > 0) {
    allValues = allValues.concat(rows);
  }

  sheet.getRange(1, 1, allValues.length, sheetHeaders.length).setValues(allValues);
}

function saveAllDataToSheet(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var transactions = payload.transactions || [];
  var receitas = [];
  var despesas = [];
  var abastecimentos = [];

  transactions.forEach(function(t) {
    if (!t) return;
    var cat = String(t.categoria || t.Categoria || '').toUpperCase();
    var tipo = String(t.tipo || t.Tipo || '').toUpperCase();
    var desc = String(t.descricao || t.Descrição || '').toUpperCase();

    if (cat.indexOf('ABASTEC') !== -1 || cat.indexOf('COMBUST') !== -1 || desc.indexOf('POSTO') !== -1) {
      abastecimentos.push(t);
    } else if (tipo.indexOf('RECEIT') !== -1 || cat.indexOf('RECEIT') !== -1) {
      receitas.push(t);
    } else {
      despesas.push(t);
    }
  });

  upsertArrayToSheet(ss, 'Lançamentos', txHeaders, transactions);
  upsertArrayToSheet(ss, 'Receitas', txHeaders, receitas);
  upsertArrayToSheet(ss, 'Despesas', txHeaders, despesas);
  upsertArrayToSheet(ss, 'Abastecimentos', txHeaders, abastecimentos);

  // Gravar Zonas de Risco
  var zList = payload.riskZones || [];
  writeRowsToSheet(ss, 'ZonasDeRisco', ['ID', 'Título', 'Descrição', 'Nível', 'Localização', 'Data'], zList.map(function(z) {
    return [z.id, z.titulo, z.descricao, z.nivel, z.localizacao, z.data];
  }));

  // Gravar Consultas Médicas
  var cList = payload.appointments || [];
  writeRowsToSheet(ss, 'ConsultasMedicas', ['ID', 'Especialidade', 'Médico', 'Data', 'Horário', 'Local', 'Valor', 'Status', 'Observação'], cList.map(function(a) {
    return [a.id, a.especialidade, a.medico, a.data, a.horario, a.local, a.valor, a.status, a.obs];
  }));

  // Gravar Receitas Médicas
  var rList = payload.prescriptions || [];
  writeRowsToSheet(ss, 'ReceitasMedicas', ['ID', 'Medicamento', 'Dosagem', 'Frequência', 'Médico', 'Data Emissão', 'Observação'], rList.map(function(p) {
    return [p.id, p.medicamento, p.dosagem, p.frequencia, p.medico, p.dataEmissao, p.obs];
  }));

  // Gravar Agenda / Compromissos
  var aList = payload.compromissos || [];
  writeRowsToSheet(ss, 'Agenda', ['ID', 'Título', 'Data', 'Horário', 'Categoria', 'Status', 'Lembrete Ativo', 'Observação'], aList.map(function(c) {
    return [c.id, c.titulo, c.data, c.horario, c.categoria, c.status, c.lembreteAtivo ? 'SIM' : 'NÃO', c.obs];
  }));

  // Gravar Veículos
  var vList = payload.registeredVehicles || [];
  writeRowsToSheet(ss, 'Veiculos', ['ID', 'Descrição', 'Motorista', 'Placa', 'Renavam', 'Chassi', 'Marca', 'Modelo', 'Ano'], vList.map(function(v) {
    return [v.id, v.descricao, v.motorista, v.placa, v.renavam, v.chassi, v.marca, v.modelo, v.ano];
  }));

  // Gravar Serviços Realizados
  var pServ = payload.performedServices || [];
  writeRowsToSheet(ss, 'ServicosRealizados', ['ID', 'Veículo', 'Data', 'Serviço', 'Oficina', 'Valor', 'KM', 'Observação'], pServ.map(function(s) {
    return [s.id, s.veiculo, s.data, s.servico, s.oficina, s.valor, s.km, s.obs];
  }));

  // Gravar Serviços Agendados
  var sServ = payload.scheduledServices || [];
  writeRowsToSheet(ss, 'ServicosAgendados', ['ID', 'Veículo', 'Data', 'Serviço', 'Oficina', 'Valor Estimado', 'Status', 'Observação'], sServ.map(function(s) {
    return [s.id, s.veiculo, s.data, s.servico, s.oficina, s.valorEstimado, s.status, s.obs];
  }));

  // Gravar Lista de Mercado
  var gList = payload.groceryItems || [];
  writeRowsToSheet(ss, 'ListaMercado', ['ID', 'Item', 'Categoria', 'Quantidade', 'Unidade', 'Valor Estimado', 'Comprado'], gList.map(function(g) {
    return [g.id, g.item, g.categoria, g.quantidade, g.unidade, g.valorEstimado, g.comprado ? 'SIM' : 'NÃO'];
  }));
}

function writeRowsToSheet(ss, sheetName, headers, rows) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }

  var allValues = [headers];
  if (rows && rows.length > 0) {
    allValues = allValues.concat(rows);
  }

  sheet.getRange(1, 1, allValues.length, headers.length).setValues(allValues);
}
