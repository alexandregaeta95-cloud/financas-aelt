import { PixHistory } from '../types';
import { PixLoggerService } from '../services/pixLoggerService';

export class PixHistoryService {
  private static STORAGE_KEY = 'wealthflow_pix_history';

  static obterHistorico(): PixHistory[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e: any) {
      PixLoggerService.logError('ERRO_LEITURA', 'Erro ao ler histórico do PIX do localStorage', e);
      return [];
    }
  }

  static registrarHistorico(item: PixHistory): void {
    try {
      const historico = this.obterHistorico();
      historico.unshift(item);
      // Keep last 200 history items
      const trimmed = historico.slice(0, 200);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e: any) {
      PixLoggerService.logError('ERRO_GRAVACAO', 'Erro ao registrar histórico de PIX', e);
    }
  }

  static atualizarStatusHistorico(id: string, novoStatus: 'IGNORADO' | 'CONFIRMADO' | 'DUPLICADO' | 'ERRO', obs?: string) {
    try {
      const historico = this.obterHistorico();
      const idx = historico.findIndex(h => h.id === id);
      if (idx !== -1) {
        historico[idx].status = novoStatus;
        if (obs) historico[idx].observacoes = obs;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(historico));
      }
    } catch (e: any) {
      PixLoggerService.logError('ERRO_GRAVACAO', 'Erro ao atualizar status do histórico de PIX', e);
    }
  }

  static limparHistorico(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (e: any) {
      PixLoggerService.logError('ERRO_GRAVACAO', 'Erro ao limpar histórico de PIX', e);
    }
  }
}

export const pixHistoryService = PixHistoryService;
