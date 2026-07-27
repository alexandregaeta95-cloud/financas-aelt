import { NativeNotificationPayload } from '../types';
import { notificationListenerService } from '../notification/notificationListenerService';
import { androidLogger } from '../logs/androidLogger';
import { PixNotificationPlugin, PixNotificationData } from '../plugins/pixNotificationPlugin';
import { PixNotificationService } from '../../pix/services/pixNotificationService';

declare global {
  interface Window {
    AndroidNativeBridge?: {
      postNotification: (jsonPayload: string) => void;
      getServiceStatus: () => string;
      startListener: () => void;
      stopListener: () => void;
    };
    onNativeNotificationReceived?: (payload: NativeNotificationPayload) => void;
  }
}

export class AndroidBridge {
  private static instance: AndroidBridge;

  private constructor() {
    this.initNativeListener();
  }

  public static getInstance(): AndroidBridge {
    if (!AndroidBridge.instance) {
      AndroidBridge.instance = new AndroidBridge();
    }
    return AndroidBridge.instance;
  }

  private initNativeListener(): void {
    // Expose window callback for native Android runtime injection
    window.onNativeNotificationReceived = (payload: NativeNotificationPayload) => {
      notificationListenerService.receberNotificacao(payload);
    };

    // Register Capacitor Native Plugin Listener
    try {
      PixNotificationPlugin.addListener('pixNotificationReceived', (data: PixNotificationData) => {
        androidLogger.log('NOTIFICATION_RECEIVED', `Notificação PIX nativa recebida de ${data.banco || data.packageName}: R$ ${data.valor}`, 'INFO', data);

        // Send to NotificationListenerService for Android logging
        notificationListenerService.receberNotificacao({
          id: `native-${Date.now()}`,
          packageName: data.packageName || 'android.bank',
          bankName: data.banco || 'Banco',
          title: `PIX ${data.tipo || 'RECEBIDO'}`,
          text: data.textoOriginal || `PIX de R$ ${data.valor}`,
          timestamp: new Date().toISOString()
        });

        // Send to PIX Assistant so dialog opens with prefilled fields awaiting user confirmation
        PixNotificationService.detectarNotificacao({
          id: `pix-native-${Date.now()}`,
          titulo: `PIX ${data.banco || ''}`,
          texto: data.textoOriginal || `Você recebeu um Pix de R$ ${data.valor} de ${data.nomePessoa || ''}`,
          appPacote: data.packageName,
          dataHora: new Date().toISOString()
        });
      });
    } catch (e) {
      console.warn("Capacitor PixNotificationPlugin listener not supported in web preview:", e);
    }

    androidLogger.log('INFO', 'Android Native Bridge e Plugin Capacitor PIX inicializados com sucesso.');
  }

  public isNativeEnvironment(): boolean {
    return typeof window !== 'undefined' && !!window.AndroidNativeBridge;
  }

  public sendNotificationToService(payload: NativeNotificationPayload): void {
    notificationListenerService.receberNotificacao(payload);
  }
}

export const androidBridge = AndroidBridge.getInstance();

