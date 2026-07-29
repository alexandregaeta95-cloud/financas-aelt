/**
 * ==============================================================================
 * CÓDIGO GOOGLE APPS SCRIPT PARA O SISTEMA DE FINANÇAS & GESTÃO (FINANÇAS GAETA)
 * ==============================================================================
 *
 * Instruções de Instalação no Google Apps Script:
 * 1. Abra sua planilha no Google Sheets (Google Drive).
 * 2. No menu superior, clique em "Extensões" > "Apps Script".
 * 3. Selecione todo o código existente no editor (ex: myFunction) e apague-o.
 * 4. Cole o código abaixo na íntegra.
 * 5. Clique no ícone de salvar (Disco) no topo.
 * 6. Clique no botão azul "Implantar" (Deploy) > "Nova implantação" (New deployment).
 * 7. No ícone de engrenagem, escolha "App da Web" (Web app).
 * 8. Preencha os campos:
 *    - Descrição: Finanças Gaeta Sync API
 *    - Executar como: "Eu" (Me)
 *    - Quem tem acesso: "Qualquer pessoa" (Anyone)
 * 9. Clique em "Implantar", autorize as permissões da sua conta do Google.
 * 10. Copie a "URL do App da Web" gerada (ex: https://script.google.com/macros/s/.../exec) e cole no aplicativo em "Conectar Drive".
 */

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

function fetchTransactionsFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var allTx = [];

  var sheetsToRead = ['Receitas', 'Despesas', 'Abastecimentos', 'Abastecimento'];
  var readSheetNames = {};

  sheetsToRead.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) return;

    var headers = data[0].map(function(h) { return String(h || '').trim().toUpperCase(); });
    var idIdx = headers.indexOf('ID');
    var dataIdx = headers.indexOf('DATA');
    var descIdx = headers.findIndex(function(h) { return h.indexOf('DESCRIC') !== -1; });
    var catIdx = headers.indexOf('CATEGORIA');
    var valIdx = headers.indexOf('VALOR');
    var statusIdx = headers.indexOf('STATUS');
    var obsIdx = headers.findIndex(function(h) { return h.indexOf('OBS') !== -1; });
    var kmIdx = headers.indexOf('KM');
    var litrosIdx = headers.indexOf('LITROS');
    var precoLitroIdx = headers.findIndex(function(h) { return h.indexOf('PRECO') !== -1 || h.indexOf('PREÇO') !== -1; });
    var veiculoIdx = headers.findIndex(function(h) { return h.indexOf('VEICULO') !== -1 || h.indexOf('VEÍCULO') !== -1; });
    var valorPgIdx = headers.findIndex(function(h) { return h.indexOf('VALOR_PG') !== -1 || h.indexOf('VALOR PG') !== -1; });
    var completouTanqueIdx = headers.findIndex(function(h) { return h.indexOf('COMPLETOU') !== -1; });
    var kmPercorridoIdx = headers.findIndex(function(h) { return h.indexOf('KM_PERCORRIDO') !== -1 || h.indexOf('KM PERCORRIDO') !== -1; });
    var mediaKmLIdx = headers.findIndex(function(h) { return h.indexOf('MEDIA') !== -1; });
    var nomePostoIdx = headers.findIndex(function(h) { return h.indexOf('NOME_POSTO') !== -1 || (h.indexOf('POSTO') !== -1 && h.indexOf('LOCALIZACAO') === -1); });
    var localizacaoPostoIdx = headers.findIndex(function(h) { return h.indexOf('LOCALIZACAO') !== -1; });
    var motoristaIdx = headers.indexOf('MOTORISTA');
    var formaPgIdx = headers.findIndex(function(h) { return h.indexOf('FORMA') !== -1; });

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row || row.length === 0) continue;

      var rawId = idIdx !== -1 ? row[idIdx] : null;
      var idNum = Number(rawId);
      if (!rawId || isNaN(idNum) || idNum <= 0) continue;

      // Avoid duplicate reads if transaction was already processed from another sheet
      if (readSheetNames[idNum]) continue;
      readSheetNames[idNum] = true;

      var isAbastSheet = (sheetName === 'Abastecimentos' || sheetName === 'Abastecimento');
      var tipo = (sheetName === 'Receitas') ? 'RECEITA' : 'DESPESA';
      var cat = catIdx !== -1 ? String(row[catIdx] || '').trim() : '';
      if (isAbastSheet && !cat) cat = 'ABASTECIMENTO';

      var desc = descIdx !== -1 ? String(row[descIdx] || '').trim() : '';
      var val = valIdx !== -1 ? Math.abs(parseFloat(row[valIdx]) || 0) : 0;
      var status = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : 'PAGO';

      var dateStr = '';
      if (dataIdx !== -1 && row[dataIdx]) {
        var dVal = row[dataIdx];
        if (dVal instanceof Date) {
          var y = dVal.getFullYear();
          var m = ('0' + (dVal.getMonth() + 1)).slice(-2);
          var d = ('0' + dVal.getDate()).slice(-2);
          dateStr = d + '/' + m + '/' + y;
        } else {
          dateStr = String(dVal).trim();
        }
      }

      var rawKm = kmIdx !== -1 ? parseFloat(row[kmIdx]) : NaN;
      var rawLitros = litrosIdx !== -1 ? parseFloat(row[litrosIdx]) : NaN;
      var rawPrecoLitro = precoLitroIdx !== -1 ? parseFloat(row[precoLitroIdx]) : NaN;
      var rawValorPg = valorPgIdx !== -1 ? parseFloat(row[valorPgIdx]) : NaN;
      var rawKmPercorrido = kmPercorridoIdx !== -1 ? parseFloat(row[kmPercorridoIdx]) : NaN;
      var rawMediaKmL = mediaKmLIdx !== -1 ? parseFloat(row[mediaKmLIdx]) : NaN;

      allTx.push({
        id: idNum,
        data: dateStr,
        descricao: desc,
        categoria: cat || 'OUTROS',
        valor: val,
        tipo: tipo,
        status: status || 'PAGO',
        obs: obsIdx !== -1 ? String(row[obsIdx] || '').trim() : '',
        km: !isNaN(rawKm) ? rawKm : (kmIdx !== -1 ? String(row[kmIdx] || '').trim() : ''),
        litros: !isNaN(rawLitros) ? rawLitros : (litrosIdx !== -1 ? String(row[litrosIdx] || '').trim() : ''),
        precoLitro: !isNaN(rawPrecoLitro) ? rawPrecoLitro : (precoLitroIdx !== -1 ? String(row[precoLitroIdx] || '').trim() : ''),
        veiculo: veiculoIdx !== -1 ? String(row[veiculoIdx] || '').trim() : '',
        valorPg: !isNaN(rawValorPg) ? rawValorPg : undefined,
        completouTanque: completouTanqueIdx !== -1 ? (String(row[completouTanqueIdx] || '').trim().toUpperCase() === 'SIM') : undefined,
        kmPercorrido: !isNaN(rawKmPercorrido) ? rawKmPercorrido : undefined,
        mediaKmL: !isNaN(rawMediaKmL) ? rawMediaKmL : undefined,
        nomePosto: nomePostoIdx !== -1 ? String(row[nomePostoIdx] || '').trim() : '',
        localizacaoPosto: localizacaoPostoIdx !== -1 ? String(row[localizacaoPostoIdx] || '').trim() : '',
        motorista: motoristaIdx !== -1 ? String(row[motoristaIdx] || '').trim() : '',
        formaPagamento: formaPgIdx !== -1 ? String(row[formaPgIdx] || '').trim() : ''
      });
    }
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

