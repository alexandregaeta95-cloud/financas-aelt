import React, { useState, useEffect } from 'react';

interface GoogleDriveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (urlOrToken: string) => Promise<void>;
  currentValue?: string;
}

const APPS_SCRIPT_CODE = `function doPost(e) {
  try {
    var contents = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var data = JSON.parse(contents);
    var action = data.action || 'syncData';
    var ssId = (data && data.spreadsheetId) || (e && e.parameter && e.parameter.spreadsheetId);
    var ss;
    if (ssId && String(ssId).trim() !== '' && ssId !== 'active_sheet') {
      try {
        ss = SpreadsheetApp.openById(ssId);
      } catch (errOpen) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (action === 'syncData') {
      var txHeaders = [
        'Id', 'Data', 'Descrição', 'Valor', 'Valor_PG', 'Banco_Id', 'Cartão_Id', 'Forma_Pagamento',
        'Tipo', 'Categoria', 'Status', 'KM', 'Litros', 'Preço_Litro', 'Completou_O_Tanque',
        'KM_Percorrido', 'Média_(Km/L)', 'Veiculo', 'Descrição_Do_Veículo', 'Motorista',
        'Nome_Posto', 'Localização_Do_Posto', 'Comprovante_Url', 'OBS'
      ];

      if (data.transactions && Array.isArray(data.transactions)) {
        writeArrayToSheet(ss, 'Lançamentos', data.transactions, txHeaders);

        var receitas = data.transactions.filter(function(t) {
          if (!t) return false;
          var tipo = (t.tipo ?? '').toString().toUpperCase();
          var cat = (t.categoria ?? '').toString().toUpperCase();
          return tipo === 'RECEITA' || tipo === 'RECEBIDO' || cat === 'RECEITA' || cat === 'RECEITAS' || cat === 'ENTRADA';
        });

        var abastecimentos = data.transactions.filter(function(t) {
          if (!t) return false;
          var cat = (t.categoria ?? '').toString().toUpperCase();
          return cat === 'ABASTECIMENTO' || cat === 'COMBUSTIVEL';
        });

        var despesas = data.transactions.filter(function(t) {
          if (!t) return false;
          var tipo = (t.tipo ?? '').toString().toUpperCase();
          var cat = (t.categoria ?? '').toString().toUpperCase();
          var isRec = tipo === 'RECEITA' || tipo === 'RECEBIDO' || cat === 'RECEITA' || cat === 'RECEITAS' || cat === 'ENTRADA';
          var isAbast = cat === 'ABASTECIMENTO' || cat === 'COMBUSTIVEL';
          return !isRec && !isAbast;
        });

        writeArrayToSheet(ss, 'Receitas', receitas, txHeaders);
        writeArrayToSheet(ss, 'Despesas', despesas, txHeaders);
        writeArrayToSheet(ss, 'Abastecimentos', abastecimentos, txHeaders);
      }

      if (data.bankAccounts && Array.isArray(data.bankAccounts)) {
        writeArrayToSheet(ss, 'Contas Bancárias', data.bankAccounts, ['id', 'nome', 'saldoInicial', 'cor', 'icone', 'tipo']);
      }
      if (data.creditCards && Array.isArray(data.creditCards)) {
        writeArrayToSheet(ss, 'Cartões de Crédito', data.creditCards, ['id', 'nome', 'limite', 'fechamento', 'vencimento', 'cor', 'bancoId']);
      }
      if (data.riskZones && Array.isArray(data.riskZones)) {
        writeArrayToSheet(ss, 'Zona de risco', data.riskZones, ['id', 'nomeLocal', 'nivelRisco', 'latitude', 'longitude', 'raioMetros', 'ativo', 'observacao']);
      }
      if (data.appointments && Array.isArray(data.appointments)) {
        writeArrayToSheet(ss, 'Consultas', data.appointments, ['id', 'patientName', 'doctorName', 'specialty', 'date', 'time', 'status', 'notes']);
      }
      if (data.prescriptions && Array.isArray(data.prescriptions)) {
        writeArrayToSheet(ss, 'Receitas Médicas', data.prescriptions, ['id', 'patientName', 'doctorName', 'crm', 'medications', 'date', 'observations']);
      }
      if (data.compromissos && Array.isArray(data.compromissos)) {
        writeArrayToSheet(ss, 'Compromissos', data.compromissos, ['id', 'titulo', 'data', 'horario', 'categoria', 'concluido', 'descricao']);
      }
      if (data.registeredVehicles && Array.isArray(data.registeredVehicles)) {
        writeArrayToSheet(ss, 'Veículos Registrados', data.registeredVehicles, ['id', 'nome', 'marca', 'modelo', 'placa', 'ano', 'combustivel', 'kmAtual']);
      }
      if (data.performedServices && Array.isArray(data.performedServices)) {
        writeArrayToSheet(ss, 'Oficina', data.performedServices, ['id', 'data', 'descricao', 'km', 'valor', 'oficinaNome', 'comprovanteUrl', 'observacoes', 'veiculoId']);
      }
      if (data.scheduledServices && Array.isArray(data.scheduledServices)) {
        writeArrayToSheet(ss, 'Manutenções Agendadas', data.scheduledServices, ['id', 'dataAlvo', 'kmAlvo', 'descricao', 'status', 'prioridade', 'observacoes', 'veiculoId']);
      }
      if (data.groceryItems && Array.isArray(data.groceryItems)) {
        writeArrayToSheet(ss, 'ListaMercado', data.groceryItems, ['id', 'nome', 'categoria', 'quantidade', 'valorEstimado', 'comprado', 'observacao']);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Sincronizado com sucesso' })).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var action = (e && e.parameter && e.parameter.action) || 'fetchAllData';
    var ssId = (e && e.parameter && e.parameter.spreadsheetId) ? e.parameter.spreadsheetId : null;
    var ss;
    if (ssId && String(ssId).trim() !== '' && ssId !== 'active_sheet') {
      try {
        ss = SpreadsheetApp.openById(ssId);
      } catch (errOpen) {
        ss = SpreadsheetApp.getActiveSpreadsheet();
      }
    } else {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    }

    if (action === 'fetchAllData' || action === 'fetchTransactions') {
      var txs = readSheetToArray(ss, 'Lançamentos');
      var recs = readSheetToArray(ss, 'Receitas');
      var desps = readSheetToArray(ss, 'Despesas');
      var abasts = readSheetToArray(ss, 'Abastecimentos');

      var txMap = {};
      var allTxs = txs.concat(recs, desps, abasts);
      allTxs.forEach(function(item) {
        if (item && item.id) {
          txMap[item.id] = item;
        }
      });

      var transactions = [];
      for (var k in txMap) {
        transactions.push(txMap[k]);
      }

      var bankAccounts = readSheetToArray(ss, 'Contas Bancárias');
      var creditCards = readSheetToArray(ss, 'Cartões de Crédito');
      var riskZones = readSheetToArray(ss, 'Zona de risco');
      var appointments = readSheetToArray(ss, 'Consultas');
      var prescriptions = readSheetToArray(ss, 'Receitas Médicas');
      var compromissos = readSheetToArray(ss, 'Compromissos');
      var registeredVehicles = readSheetToArray(ss, 'Veículos Registrados');
      var performedServices = readSheetToArray(ss, 'Oficina');
      var scheduledServices = readSheetToArray(ss, 'Manutenções Agendadas');
      var groceryItems = readSheetToArray(ss, 'ListaMercado');

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: {
          transactions: transactions,
          bankAccounts: bankAccounts,
          creditCards: creditCards,
          riskZones: riskZones,
          appointments: appointments,
          prescriptions: prescriptions,
          compromissos: compromissos,
          registeredVehicles: registeredVehicles,
          performedServices: performedServices,
          scheduledServices: scheduledServices,
          groceryItems: groceryItems
        },
        transactions: transactions
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'online' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function writeArrayToSheet(ss, sheetName, items, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }
  sheet.appendRow(headers);
  if (!items || items.length === 0) return;

  var rows = items.map(function(item) {
    return headers.map(function(h) {
      var val = item[h];
      if (val === undefined || val === null || val === '') {
        if (h === 'Id' && (item['id'] !== undefined || item['ID'] !== undefined)) val = item['id'] !== undefined ? item['id'] : item['ID'];
        if (h === 'Data' && item['data'] !== undefined) val = item['data'];
        if (h === 'Descrição' && item['descricao'] !== undefined) val = item['descricao'];
        if (h === 'Valor' && item['valor'] !== undefined) val = item['valor'];
        if ((h === 'Valor_PG' || h === 'Valor_R$') && (item['valorPg'] !== undefined || item['Valor_PG'] !== undefined)) val = item['valorPg'] !== undefined ? item['valorPg'] : item['Valor_PG'];
        if ((h === 'Banco_Id' || h === 'bancoid' || h === 'bancoId') && (item['bancoId'] !== undefined || item['bancoid'] !== undefined)) val = item['bancoId'] !== undefined ? item['bancoId'] : item['bancoid'];
        if ((h === 'Cartão_Id' || h === 'cartaoid' || h === 'cartaoId') && (item['cartaoid'] !== undefined || item['cartaoId'] !== undefined || item['Cartão_Id'] !== undefined || item['bancoId'] !== undefined)) val = item['cartaoid'] !== undefined ? item['cartaoid'] : (item['cartaoId'] !== undefined ? item['cartaoId'] : (item['Cartão_Id'] !== undefined ? item['Cartão_Id'] : item['bancoId']));
        if (h === 'Forma_Pagamento' && item['formaPagamento'] !== undefined) val = item['formaPagamento'];
        if (h === 'Tipo' && item['tipo'] !== undefined) val = item['tipo'];
        if (h === 'Categoria' && item['categoria'] !== undefined) val = item['categoria'];
        if (h === 'Status' && item['status'] !== undefined) val = item['status'];
        if (h === 'KM' && item['km'] !== undefined) val = item['km'];
        if (h === 'Litros' && item['litros'] !== undefined) val = item['litros'];
        if (h === 'Preço_Litro' && (item['precoLitro'] !== undefined || item['Preço_Litro'] !== undefined)) val = item['precoLitro'] !== undefined ? item['precoLitro'] : item['Preço_Litro'];
        if ((h === 'Completou_O_Tanque' || h === 'Completou_o_Tanque') && (item['completouTanque'] !== undefined || item['Completou_O_Tanque'] !== undefined)) {
          var cVal = item['completouTanque'] !== undefined ? item['completouTanque'] : item['Completou_O_Tanque'];
          val = (cVal === true || cVal === 'Sim' || cVal === 'SIM' || cVal === 'true') ? 'Sim' : 'Não';
        }
        if (h === 'KM_Percorrido' && (item['kmPercorrido'] !== undefined || item['KM_Percorrido'] !== undefined)) val = item['kmPercorrido'] !== undefined ? item['kmPercorrido'] : item['KM_Percorrido'];
        if ((h === 'Média_(Km/L)' || h === 'Media_(Km/L)') && (item['mediaKmL'] !== undefined || item['Média_(Km/L)'] !== undefined || item['Media_(Km/L)'] !== undefined)) val = item['mediaKmL'] !== undefined ? item['mediaKmL'] : (item['Média_(Km/L)'] !== undefined ? item['Média_(Km/L)'] : item['Media_(Km/L)']);
        if (h === 'Veiculo' && (item['veiculo'] !== undefined || item['Veiculo'] !== undefined)) val = item['veiculo'] !== undefined ? item['veiculo'] : item['Veiculo'];
        if ((h === 'Descrição_Do_Veículo' || h === 'Descrição_do_Veículo' || h === 'descricaoVeiculo') && (item['descricaoVeiculo'] !== undefined || item['Descrição_Do_Veículo'] !== undefined || item['Descrição_do_Veículo'] !== undefined || item['Descrição do Veículo'] !== undefined)) val = item['descricaoVeiculo'] !== undefined ? item['descricaoVeiculo'] : (item['Descrição_Do_Veículo'] !== undefined ? item['Descrição_Do_Veículo'] : (item['Descrição_do_Veículo'] !== undefined ? item['Descrição_do_Veículo'] : item['Descrição do Veículo']));
        if (h === 'Motorista' && (item['motorista'] !== undefined || item['Motorista'] !== undefined)) val = item['motorista'] !== undefined ? item['motorista'] : item['Motorista'];
        if (h === 'Nome_Posto' && (item['nomePosto'] !== undefined || item['Nome_Posto'] !== undefined || item['Nome Posto'] !== undefined)) val = item['nomePosto'] !== undefined ? item['nomePosto'] : (item['Nome_Posto'] !== undefined ? item['Nome_Posto'] : item['Nome Posto']);
        if ((h === 'Localização_Do_Posto' || h === 'Localizacao_do_Posto') && (item['localizacaoPosto'] !== undefined || item['Localização_Do_Posto'] !== undefined || item['Localizacao_do_Posto'] !== undefined || item['Localização do Posto'] !== undefined)) val = item['localizacaoPosto'] !== undefined ? item['localizacaoPosto'] : (item['Localização_Do_Posto'] !== undefined ? item['Localização_Do_Posto'] : (item['Localizacao_do_Posto'] !== undefined ? item['Localizacao_do_Posto'] : item['Localização do Posto']));
        if (h === 'Comprovante_Url' && (item['comprovanteUrl'] !== undefined || item['Comprovante_Url'] !== undefined)) val = item['comprovanteUrl'] !== undefined ? item['comprovanteUrl'] : item['Comprovante_Url'];
        if (h === 'OBS' && (item['obs'] !== undefined || item['OBS'] !== undefined)) val = item['obs'] !== undefined ? item['obs'] : item['OBS'];
        if (h === 'nome' && (item['Item'] || item['nomeItem'] || item['Nome'])) val = item['Item'] || item['nomeItem'] || item['Nome'];
        if (h === 'descricao' && (item['Descrição do Serviço'] || item['Descrição'] || item['Descricao'])) val = item['Descrição do Serviço'] || item['Descrição'] || item['Descricao'];
        if (h === 'valor' && (item['Valor Pago (R$)'] || item['Valor (R$)'] || item['Valor'])) val = item['Valor Pago (R$)'] || item['Valor (R$)'] || item['Valor'];
        if (h === 'km' && (item['Quilometragem (KM)'] || item['KM'])) val = item['Quilometragem (KM)'] || item['KM'];
        if (h === 'data' && (item['Data Realização'] || item['Data'])) val = item['Data Realização'] || item['Data'];
        if (h === 'oficinaNome' && (item['Oficina/Estabelecimento'] || item['Oficina'])) val = item['Oficina/Estabelecimento'] || item['Oficina'];
        if (h === 'observacoes' && (item['Observações'] || item['Observacao'] || item['Observação'])) val = item['Observações'] || item['Observacao'] || item['Observação'];
        if (h === 'veiculoId' && (item['Veículo'] || item['veiculoDescricao'])) val = item['Veículo'] || item['veiculoDescricao'];
        if (h === 'valorEstimado' && (item['Valor Estimado (R$)'] || item['Valor Estimado'])) val = item['Valor Estimado (R$)'] || item['Valor Estimado'];
      }
      return val !== undefined && val !== null ? val : '';
    });
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

function readSheetToArray(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = data.slice(1);

  return rows.map(function(row, rIdx) {
    var obj = {};
    headers.forEach(function(h, idx) {
      if (h) {
        var key = String(h).trim();
        var val = row[idx];
        
        var normKey = key;
        if (normKey === 'Valor_R$' || normKey === 'Valor_PG' || normKey === 'Valor Pago (R$)') normKey = 'valorPg';
        if (normKey === 'Banco_Id' || normKey === 'bancoid' || normKey === 'bancoId') normKey = 'bancoId';
        if (normKey === 'Cartão_Id' || normKey === 'cartaoid' || normKey === 'cartaoId' || normKey === 'ID do Cartão / Conta') normKey = 'cartaoid';
        if (normKey === 'Forma_Pagamento') normKey = 'formaPagamento';
        if (normKey === 'Litros') normKey = 'litros';
        if (normKey === 'Preço_Litro' || normKey === 'Preco_Litro') normKey = 'precoLitro';
        if (normKey === 'Completou_O_Tanque' || normKey === 'Completou_o_Tanque' || normKey === 'Completou o Tanque') normKey = 'completouTanque';
        if (normKey === 'KM_Percorrido' || normKey === 'KM Percorrido') normKey = 'kmPercorrido';
        if (normKey === 'Média_(Km/L)' || normKey === 'Media_(Km/L)' || normKey === 'Média (Km/L)') normKey = 'mediaKmL';
        if (normKey === 'Descrição_Do_Veículo' || normKey === 'Descrição_do_Veículo' || normKey === 'Descrição do Veículo' || normKey === 'Descricao do Veiculo') normKey = 'descricaoVeiculo';
        if (normKey === 'Nome_Posto' || normKey === 'Nome Posto') normKey = 'nomePosto';
        if (normKey === 'Localização_Do_Posto' || normKey === 'Localizacao_do_Posto' || normKey === 'Localização do Posto') normKey = 'localizacaoPosto';
        if (normKey === 'Comprovante_Url') normKey = 'comprovanteUrl';
        if (normKey === 'OBS' || normKey === 'Obs' || normKey === 'Observações' || normKey === 'Observacao') normKey = 'obs';
        if (normKey === 'Veiculo' || normKey === 'Veículo') normKey = 'veiculo';
        if (normKey === 'Motorista') normKey = 'motorista';
        if (normKey === 'Status') normKey = 'status';
        if (normKey === 'Categoria') normKey = 'categoria';
        if (normKey === 'Tipo') normKey = 'tipo';
        if (normKey === 'Item' || normKey === 'Nome' || normKey === 'nomeItem') normKey = 'nome';
        if (normKey === 'Descrição do Serviço' || normKey === 'Descrição' || normKey === 'Descricao') normKey = 'descricao';
        if (normKey === 'Valor Pago (R$)' || normKey === 'Valor (R$)' || normKey === 'Valor') normKey = 'valor';
        if (normKey === 'Valor Estimado (R$)' || normKey === 'Valor Estimado') normKey = 'valorEstimado';
        if (normKey === 'Quilometragem (KM)' || normKey === 'KM') normKey = 'km';
        if (normKey === 'Data Realização' || normKey === 'Data') normKey = 'data';
        if (normKey === 'Oficina/Estabelecimento' || normKey === 'Oficina') normKey = 'oficinaNome';
        if (normKey === 'Veículo' || normKey === 'veiculoDescricao') normKey = 'veiculoId';
        if (normKey === 'Comprado') normKey = 'comprado';
        if (normKey === 'Quantidade' || normKey === 'Qtd') normKey = 'quantidade';
        if (normKey === 'ID' || normKey === 'Id') normKey = 'id';

        if (normKey === 'id' || normKey === 'valor' || normKey === 'valorPg' || normKey === 'bancoId' || normKey === 'saldoInicial' || normKey === 'limite' || normKey === 'km' || normKey === 'litros' || normKey === 'precoLitro' || normKey === 'kmPercorrido' || normKey === 'mediaKmL' || normKey === 'kmAtual' || normKey === 'latitude' || normKey === 'longitude' || normKey === 'raioMetros' || normKey === 'quantidade' || normKey === 'valorEstimado') {
          obj[normKey] = val !== '' && val !== null && !isNaN(val) ? Number(val) : val;
        } else if (normKey === 'completouTanque' || normKey === 'concluido' || normKey === 'ativo' || normKey === 'comprado') {
          obj[normKey] = val === true || val === 'true' || String(val).toUpperCase() === 'SIM' || String(val).toUpperCase() === 'TRUE';
        } else {
          obj[normKey] = val;
        }
      }
    });
    if (!obj.id || obj.id === '') {
      obj.id = 900000000000 + (rIdx + 1) * 1000 + Math.floor(Math.random() * 900);
    }
    if (sheetName === 'Receitas' && !obj.tipo) obj.tipo = 'RECEITA';
    if (sheetName === 'Despesas' && !obj.tipo) obj.tipo = 'DESPESA';
    if (sheetName === 'Abastecimentos') {
      if (!obj.tipo) obj.tipo = 'DESPESA';
      if (!obj.categoria) obj.categoria = 'ABASTECIMENTO';
    }
    return obj;
  });
}`;

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  currentValue = ''
}) => {
  const [linkInput, setLinkInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const EXPENSE_CATEGORIES = [
    'TODAS', 'ABASTECIMENTO', 'ALIMENTAÇÃO', 'CASA', 'CONSUMO',
    'EDUCAÇÃO', 'LAZER', 'MERCADO', 'PESSOAL', 'SAÚDE',
    'SERVIÇOS', 'TRANSPORTE', 'TRABALHO', 'OUTROS'
  ];

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_sync_categories');
      return saved ? JSON.parse(saved) : ['TODAS'];
    } catch {
      return ['TODAS'];
    }
  });

  const toggleCategory = (cat: string) => {
    if (cat === 'TODAS') {
      setSelectedCategories(['TODAS']);
      return;
    }
    let updated = selectedCategories.filter(c => c !== 'TODAS');
    if (updated.includes(cat)) {
      updated = updated.filter(c => c !== cat);
      if (updated.length === 0) updated = ['TODAS'];
    } else {
      updated.push(cat);
    }
    setSelectedCategories(updated);
  };

  useEffect(() => {
    if (isOpen) {
      const saved = currentValue || 
                    localStorage.getItem('wealthflow_apps_script_url') || 
                    localStorage.getItem('wealthflow_google_access_token') || 
                    '';
      setLinkInput(saved);
      setErrorMsg('');
      setIsLoading(false);
      setCopied(false);
    }
  }, [isOpen, currentValue]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = linkInput.trim() || 'wealthflow_direct_sheets_connected';

    try {
      setIsLoading(true);
      setErrorMsg('');
      localStorage.setItem('wealthflow_sync_categories', JSON.stringify(selectedCategories));
      await onConnect(val);
      setIsLoading(false);
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Ocorreu um erro ao conectar. Tente novamente.');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-slate-100 relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-2xl">grid_on</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-white font-display">Conectar Google Drive / Planilha</h3>
              <p className="text-xs text-slate-400">Sincronização em tempo real via Google Apps Script</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Instructions Card */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">integration_instructions</span>
              Passo a Passo Rápido (30 segundos)
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-xs">{copied ? 'check' : 'content_copy'}</span>
              {copied ? 'Código Copiado!' : 'Copiar Código Apps Script'}
            </button>
          </div>
          <ol className="list-decimal list-inside text-slate-300 space-y-1.5 text-[11px] leading-relaxed">
            <li>Abra sua planilha no Google Sheets e vá em <strong>Extensões &gt; Apps Script</strong>.</li>
            <li>Cole o código copiado acima e clique em <strong>Implantar &gt; Nova Implantação</strong>.</li>
            <li>Selecione Tipo: <strong>App da Web</strong>, Quem tem acesso: <strong>Qualquer Pessoa ("Anyone")</strong>.</li>
            <li>Copie o link do Web App gerado e cole no campo abaixo.</li>
          </ol>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              URL do Web App (Google Apps Script)
            </label>
            <div className="relative">
              <input
                type="text"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all pr-10"
              />
              {linkInput && (
                <button
                  type="button"
                  onClick={() => setLinkInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Categorias de Despesas para Sincronizar */}
          <div className="space-y-2 border-t border-slate-800/80 pt-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-emerald-400">filter_alt</span>
                Filtro de Categorias de Despesas
              </label>
              <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {selectedCategories.includes('TODAS') ? 'Todas as Categorias' : `${selectedCategories.length} Selecionada(s)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Escolha quais categorias de despesas serão sincronizadas com o Google Sheets:
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950/80 border border-slate-800 rounded-xl custom-scrollbar">
              {EXPENSE_CATEGORIES.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                  Conectando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">link</span>
                  Salvar e Conectar
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default GoogleDriveModal;
