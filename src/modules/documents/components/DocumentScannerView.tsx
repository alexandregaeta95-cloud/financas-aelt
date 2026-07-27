import React, { useState } from 'react';
import { useDocumentScanner } from '../hooks/useDocumentScanner';
import { openFinanceService } from '../openfinance/openFinanceEngine';
import { documentSettingsService } from '../services/documentSettingsService';
import { ocrService } from '../services/ocrService';
import { DocumentHistory, DocumentSettings, OpenFinanceSyncResult } from '../types';
import { ocrLogger } from '../utils/ocrLogger';
import { DocumentImportModal } from './DocumentImportModal';

interface DocumentScannerViewProps {
  existingTransactions: any[];
  onAddTransaction: (transaction: any) => void;
  showAlert?: (title: string, message: string, type?: 'success' | 'error' | 'warning') => void;
}

export const DocumentScannerView: React.FC<DocumentScannerViewProps> = ({
  existingTransactions,
  onAddTransaction,
  showAlert
}) => {
  const [activeTab, setActiveTab] = useState<'SCANNER' | 'OPEN_FINANCE' | 'HISTORICO' | 'CONFIG'>('SCANNER');
  const [settings, setSettings] = useState<DocumentSettings>(documentSettingsService.getSettings());

  // Scanner state
  const { isProcessing, error, ocrResult, parsedData, extraction, validation, processFile, clear } = useDocumentScanner();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Open Finance state
  const [syncResult, setSyncResult] = useState<OpenFinanceSyncResult | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // OCR History state
  const [history, setHistory] = useState<DocumentHistory[]>(ocrService.getHistorico());

  // File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const res = await processFile(file);
      if (res) {
        setIsModalOpen(true);
      }
    } catch (err: any) {
      if (showAlert) showAlert('Erro de OCR', err?.message || 'Falha ao processar arquivo.', 'error');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    try {
      const res = await processFile(file);
      if (res) {
        setIsModalOpen(true);
      }
    } catch (err: any) {
      if (showAlert) showAlert('Erro de OCR', err?.message || 'Falha ao processar arquivo.', 'error');
    }
  };

  const handleConfirmImport = (importedItems: any[]) => {
    importedItems.forEach((item) => {
      onAddTransaction(item);
    });
    if (showAlert) {
      showAlert('Sucesso', `${importedItems.length} transação(ões) importada(s) com sucesso!`, 'success');
    }
    ocrLogger.log('IMPORT_CONFIRMED', `Importação confirmada para ${importedItems.length} transação(ões)`);
    setHistory(ocrService.getHistorico());
  };

  const handleOpenFinanceSync = async () => {
    setIsSyncing(true);
    try {
      const res = await openFinanceService.sincronizarTudo();
      setSyncResult(res);
      if (showAlert) {
        showAlert('Open Finance', 'Sincronização realizada com sucesso!', 'success');
      }
    } catch (err) {
      if (showAlert) showAlert('Erro', 'Falha ao sincronizar via Open Finance', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSettingToggle = (key: keyof DocumentSettings) => {
    const updated = documentSettingsService.updateSettings({ [key]: !settings[key] });
    setSettings(updated);
    if (showAlert) {
      showAlert('Configurações Salvas', 'Configurações de documentos atualizadas.', 'success');
    }
  };

  return (
    <div className="space-y-6 pb-12 text-slate-100 font-sans">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-base">document_scanner</span>
            Sprint 6 • Leitura de Comprovantes & Open Finance
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Captura Inteligente & Open Finance</h1>
          <p className="text-xs text-slate-400 mt-1">
            Digitalização OCR para comprovantes, boletos, faturas e extratos com sincronização automatizada.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('SCANNER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'SCANNER'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">photo_camera</span>
            Scanner OCR
          </button>

          <button
            onClick={() => setActiveTab('OPEN_FINANCE')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'OPEN_FINANCE'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">account_balance</span>
            Open Finance
          </button>

          <button
            onClick={() => setActiveTab('HISTORICO')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'HISTORICO'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">history</span>
            Histórico OCR
          </button>

          <button
            onClick={() => setActiveTab('CONFIG')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'CONFIG'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-base">settings</span>
            Ajustes
          </button>
        </div>
      </div>

      {/* TAB 1: SCANNER OCR */}
      {activeTab === 'SCANNER' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Upload Box */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400">upload_file</span>
              Digitalizar Comprovante / Documento Financeiro
            </h2>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/60 transition bg-slate-950/40 rounded-3xl p-8 text-center space-y-4 cursor-pointer relative group"
            >
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />

              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl mx-auto flex items-center justify-center group-hover:scale-110 transition">
                <span className="material-symbols-outlined text-3xl">add_a_photo</span>
              </div>

              <div>
                <p className="text-sm font-bold text-slate-200">Arraste um documento ou clique para selecionar</p>
                <p className="text-xs text-slate-400 mt-1">
                  Suporta comprovantes PIX, Boletos, Faturas de Cartão, Notas Fiscais, Extratos (PNG, JPG, PDF)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold">
                  Câmera
                </span>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold">
                  Galeria
                </span>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold">
                  PDF / Extrato
                </span>
              </div>
            </div>

            {/* Processing State */}
            {isProcessing && (
              <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center space-y-3 animate-pulse">
                <span className="material-symbols-outlined text-3xl text-emerald-400 animate-spin">
                  sync
                </span>
                <p className="text-xs font-bold text-emerald-300">
                  Processando documento com Motor OCR... Aplicando melhorias de brilho e nitidez...
                </p>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">error</span>
                <span>{error}</span>
              </div>
            )}

            {/* Quick Demo Samples */}
            <div className="space-y-3 pt-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Exemplos de Simulação Rápida para Teste:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <button
                  onClick={() => {
                    const mockFile = new File(['COMPROVANTE DE PAGAMENTO PIX R$ 250,00'], 'pix_comprovante.txt', {
                      type: 'text/plain'
                    });
                    processFile(mockFile).then(() => setIsModalOpen(true));
                  }}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition text-slate-300 hover:text-emerald-400 font-semibold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-emerald-400 text-base">qr_code_2</span>
                  Comprovante PIX
                </button>

                <button
                  onClick={() => {
                    const mockFile = new File(['COMPROVANTE DE BOLETO 34191.79001 R$ 189,90'], 'boleto.txt', {
                      type: 'text/plain'
                    });
                    processFile(mockFile).then(() => setIsModalOpen(true));
                  }}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition text-slate-300 hover:text-emerald-400 font-semibold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-amber-400 text-base">receipt_long</span>
                  Boleto Bancário
                </button>

                <button
                  onClick={() => {
                    const mockFile = new File(['FATURA DO CARTAO NUBANK TOTAL R$ 1420,50'], 'fatura.txt', {
                      type: 'text/plain'
                    });
                    processFile(mockFile).then(() => setIsModalOpen(true));
                  }}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition text-slate-300 hover:text-emerald-400 font-semibold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-purple-400 text-base">credit_card</span>
                  Fatura Cartão
                </button>

                <button
                  onClick={() => {
                    const mockFile = new File(['EXTRATO BANCARIO ITAU SALDO R$ 6050,00'], 'extrato.txt', {
                      type: 'text/plain'
                    });
                    processFile(mockFile).then(() => setIsModalOpen(true));
                  }}
                  className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-2xl text-left transition text-slate-300 hover:text-emerald-400 font-semibold flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-blue-400 text-base">account_balance_wallet</span>
                  Extrato Bancário
                </button>
              </div>
            </div>
          </div>

          {/* Side Info & Tips */}
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 text-xs">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">psychology</span>
                Recursos do OCR Inteligente
              </h3>
              <ul className="space-y-2.5 text-slate-400">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  Reconhecimento automático de PIX Copia e Cola & QR Codes
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  Extração de linha digitável e código de barras de boletos
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  Conciliação automática com transações já existentes
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-emerald-400 text-base">check</span>
                  Melhoria gráfica dinâmica (brilho, contraste, rotação)
                </li>
              </ul>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3 text-xs">
              <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400">security</span>
                Validação de Segurança
              </h3>
              <p className="text-slate-400 leading-relaxed">
                Toda informação extraída via OCR passa por confirmação do usuário antes de qualquer gravação oficial.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: OPEN FINANCE */}
      {activeTab === 'OPEN_FINANCE' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-400">account_balance</span>
                  Conectores Open Finance (Arquitetura BACEN)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Integração padronizada para consentimentos, contas, cartões e investimentos.
                </p>
              </div>

              <button
                onClick={handleOpenFinanceSync}
                disabled={isSyncing}
                className="px-6 py-2.5 rounded-2xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <span className={`material-symbols-outlined text-base ${isSyncing ? 'animate-spin' : ''}`}>
                  sync
                </span>
                {isSyncing ? 'Sincronizando...' : 'Executar Sincronização Geral'}
              </button>
            </div>

            {/* Sync Result Banner */}
            {syncResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs space-y-1">
                <div className="font-bold flex items-center gap-2">
                  <span className="material-symbols-outlined">verified</span>
                  Última Sincronização Concluída ({new Date(syncResult.timestamp).toLocaleTimeString('pt-BR')}):
                </div>
                <p>
                  • Contas: {syncResult.contasSincronizadas} | Cartões: {syncResult.cartoesSincronizados} | Transações Importadas: {syncResult.transacoesImportadas}
                </p>
              </div>
            )}

            {/* Connected Institutions */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Instituições Conectadas
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {openFinanceService.accountConnector.getInstituicoes().map((inst) => (
                  <div
                    key={inst.id}
                    className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-slate-900 border border-slate-800 text-emerald-400 rounded-xl">
                        <span className="material-symbols-outlined">account_balance</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">{inst.nome}</h4>
                        <p className="text-[11px] text-slate-500">COMPE: {inst.codigoCompe}</p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[10px] font-bold">
                      Ativo
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HISTÓRICO OCR */}
      {activeTab === 'HISTORICO' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">history</span>
            Histórico de Documentos Processados por OCR
          </h2>

          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">Nenhum histórico de OCR registrado ainda.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">{item.fileName}</span>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[10px] font-bold">
                        {item.documentType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{new Date(item.timestamp).toLocaleString('pt-BR')}</p>
                  </div>

                  <div className="text-right">
                    {item.extractedValue !== undefined && (
                      <p className="font-bold text-emerald-400 text-sm">
                        R$ {item.extractedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500">Confiança: {item.confidence}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AJUSTES */}
      {activeTab === 'CONFIG' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400">settings</span>
            Configurações de OCR e Open Finance
          </h2>

          <div className="space-y-4 text-xs">
            {Object.entries({
              ativarOCR: 'Ativar Reconhecimento Inteligente OCR',
              importacaoAutomatica: 'Importação Automática sem Confirmação Manual',
              melhoriaAutomaticaImagem: 'Melhoria Automática da Imagem (Brilho & Contraste)',
              conciliacaoAutomatica: 'Conciliação Automática de Transações Duplicadas',
              prepararOpenFinance: 'Preparar Conectores Open Finance',
              salvarHistoricoOCR: 'Salvar Histórico de Documentos Digitalizados'
            }).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <span className="font-medium text-slate-200">{label}</span>
                <button
                  onClick={() => handleSettingToggle(key as keyof DocumentSettings)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    settings[key as keyof DocumentSettings] ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      settings[key as keyof DocumentSettings] ? 'transform translate-x-6' : 'transform translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Import Modal */}
      {ocrResult && parsedData && extraction && validation && (
        <DocumentImportModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            clear();
          }}
          ocrResult={ocrResult}
          parsedData={parsedData}
          extraction={extraction}
          validation={validation}
          existingTransactions={existingTransactions}
          onConfirmImport={handleConfirmImport}
        />
      )}
    </div>
  );
};
