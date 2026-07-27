import { PixHistory, PixNotification, PixTransaction } from '../types';
import { PixLoggerService } from './pixLoggerService';
import { PixParserService } from './pixParserService';
import { PixHistoryService } from '../history/pixHistoryService';
import { validarDuplicidade } from '../utils/pixUtils';

export class PixNotificationService {
  private static monitorando: boolean = false;
  private static listeners: ((pix: PixTransaction) => void)[] = [];

  static iniciarMonitoramento(): void {
    this.monitorando = true;
    PixLoggerService.logInfo('Monitoramento de notificações PIX iniciado.');

    // Attach global Android Webview bridge methods if running inside browser or Android Webview
    if (typeof window !== 'undefined') {
      (window as any).onPixNotificationReceived = (texto: string, pacote?: string) => {
        PixLoggerService.logInfo('Notificação PIX recebida via Android Webview Bridge:', { texto, pacote });
        return this.detectarNotificacao({
          id: `notif-${Date.now()}`,
          appPacote: pacote,
          titulo: 'Notificação do Banco',
          texto,
          dataHora: new Date().toISOString()
        });
      };

      // Listen for postMessage from Android WebView or ServiceWorker
      window.addEventListener('message', (event) => {
        if (event.data && (event.data.type === 'PIX_NOTIFICATION' || event.data.type === 'ANDROID_NOTIFICATION')) {
          const payload = event.data.payload || event.data;
          const texto = payload.texto || payload.message || payload.body || '';
          const pacote = payload.pacote || payload.package;
          if (texto) {
            this.detectarNotificacao({
              id: `notif-${Date.now()}`,
              appPacote: pacote,
              titulo: payload.titulo || 'Notificação do Banco',
              texto,
              dataHora: new Date().toISOString()
            });
          }
        }
      });
    }
  }

  static pararMonitoramento(): void {
    this.monitorando = false;
    PixLoggerService.logInfo('Monitoramento de notificações PIX parado.');
  }

  static isMonitorando(): boolean {
    return this.monitorando;
  }

  static onPixDetectado(callback: (pix: PixTransaction) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  static detectarNotificacao(input: PixNotification | string): PixTransaction | null {
    if (!this.monitorando) {
      PixLoggerService.logInfo('Notificação ignorada pois o monitoramento está desativado.');
      return null;
    }

    try {
      let notifObj: PixNotification;
      if (typeof input === 'string') {
        notifObj = {
          id: `notif-${Date.now()}`,
          titulo: 'Notificação do Banco',
          texto: input,
          dataHora: new Date().toISOString()
        };
      } else {
        notifObj = input;
      }

      if (!this.validarNotificacao(notifObj)) {
        PixLoggerService.logInfo('Notificação não é um PIX válido.', notifObj);
        return null;
      }

      const pix = this.extrairDados(notifObj);

      // Verificar duplicidade
      const eDuplicado = this.verificarDuplicidade(pix);
      if (eDuplicado) {
        pix.status = 'DUPLICADO';
        this.registrarHistorico({
          id: `hist-${Date.now()}`,
          dataHora: new Date().toISOString(),
          banco: pix.banco,
          valor: pix.valor,
          textoRecebido: pix.textoOriginal,
          resultadoInterpretacao: pix,
          status: 'DUPLICADO',
          observacoes: 'Notificação duplicada ignorada'
        });
        PixLoggerService.logInfo('Notificação PIX duplicada detectada.', pix);
        return pix;
      }

      // Disparar ouvintes
      this.listeners.forEach(listener => {
        try {
          listener(pix);
        } catch (err: any) {
          PixLoggerService.logError('ERRO_ABERTURA_TELA', 'Erro ao notificar ouvintes de PIX', err);
        }
      });

      return pix;
    } catch (e: any) {
      PixLoggerService.logError('ERRO_LEITURA', 'Erro ao detectar notificação PIX', e);
      return null;
    }
  }

  static validarNotificacao(notif: PixNotification): boolean {
    if (!notif || !notif.texto) return false;
    const texto = notif.texto.toLowerCase();
    const titulo = (notif.titulo || '').toLowerCase();
    return (
      texto.includes('pix') ||
      titulo.includes('pix') ||
      texto.includes('transferencia') ||
      texto.includes('recebeu') ||
      texto.includes('enviou')
    );
  }

  static extrairDados(notif: PixNotification): PixTransaction {
    return PixParserService.interpretarTexto(notif.texto, notif.appPacote);
  }

  static verificarDuplicidade(pix: PixTransaction): boolean {
    const historico = PixHistoryService.obterHistorico();
    return validarDuplicidade(pix, historico);
  }

  static registrarHistorico(item: PixHistory): void {
    PixHistoryService.registrarHistorico(item);
  }
}

export const pixNotificationService = PixNotificationService;
