import { Transaction } from '../types';
import { normalizeTransactionObject } from '../../../lib/googleAuth';

export function cleanDuplicateTransactions(txs: any[]): Transaction[] {
  if (!Array.isArray(txs)) return [];
  const seenIds = new Set<string>();
  const uniqueTxs: Transaction[] = [];

  txs.forEach(rawItem => {
    if (!rawItem || typeof rawItem !== 'object') return;
    
    // Normalize properties (e.g. 'Valor (R$)', 'Valor', 'valor', 'Descrição', etc.)
    const t = normalizeTransactionObject(rawItem) || rawItem;
    if (!t || typeof t !== 'object') return;

    let idKey = t.id !== undefined && t.id !== null ? String(t.id).trim() : '';
    if (!idKey) {
      idKey = 'TX_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      t.id = idKey;
    }

    if (seenIds.has(idKey)) {
      // Re-assign a new unique ID so duplicated pasted rows with copied IDs get new IDs
      idKey = 'TX_' + Date.now() + '_' + Math.floor(Math.random() * 1000000);
      t.id = idKey;
    }
    seenIds.add(idKey);

    // Sanitize string and numeric fields to ensure non-null types
    t.data = String(t.data || t.Data || new Date().toLocaleDateString('pt-BR'));
    t.descricao = String(t.descricao || t.Descrição || 'LANÇAMENTO');
    t.categoria = String(t.categoria || t.Categoria || 'OUTROS').toUpperCase();
    t.tipo = String(t.tipo || t.Tipo || 'DESPESA').toUpperCase();
    t.status = String(t.status || t.Status || 'PAGO').toUpperCase();
    t.valor = typeof t.valor === 'number' && !isNaN(t.valor) ? t.valor : (parseFloat(String(t.valor || t.Valor || 0).replace(',', '.')) || 0);

    const isAbast = t.categoria === 'ABASTECIMENTO';
    if (t.veiculo || t.Veiculo) t.veiculo = String(t.veiculo || t.Veiculo || '').toUpperCase();
    if (t.descricaoVeiculo || t['Descrição_Do_Veículo'] || t['Descrição_do_Veículo']) t.descricaoVeiculo = String(t.descricaoVeiculo || t['Descrição_Do_Veículo'] || t['Descrição_do_Veículo'] || '').toUpperCase();
    if (t.nomePosto || t.Nome_Posto) t.nomePosto = String(t.nomePosto || t.Nome_Posto || '').toUpperCase();
    if (t.localizacaoPosto || t['Localização_Do_Posto'] || t['Localizacao_do_Posto']) t.localizacaoPosto = String(t.localizacaoPosto || t['Localização_Do_Posto'] || t['Localizacao_do_Posto'] || '').toUpperCase();
    if (t.motorista || t.Motorista) t.motorista = String(t.motorista || t.Motorista || '').toUpperCase();

    // Attach explicit 24 column keys
    t.Data = t.data;
    t['Descrição'] = t.descricao;
    t.Valor = t.valor;
    t.Valor_PG = t.valorPg !== undefined ? t.valorPg : (t.Valor_PG !== undefined ? t.Valor_PG : t.valor);
    t.Banco_Id = t.bancoId !== undefined ? t.bancoId : (t.Banco_Id !== undefined ? t.Banco_Id : '');
    t['Cartão_Id'] = t.cartaoid !== undefined ? t.cartaoid : (t.cartaoId !== undefined ? t.cartaoId : (t['Cartão_Id'] !== undefined ? t['Cartão_Id'] : ''));
    t.Forma_Pagamento = t.formaPagamento || t.Forma_Pagamento || '';
    t.Tipo = t.tipo;
    t.Categoria = t.categoria;
    t.Status = t.status;
    t.KM = isAbast ? (t.km !== undefined ? t.km : (t.KM !== undefined ? t.KM : '')) : '';
    t.Litros = isAbast ? (t.litros !== undefined ? t.litros : (t.Litros !== undefined ? t.Litros : '')) : '';
    t['Preço_Litro'] = isAbast ? (t.precoLitro !== undefined ? t.precoLitro : (t['Preço_Litro'] !== undefined ? t['Preço_Litro'] : '')) : '';
    t.Completou_O_Tanque = isAbast ? ((t.completouTanque === true || t.completouTanque === 'Sim' || t.Completou_O_Tanque === 'Sim' || t.Completou_O_Tanque === true) ? 'Sim' : 'Não') : '';
    t.KM_Percorrido = isAbast ? (t.kmPercorrido !== undefined ? t.kmPercorrido : (t.KM_Percorrido !== undefined ? t.KM_Percorrido : '')) : '';
    t['Média_(Km/L)'] = isAbast ? (t.mediaKmL !== undefined ? t.mediaKmL : (t['Média_(Km/L)'] !== undefined ? t['Média_(Km/L)'] : (t['Media_(Km/L)'] !== undefined ? t['Media_(Km/L)'] : ''))) : '';
    t.Veiculo = isAbast ? (t.veiculo || 'CARRO') : '';
    t['Descrição_Do_Veículo'] = t.descricaoVeiculo || '';
    t.Motorista = t.motorista || '';
    t.Nome_Posto = t.nomePosto || '';
    t['Localização_Do_Posto'] = t.localizacaoPosto || '';
    t.Comprovante_Url = t.comprovanteUrl || t.Comprovante_Url || '';
    t.OBS = t.obs || t.OBS || '';

    uniqueTxs.push(t as Transaction);
  });

  return uniqueTxs;
}

