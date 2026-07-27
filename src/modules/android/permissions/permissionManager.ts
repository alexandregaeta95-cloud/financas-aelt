import { androidLogger } from '../logs/androidLogger';

export interface PermissionStatus {
  notificationAccess: boolean;
  backgroundExecution: boolean;
  autoStart: boolean;
}

const PERMISSION_STORAGE_KEY = 'wealthflow_android_permissions';

export class PermissionManager {
  private static instance: PermissionManager;
  private status: PermissionStatus = {
    notificationAccess: true,
    backgroundExecution: true,
    autoStart: true
  };

  private constructor() {
    this.loadPermissions();
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager();
    }
    return PermissionManager.instance;
  }

  private loadPermissions(): void {
    try {
      const stored = localStorage.getItem(PERMISSION_STORAGE_KEY);
      if (stored) {
        this.status = JSON.parse(stored);
      }
    } catch (e) {
      console.error('Erro ao carregar permissões', e);
    }
  }

  public savePermissions(): void {
    try {
      localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(this.status));
    } catch (e) {
      console.error('Erro ao salvar permissões', e);
    }
  }

  public verificarPermissoes(): PermissionStatus {
    return { ...this.status };
  }

  public solicitarPermissao(type: keyof PermissionStatus): boolean {
    this.status[type] = true;
    this.savePermissions();
    androidLogger.log('INFO', `Permissão ${type} concedida pelo usuário.`);
    return true;
  }

  public revogarPermissao(type: keyof PermissionStatus): void {
    this.status[type] = false;
    this.savePermissions();
    androidLogger.log('PERMISSION_DENIED', `Permissão ${type} revogada ou negada.`, 'WARN');
  }

  public getInstructions(type: keyof PermissionStatus): string {
    switch (type) {
      case 'notificationAccess':
        return 'Vá para Configurações do Android > Apps e Notificações > Acesso Especial a Apps > Acesso a Notificações e ative o WealthFlow.';
      case 'backgroundExecution':
        return 'Vá para Configurações do Android > Bateria > Otimização da Bateria e remova o WealthFlow das restrições de segundo plano.';
      case 'autoStart':
        return 'Vá para Configurações do Fabricante (Xiaomi/Samsung/Motorola) > Início Automático / Auto-Start e habilite o WealthFlow.';
      default:
        return 'Verifique as configurações do sistema.';
    }
  }
}

export const permissionManager = PermissionManager.getInstance();
