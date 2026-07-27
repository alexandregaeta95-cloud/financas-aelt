import { ExecutiveReport, DashboardData } from '../types';
import { analyticsLogger } from './analyticsLogger';

export function exportToJSON(data: unknown, filename: string): void {
  try {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    analyticsLogger.log('EXPORTACAO', `Exportado JSON: ${filename}`, true);
  } catch (error) {
    analyticsLogger.log('ERRO', `Erro exportando JSON: ${(error as Error).message}`, false);
  }
}

export function exportToCSV(data: Array<Record<string, unknown>>, filename: string): void {
  try {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const val = row[header];
        const stringified = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
        const escaped = stringified.replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\n'); // UTF-8 BOM
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    analyticsLogger.log('EXPORTACAO', `Exportado CSV: ${filename}`, true);
  } catch (error) {
    analyticsLogger.log('ERRO', `Erro exportando CSV: ${(error as Error).message}`, false);
  }
}

export function exportReportToPDF(report: ExecutiveReport): void {
  try {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir/exportar em PDF.');
      return;
    }

    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Executivo - Controle Financeiro Gaeta</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; background: #fff; }
          h1 { color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 10px; font-size: 24px; }
          h2 { color: #0369a1; font-size: 18px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 12px; color: #64748b; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; }
          .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; }
          .card-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold; }
          .card-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; }
          ul { margin-top: 8px; padding-left: 20px; }
          li { margin-bottom: 6px; font-size: 13px; color: #334155; }
          .footer { margin-top: 40px; font-size: 11px; text-align: center; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div><strong>CONTROLE FINANCEIRO GAETA BI</strong></div>
          <div>Gerado em: ${new Date(report.dataGeracao).toLocaleString('pt-BR')}</div>
        </div>

        <h1>RELATÓRIO EXECUTIVO E DASHBOARD BI</h1>
        <p><strong>Período Analisado:</strong> ${report.periodo}</p>

        <h2>Resumo Executivo</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">${report.resumoExecutivoText}</p>

        <h2>Principais Indicadores Financeiros</h2>
        <div class="grid">
          <div class="card">
            <div class="card-title">Receita Mensal</div>
            <div class="card-value" style="color: #16a34a;">R$ ${report.metricasFinanceiras.receitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-title">Despesa Mensal</div>
            <div class="card-value" style="color: #dc2626;">R$ ${report.metricasFinanceiras.despesaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-title">Lucro Líquido</div>
            <div class="card-value">R$ ${report.metricasFinanceiras.lucroLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-title">Saldo Total</div>
            <div class="card-value">R$ ${report.metricasFinanceiras.saldoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
          </div>
          <div class="card">
            <div class="card-title">Taxa de Economia</div>
            <div class="card-value">${report.metricasFinanceiras.taxaEconomiaPct.toFixed(1)}%</div>
          </div>
          <div class="card">
            <div class="card-title">Score de Saúde Financeira</div>
            <div class="card-value" style="color: #0284c7;">${report.metricasFinanceiras.saudeFinanceiraScore} / 100</div>
          </div>
        </div>

        <h2>Recomendações de Inteligência</h2>
        <ul>
          ${report.recomendacoesPrincipais.map(rec => `<li>${rec}</li>`).join('')}
        </ul>

        <div class="footer">
          Plataforma de BI & Central de Inteligência Gaeta — Documento gerado automaticamente.
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    analyticsLogger.log('EXPORTACAO', `Relatorio impresso/PDF gerado: ${report.id}`, true);
  } catch (error) {
    analyticsLogger.log('ERRO', `Erro imprimindo PDF: ${(error as Error).message}`, false);
  }
}