export function formatarMoeda(valor: any): string {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  let numVal = 0;
  if (typeof valor === 'number') {
    numVal = isNaN(valor) ? 0 : valor;
  } else if (typeof valor === 'string') {
    let s = valor.trim().replace(/R\$\s?/gi, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(s);
    numVal = isNaN(parsed) ? 0 : parsed;
  } else if (typeof valor === 'object') {
    const raw = valor['Valor (R$)'] ?? valor['Valor (R$) '] ?? valor.Valor ?? valor.valor ?? valor.VALOR ?? valor.valorPg ?? 0;
    return formatarMoeda(raw);
  }
  return numVal.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export function formatarData(dataStr: string): string {
  if (!dataStr) return '';
  const parts = dataStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dataStr;
}

export function calcularSaldo(transacoes: Transaction[]): number {
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  return safeList.reduce((acc, t) => {
    if (!t || typeof t !== 'object') return acc;
    const tipo = String(t.tipo || '').toUpperCase();
    const isDespesa = tipo === 'DESPESA' || tipo === 'ETANOL' || tipo === 'GAS. COMUM';
    const rawVal = t['Valor (R$)'] ?? t.valorPg ?? t.valor ?? 0;
    const valorNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.')) || 0;
    if (isDespesa) {
      return acc - Math.abs(valorNum);
    } else {
      return acc + Math.abs(valorNum);
    }
  }, 0);
}

export function agruparCategoria(transacoes: Transaction[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  safeList.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const cat = t.categoria || 'Outros';
    const rawVal = t['Valor (R$)'] ?? t.valorPg ?? t.valor ?? 0;
    const valorNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.')) || 0;
    resultado[cat] = (resultado[cat] || 0) + valorNum;
  });
  return resultado;
}

export function agruparConta(transacoes: Transaction[]): Record<string, number> {
  const resultado: Record<string, number> = {};
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  safeList.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const conta = t.bancoNome || 'Sem Conta';
    const rawVal = t['Valor (R$)'] ?? t.valorPg ?? t.valor ?? 0;
    const valorNum = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal).replace(',', '.')) || 0;
    resultado[conta] = (resultado[conta] || 0) + valorNum;
  });
  return resultado;
}

export function agruparMes(transacoes: Transaction[]): Record<string, Transaction[]> {
  const resultado: Record<string, Transaction[]> = {};
  const safeList = Array.isArray(transacoes) ? transacoes : [];
  safeList.forEach(t => {
    if (!t || typeof t !== 'object') return;
    const dataVal = t.data ? String(t.data) : '';
    const mesAno = dataVal ? dataVal.substring(0, 7) : 'Sem Data'; // YYYY-MM ou DD/MM/YYYY
    if (!resultado[mesAno]) {
      resultado[mesAno] = [];
    }
    resultado[mesAno].push(t);
  });
  return resultado;
}
