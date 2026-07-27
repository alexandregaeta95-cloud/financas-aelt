import React, { useState } from 'react';
import { DashboardData } from '../types';
import { generateExecutiveReport } from './reportGenerator';
import { exportToJSON, exportToCSV, exportReportToPDF } from '../utils/exportUtils';
import { X, FileText, Download, Printer, FileSpreadsheet, Sparkles } from 'lucide-react';

interface Props {
  data: DashboardData;
  isOpen: boolean;
  onClose: () => void;
}

export const ExecutiveReportModal: React.FC<Props> = ({ data, isOpen, onClose }) => {
  const [periodo, setPeriodo] = useState('Mês Atual');

  if (!isOpen) return null;

  const report = generateExecutiveReport(data, periodo);

  const handleExportJSON = () => {
    exportToJSON(report, `relatorio_executivo_${Date.now()}`);
  };

  const handleExportCSV = () => {
    const csvData = [
      { Metrica: 'Receita Mensal', Valor: report.metricasFinanceiras.receitaMensal },
      { Metrica: 'Despesa Mensal', Valor: report.metricasFinanceiras.despesaMensal },
      { Metrica: 'Lucro Liquido', Valor: report.metricasFinanceiras.lucroLiquido },
      { Metrica: 'Saldo Total', Valor: report.metricasFinanceiras.saldoTotal },
      { Metrica: 'Taxa Economia (%)', Valor: report.metricasFinanceiras.taxaEconomiaPct },
      { Metrica: 'Saude Financeira', Valor: report.metricasFinanceiras.saudeFinanceiraScore },
    ];
    exportToCSV(csvData, `relatorio_executivo_${Date.now()}`);
  };

  const handlePrintPDF = () => {
    exportReportToPDF(report);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Central de Relatórios Executivos
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consolidação gerencial em tempo real
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between bg-sky-500/5 border border-sky-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-sky-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Período do Relatório:
              </span>
            </div>
            <select
              value={periodo}
              onChange={e => setPeriodo(e.target.value)}
              className="text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="Mês Atual">Mês Atual</option>
              <option value="Últimos 30 dias">Últimos 30 dias</option>
              <option value="Trimestre Vigente">Trimestre Vigente</option>
              <option value="Ano Consolidado">Ano Consolidado</option>
            </select>
          </div>

          {/* Executive Text */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4">
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Resumo Síntese do Período
            </h3>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {report.resumoExecutivoText}
            </p>
          </div>

          {/* Recommendations */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              Diretrizes de Inteligência Financeira
            </h3>
            <div className="space-y-2">
              {report.recomendacoesPrincipais.map((rec, i) => (
                <div
                  key={i}
                  className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-lg p-3"
                >
                  {rec}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir / PDF
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              JSON
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
