import React, { useState } from 'react';
import { ExtractionResult, OCRResult, ReceiptData, ValidationResult } from '../types';
import { ReconciliationService } from '../services/reconciliationService';

interface DocumentImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  ocrResult: OCRResult;
  parsedData: ReceiptData;
  extraction: ExtractionResult<any>;
  validation: ValidationResult;
  existingTransactions: any[];
  onConfirmImport: (importedItems: any[]) => void;
}

export const DocumentImportModal: React.FC<DocumentImportModalProps> = ({
  isOpen,
  onClose,
  ocrResult,
  parsedData,
  extraction,
  validation,
  existingTransactions,
  onConfirmImport
}) => {
  const [isEditing, setIsEditing] = useState(false);

  // Editable fields
  const [valor, setValor] = useState(parsedData.dataGeral?.valor || 0);
  const [descricao, setDescricao] = useState(
    parsedData.pix?.descricao ||
      parsedData.dataGeral?.estabelecimentoOuPessoa ||
      'Lançamento Importado via OCR'
  );
  const [data, setData] = useState(parsedData.dataGeral?.data || new Date().toISOString().substring(0, 10));
  const [categoria, setCategoria] = useState(parsedData.dataGeral?.categoriaSugerida || 'Geral');
  const [tipo, setTipo] = useState<'RECEITA' | 'DESPESA'>(
    parsedData.tipo === 'COMPROVANTE_PIX' && parsedData.pix?.tipoPix === 'RECEBIDO' ? 'RECEITA' : 'DESPESA'
  );

  if (!isOpen) return null;

  // Run reconciliation check
  const reconciliation = ReconciliationService.conciliar(
    [
      {
        id: 'ocr-temp',
        data,
        descricao,
        tipo,
        subtipo: parsedData.tipo === 'COMPROVANTE_PIX' ? 'PIX' : 'OUTRO',
        valor
      }
    ],
    existingTransactions
  )[0];

  const handleConfirm = () => {
    const itemToImport = {
      id: Date.now(),
      data,
      valor,
      tipo,
      descricao,
      categoria,
      status: 'PAGO',
      origem: 'IMPORTACAO',
      statusProcessamento: 'CONFIRMADO'
    };
    onConfirmImport([itemToImport]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
              <span className="material-symbols-outlined text-2xl">document_scanner</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100">Painel de Importação OCR</h3>
              <p className="text-xs text-slate-400">
                Documento identificado: <span className="text-emerald-400 font-semibold">{parsedData.tipo}</span> ({ocrResult.confidence}% de confiança)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Confidence Alerts / Warnings */}
        {validation.warnings.length > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs space-y-1">
            <div className="font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-base">warning</span>
              Campos com atenção necessária:
            </div>
            {validation.warnings.map((w, idx) => (
              <p key={idx}>• {w}</p>
            ))}
          </div>
        )}

        {/* Reconciliation Status */}
        {reconciliation && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
              reconciliation.statusConciliacao === 'DUPLICADA'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : reconciliation.statusConciliacao === 'DIVERGENTE'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span className="material-symbols-outlined">
              {reconciliation.statusConciliacao === 'DUPLICADA'
                ? 'find_replace'
                : reconciliation.statusConciliacao === 'DIVERGENTE'
                ? 'error'
                : 'check_circle'}
            </span>
            <div>
              <span className="font-bold uppercase tracking-wider block">
                Conciliação: {reconciliation.statusConciliacao}
              </span>
              <span>{reconciliation.divergenciaMensagem}</span>
            </div>
          </div>
        )}

        {/* Extracted Form Data */}
        <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">Dados Extraídos</span>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="text-emerald-400 hover:underline text-xs flex items-center gap-1 font-semibold"
            >
              <span className="material-symbols-outlined text-sm">{isEditing ? 'lock' : 'edit'}</span>
              {isEditing ? 'Travar Edição' : 'Editar Dados'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Descrição / Estabelecimento</label>
              {isEditing ? (
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <p className="font-semibold text-slate-200 text-sm bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                  {descricao}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Valor (R$)</label>
              {isEditing ? (
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={(e) => setValor(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <p className="font-bold text-emerald-400 text-sm bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                  R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Data do Documento</label>
              {isEditing ? (
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <p className="font-medium text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                  {data}
                </p>
              )}
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tipo de Operação</label>
              {isEditing ? (
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="DESPESA">DESPESA</option>
                  <option value="RECEITA">RECEITA</option>
                </select>
              ) : (
                <p className="font-medium text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                  {tipo}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-400 mb-1">Categoria Sugerida</label>
              {isEditing ? (
                <input
                  type="text"
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              ) : (
                <p className="font-medium text-slate-300 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800/60">
                  {categoria}
                </p>
              )}
            </div>
          </div>

          {/* Specific details depending on parsed document type */}
          {parsedData.boleto && (
            <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block">Linha Digitável:</span>
              <p className="font-mono text-emerald-300 break-all">{parsedData.boleto.linhaDigitavel}</p>
            </div>
          )}

          {parsedData.pix && (
            <div className="mt-3 p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <span className="font-bold text-slate-300 block">Autenticação PIX / TXID:</span>
              <p className="font-mono text-slate-200">{parsedData.pix.txidOrAutenticacao}</p>
            </div>
          )}
        </div>

        {/* Text Preview */}
        <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-400 max-h-28 overflow-y-auto">
          <p className="text-[10px] uppercase font-sans font-bold text-slate-500 mb-1">Texto Bruto Reconhecido pelo OCR:</p>
          <pre className="whitespace-pre-wrap">{ocrResult.rawText}</pre>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
          >
            Cancelar
          </button>

          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition"
          >
            {isEditing ? 'Salvar Edição' : 'Editar Dados'}
          </button>

          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 transition shadow-lg shadow-emerald-500/20 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">download_done</span>
            Confirmar Importação
          </button>
        </div>
      </div>
    </div>
  );
};
