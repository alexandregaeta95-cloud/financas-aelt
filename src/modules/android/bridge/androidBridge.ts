import { NativeNotificationPayload } from '../types';
import { notificationListenerService } from '../notification/notificationListenerService';
import { androidLogger } from '../logs/androidLogger';

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

    androidLogger.log('INFO', 'Android Native Bridge inicializado com sucesso.');
  }

  public isNativeEnvironment(): boolean {
    return typeof window !== 'undefined' && !!window.AndroidNativeBridge;
  }

  public sendNotificationToService(payload: NativeNotificationPayload): void {
    notificationListenerService.receberNotificacao(payload);
  }
}

export const androidBridge = AndroidBridge.getInstance();

