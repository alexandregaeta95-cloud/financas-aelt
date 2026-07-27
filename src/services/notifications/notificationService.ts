export class NotificationService {
  static async solicitarPermissao(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  }

  static async dispararNotificacao(modulo: string, mensagem: string): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }

    if (perm !== 'granted') {
      return false;
    }

    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification(`WealthFlow • ${modulo}`, {
          body: mensagem,
          icon: '/favicon.ico',
          tag: `notif-${Date.now()}`
        });
      } else {
        new Notification(`WealthFlow • ${modulo}`, { body: mensagem, icon: '/favicon.ico' });
      }
      return true;
    } catch (e) {
      console.error('Erro ao disparar notificação:', e);
      return false;
    }
  }
}

export const notificationService = NotificationService;