function saveAllDataToSheet(payload) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var txHeaders = [
    'ID', 'DATA', 'DESCRICAO', 'VALOR', 'TIPO', 'CATEGORIA', 'STATUS', 'BANCO_ID', 'FORMA_PAGAMENTO', 'OBS', 'COMPROVANTE_URL', 'KM', 'LITROS', 'PRECO_LITRO', 'VEICULO', 'VALOR_PG', 'COMPLETOU_O_TANQUE', 'KM_PERCORRIDO', 'MEDIA_KM_L', 'NOME_POSTO', 'LOCALIZACAO_DO_POSTO', 'MOTORISTA'
  ];

  var mapTxToRow = function(t) {
    if (!t) return [];
    var valNum = typeof t.valor === 'number' && !isNaN(t.valor) ? t.valor : parseFloat(String(t.valor || 0).replace(',', '.'));
    var valPgNum = typeof t.valorPg === 'number' && !isNaN(t.valorPg) ? t.valorPg : (t.status === 'PAGO' ? valNum : 0);
    return [
      t.id || '',
      t.data || '',
      t.descricao || '',
      isNaN(valNum) ? 0 : valNum,
      t.tipo || '',
      t.categoria || '',
      t.status || 'PAGO',
      t.bancoId || '',
      t.formaPagamento || '',
      t.obs || '',
      t.comprovanteUrl || '',
      t.km || '',
      t.litros || '',
      t.precoLitro || '',
      t.veiculo || t.descricaoVeiculo || '',
      isNaN(valPgNum) ? 0 : valPgNum,
      t.completouTanque ? 'Sim' : '',
      t.kmPercorrido || '',
      t.media || '',
      t.nomePosto || '',
      t.localizacaoPosto || '',
      t.motorista || ''
    ];
  };

  var transactions = payload.transactions || [];
  var receitas = [];
  var despesas = [];
  var abastecimentos = [];

  transactions.forEach(function(t) {
    if (!t) return;
    var cat = String(t.categoria || '').toUpperCase();
    var tipo = String(t.tipo || '').toUpperCase();
    var desc = String(t.descricao || '').toUpperCase();

    if (cat.indexOf('ABASTEC') !== -1 || cat.indexOf('COMBUST') !== -1 || desc.indexOf('POSTO') !== -1) {
      abastecimentos.push(t);
    } else if (tipo.indexOf('RECEIT') !== -1 || cat.indexOf('RECEIT') !== -1) {
      receitas.push(t);
    } else {
      despesas.push(t);
    }
  });

  writeRowsToSheet(ss, 'Lançamentos', txHeaders, transactions.map(mapTxToRow));
  writeRowsToSheet(ss, 'Receitas', txHeaders, receitas.map(mapTxToRow));
  writeRowsToSheet(ss, 'Despesas', txHeaders, despesas.map(mapTxToRow));
  writeRowsToSheet(ss, 'Abastecimentos', txHeaders, abastecimentos.map(mapTxToRow));

  // 4. Gravar Zonas de Risco
  var zList = payload.riskZones || [];
  writeRowsToSheet(ss, 'ZonasDeRisco', ['ID', 'Título', 'Descrição', 'Nível', 'Localização', 'Data'], zList.map(function(z) {
    return [z.id, z.titulo, z.descricao, z.nivel, z.localizacao, z.data];
  }));

  // 5. Gravar Consultas Médicas
  var cList = payload.appointments || [];
  writeRowsToSheet(ss, 'ConsultasMedicas', ['ID', 'Especialidade', 'Médico', 'Data', 'Horário', 'Local', 'Valor', 'Status', 'Observação'], cList.map(function(a) {
    return [a.id, a.especialidade, a.medico, a.data, a.horario, a.local, a.valor, a.status, a.obs];
  }));

  // 6. Gravar Receitas Médicas
  var rList = payload.prescriptions || [];
  writeRowsToSheet(ss, 'ReceitasMedicas', ['ID', 'Medicamento', 'Dosagem', 'Frequência', 'Médico', 'Data Emissão', 'Observação'], rList.map(function(p) {
    return [p.id, p.medicamento, p.dosagem, p.frequencia, p.medico, p.dataEmissao, p.obs];
  }));

  // 7. Gravar Agenda / Compromissos
  var aList = payload.compromissos || [];
  writeRowsToSheet(ss, 'Agenda', ['ID', 'Título', 'Data', 'Horário', 'Categoria', 'Status', 'Lembrete Ativo', 'Observação'], aList.map(function(c) {
    return [c.id, c.titulo, c.data, c.horario, c.categoria, c.status, c.lembreteAtivo ? 'SIM' : 'NÃO', c.obs];
  }));

  // 8. Gravar Veículos
  var vList = payload.registeredVehicles || [];
  writeRowsToSheet(ss, 'Veiculos', ['ID', 'Descrição', 'Motorista', 'Placa', 'Renavam', 'Chassi', 'Marca', 'Modelo', 'Ano'], vList.map(function(v) {
    return [v.id, v.descricao, v.motorista, v.placa, v.renavam, v.chassi, v.marca, v.modelo, v.ano];
  }));

  // 9. Gravar Serviços Realizados
  var pServ = payload.performedServices || [];
  writeRowsToSheet(ss, 'ServicosRealizados', ['ID', 'Veículo', 'Data', 'Serviço', 'Oficina', 'Valor', 'KM', 'Observação'], pServ.map(function(s) {
    return [s.id, s.veiculo, s.data, s.servico, s.oficina, s.valor, s.km, s.obs];
  }));

  // 10. Gravar Serviços Agendados
  var sServ = payload.scheduledServices || [];
  writeRowsToSheet(ss, 'ServicosAgendados', ['ID', 'Veículo', 'Data', 'Serviço', 'Oficina', 'Valor Estimado', 'Status', 'Observação'], sServ.map(function(s) {
    return [s.id, s.veiculo, s.data, s.servico, s.oficina, s.valorEstimado, s.status, s.obs];
  }));

  // 11. Gravar Lista de Mercado
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
