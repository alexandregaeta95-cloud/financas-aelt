import { registerPlugin } from '@capacitor/core';

export interface PixNotificationData {
  isFinancial: boolean;
  textoOriginal: string;
  packageName: string;
  banco: string;
  valor: number;
  tipo: 'RECEBIDO' | 'ENVIADO';
  nomePessoa: string;
  data: string;
  hora: string;
  timestamp: number;
}

export interface PixNotificationPluginInterface {
  isPermissionGranted(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ requested: boolean }>;
  startService(): Promise<{ status: string }>;
  stopService(): Promise<{ status: string }>;
  getServiceStatus(): Promise<{
    isRunning: boolean;
    permissionGranted: boolean;
    batteryOptimizationIgnored: boolean;
  }>;
  requestBatteryOptimizationIgnore(): Promise<{ success: boolean }>;
  addListener(
    eventName: 'pixNotificationReceived',
    listenerFunc: (data: PixNotificationData) => void
  ): Promise<{ remove: () => void }>;
}

export const PixNotificationPlugin = registerPlugin<PixNotificationPluginInterface>('PixNotification', {
  web: {
    isPermissionGranted: async () => ({ granted: true }),
    requestPermission: async () => ({ requested: true }),
    startService: async () => ({ status: 'STARTED' }),
    stopService: async () => ({ status: 'STOPPED' }),
    getServiceStatus: async () => ({
      isRunning: true,
      permissionGranted: true,
      batteryOptimizationIgnored: true
    }),
    requestBatteryOptimizationIgnore: async () => ({ success: true }),
    addListener: async () => ({ remove: () => {} })
  }
});
