import React, { useState } from 'react';
import {
  defaultVoiceAssistant,
  defaultOCRProcessor,
  defaultDocumentReader,
  defaultInvoiceReader,
  defaultReceiptScanner,
  defaultCreditCardAnalyzer,
  defaultInvestmentAdvisor,
  defaultOpenFinanceConnector,
  defaultBankSyncEngine
} from '../services/sprint6Prep';

export const Sprint6PrepView: React.FC = () => {
  const [prepLog, setPrepLog] = useState<string | null>(null);

  const testOCR = async () => {
    const res = await defaultOCRProcessor.processarImagem('data:image/png;base64,sample...');
    setPrepLog(`[OCR] Confiança: ${res.confianca}% | Texto: "${res.textoExtraido}"`);
  };

  const testVoice = async () => {
    const res = await defaultVoiceAssistant.processarComandoVoz('audio-data');
    setPrepLog(`[Voz] Comando: "${res.comando}" => ${res.acaoExecutada}`);
  };

  const testInvoice = async () => {
    const res = await defaultInvoiceReader.lerFaturaCartao('fatura-base64');
    setPrepLog(`[Fatura] Total: R$ ${res.total} | Vencimento: ${res.vencimento} | Itens: ${res.itens.length}`);
  };

  const testOpenFinance = async () => {
    const res = await defaultOpenFinanceConnector.conectarBanco('Nubank');
    setPrepLog(`[Open Finance] Status: ${res.statusConexao} | Contas: ${res.contasImportadas}`);
  };

  const testInvestment = async () => {
    const res = await defaultInvestmentAdvisor.gerarSugestaoInvestimento('Moderado', 10000);
    setPrepLog(`[Investimentos] Sugestões: ${res.sugestoes.map((s) => s.produto).join(', ')}`);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-xl font-mono">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <span className="material-symbols-outlined text-indigo-400 text-2xl">rocket_launch</span>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Arquitetura Preparada para Sprint 6
          </h3>
          <p className="text-[11px] text-slate-400">
            Interfaces e stubs prontos para Assistente de Voz, OCR de Comprovantes, Faturas e Open Finance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <span className="font-bold text-indigo-400 block">VoiceAssistant</span>
          <p className="text-[10px] text-slate-400">Comandos por voz</p>
          <button
            type="button"
            onClick={testVoice}
            className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[10px] cursor-pointer"
          >
            Testar Voice
          </button>
        </div>

        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <span className="font-bold text-emerald-400 block">OCRProcessor</span>
          <p className="text-[10px] text-slate-400">Leitura de imagem</p>
          <button
            type="button"
            onClick={testOCR}
            className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[10px] cursor-pointer"
          >
            Testar OCR
          </button>
        </div>

        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <span className="font-bold text-purple-400 block">InvoiceReader</span>
          <p className="text-[10px] text-slate-400">Faturas de Cartão</p>
          <button
            type="button"
            onClick={testInvoice}
            className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[10px] cursor-pointer"
          >
            Testar Faturas
          </button>
        </div>

        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <span className="font-bold text-amber-400 block">OpenFinanceConnector</span>
          <p className="text-[10px] text-slate-400">Sincronização Bancária</p>
          <button
            type="button"
            onClick={testOpenFinance}
            className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[10px] cursor-pointer"
          >
            Testar Conexão
          </button>
        </div>

        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <span className="font-bold text-teal-400 block">InvestmentAdvisor</span>
          <p className="text-[10px] text-slate-400">Recomendações</p>
          <button
            type="button"
            onClick={testInvestment}
            className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded text-[10px] cursor-pointer"
          >
            Testar Investimentos
          </button>
        </div>

        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
          <span className="font-bold text-rose-400 block">BankSyncEngine</span>
          <p className="text-[10px] text-slate-400">Sincronização de extratos</p>
          <span className="text-[10px] text-emerald-400 block font-bold">Pronto / Ativo</span>
        </div>
      </div>

      {prepLog && (
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-indigo-300 font-mono">
          {prepLog}
        </div>
      )}
    </div>
  );
};
