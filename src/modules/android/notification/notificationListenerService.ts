import { NativeNotificationPayload, AndroidServiceStatus } from '../types';
import { filterFinancialNotification } from './bankFilter';
import { permissionManager } from '../permissions/permissionManager';
import { androidLogger } from '../logs/androidLogger';
import { isDuplicateNotification } from '../receiver/duplicateChecker';
import { PixParserService, PixHistoryService } from '../../pix';

export class NotificationListenerService {
  private static instance: NotificationListenerService;
  private isRunning: boolean = true;
  private onPixDetectedCallback?: (payload: any) => void;

  private constructor() {
    this.loadState();
  }

  public static getInstance(): NotificationListenerService {
    if (!NotificationListenerService.instance) {
      NotificationListenerService.instance = new NotificationListenerService();
    }
    return NotificationListenerService.instance;
  }

  private loadState(): void {
    const saved = localStorage.getItem('wealthflow_android_monitoring_active');
    this.isRunning = saved !== null ? JSON.parse(saved) : true;
  }

  public iniciar(): void {
    this.isRunning = true;
    localStorage.setItem('wealthflow_android_monitoring_active', JSON.stringify(true));
    androidLogger.log('INFO', 'NotificationListenerService iniciado com sucesso.');
  }

  public parar(): void {
    this.isRunning = false;
    localStorage.setItem('wealthflow_android_monitoring_active', JSON.stringify(false));
    androidLogger.log('INFO', 'NotificationListenerService interrompido pelo usuário.', 'WARN');
  }

  public verificarPermissao(): boolean {
    const status = permissionManager.verificarPermissoes();
    return status.notificationAccess;
  }

  public solicitarPermissao(): boolean {
    return permissionManager.solicitarPermissao('notificationAccess');
  }

  public getStatus(): AndroidServiceStatus {
    const perms = permissionManager.verificarPermissoes();
    return {
      isRunning: this.isRunning,
      permissionGranted: perms.notificationAccess,
      backgroundExecutionAllowed: perms.backgroundExecution,
      autoStartEnabled: perms.autoStart
    };
  }

  public registerCallback(callback: (payload: any) => void): void {
    this.onPixDetectedCallback = callback;
  }

  public async receberNotificacao(payload: NativeNotificationPayload): Promise<void> {
    const startTime = performance.now();

    if (!this.isRunning) {
      return;
    }

    if (!this.verificarPermissao()) {
      androidLogger.log('PERMISSION_DENIED', 'Acesso a notificações negado ao processar notificação.', 'ERROR');
      return;
    }

    androidLogger.log('NOTIFICATION_RECEIVED', `Notificação recebida de ${payload.packageName}: ${payload.title}`, 'INFO', payload);

    // Filter financial notifications
    const filter = filterFinancialNotification(payload.packageName, payload.title, payload.text);

    if (!filter.isFinancial) {
      return;
    }

    const banco = filter.bankDetected || 'Banco Desconhecido';
    androidLogger.log('BANK_IDENTIFIED', `Banco identificado: ${banco}`, 'INFO', { banco });

    // Send to Parser
    await this.enviarParaParser(payload.text, banco, startTime);
  }

  public async enviarParaParser(textoOriginal: string, bancoIdentificado: string, startTime: number): Promise<void> {
    try {
      const parsed = PixParserService.interpretarTexto(textoOriginal);

      if (parsed.valor && parsed.valor > 0) {
        androidLogger.log('VALUE_IDENTIFIED', `Valor identificado: R$ ${parsed.valor.toFixed(2)}`, 'INFO', { valor: parsed.valor });
      } else {
        androidLogger.log('PARSER_ERROR', 'Não foi possível extrair um valor válido do texto da notificação.', 'WARN', { textoOriginal });
        return;
      }

      // Check Duplicates
      const dataAtual = new Date().toISOString().split('T')[0];
      const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      if (isDuplicateNotification(parsed.valor, bancoIdentificado, textoOriginal, dataAtual, horaAtual)) {
        return;
      }

      const processingTime = Math.round(performance.now() - startTime);
      androidLogger.log('PROCESSING_TIME', `Tempo de processamento da notificação: ${processingTime}ms`, 'INFO', undefined, processingTime);

      // Create PIX payload object
      const pixRecord = {
        id: `pix-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        valor: parsed.valor,
        tipo: parsed.tipo || 'DESPESA',
        categoria: 'Outros',
        banco: bancoIdentificado,
        descricao: `PIX - ${bancoIdentificado}`,
        nomePessoa: parsed.nomePessoa || '',
        data: dataAtual,
        hora: horaAtual,
        origem: 'PIX',
        status: 'PENDENTE' as const,
        textoOriginal
      };

      // Save to Pix history
      PixHistoryService.registrarHistorico({
        id: `pix-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        dataHora: new Date().toISOString(),
        banco: bancoIdentificado,
        valor: parsed.valor,
        textoRecebido: textoOriginal,
        resultadoInterpretacao: parsed,
        status: 'CONFIRMADO'
      });

      // Trigger dialogue callback if registered
      if (this.onPixDetectedCallback) {
        this.onPixDetectedCallback(pixRecord);
      }
    } catch (error: any) {
      androidLogger.log('PARSER_ERROR', `Erro durante análise da notificação: ${error?.message || error}`, 'ERROR');
    }
  }
}

export const notificationListenerService = NotificationListenerService.getInstance();
