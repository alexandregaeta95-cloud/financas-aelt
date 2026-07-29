import { NativeNotificationPayload, AndroidServiceStatus } from '../types';
import { filterFinancialNotification } from './bankFilter';
import { permissionManager } from '../permissions/permissionManager';
import { androidLogger } from '../logs/androidLogger';

export class NotificationListenerService {
  private static instance: NotificationListenerService;
  private isRunning: boolean = true;

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

  public async receberNotificacao(payload: NativeNotificationPayload): Promise<void> {
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
  }
}

export const notificationListenerService = NotificationListenerService.getInstance();
