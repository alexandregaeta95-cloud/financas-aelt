import React, { useState, useEffect } from 'react';
import { backgroundServiceManager } from '../service/backgroundService';
import { permissionManager } from '../permissions/permissionManager';
import { notificationListenerService } from '../notification/notificationListenerService';
import { AndroidSettings } from '../types';
import { PixNotificationPlugin } from '../plugins/pixNotificationPlugin';

export const AndroidSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AndroidSettings>(() => backgroundServiceManager.getSettings());
  const [permissions, setPermissions] = useState(() => permissionManager.verificarPermissoes());

  const handleToggle = (key: keyof AndroidSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    backgroundServiceManager.saveSettings(updated);

    if (key === 'monitoramentoAtivo') {
      if (updated.monitoramentoAtivo) {
        notificationListenerService.iniciar();
      } else {
        notificationListenerService.parar();
      }
    }
  };

  const handleGrantPermission = async (type: 'notificationAccess' | 'backgroundExecution' | 'autoStart') => {
    if (type === 'notificationAccess') {
      try {
        await PixNotificationPlugin.requestPermission();
      } catch (e) {
        console.warn('Erro ao solicitar permissão nativa de notificação:', e);
      }
    } else if (type === 'backgroundExecution') {
      try {
        await PixNotificationPlugin.requestBatteryOptimizationIgnore();
      } catch (e) {
        console.warn('Erro ao solicitar isenção de otimização de bateria:', e);
      }
    }
    permissionManager.solicitarPermissao(type);
    setPermissions(permissionManager.verificarPermissoes());
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <span className="material-symbols-outlined text-amber-400 text-xl">phone_android</span>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Configurações Nativas Android
            </h4>
            <p className="text-[11px] text-slate-400">
              Ajuste as preferências do listener de notificações e execução em segundo plano.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Monitoramento Ativo</span>
              <span className="text-[10px] text-slate-400 block">Detectar notificações PIX em tempo real</span>
            </div>
            <input
              type="checkbox"
              checked={settings.monitoramentoAtivo}
              onChange={() => handleToggle('monitoramentoAtivo')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Mostrar Notificações</span>
              <span className="text-[10px] text-slate-400 block">Exibir alertas flutuantes e prévias</span>
            </div>
            <input
              type="checkbox"
              checked={settings.mostrarNotificacoes}
              onChange={() => handleToggle('mostrarNotificacoes')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Abrir Automaticamente</span>
              <span className="text-[10px] text-slate-400 block">Exibir o diálogo com dados pré-preenchidos</span>
            </div>
            <input
              type="checkbox"
              checked={settings.abrirAutomaticamente}
              onChange={() => handleToggle('abrirAutomaticamente')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Registrar Histórico</span>
              <span className="text-[10px] text-slate-400 block">Gravar registros capturados do PIX</span>
            </div>
            <input
              type="checkbox"
              checked={settings.registrarHistorico}
              onChange={() => handleToggle('registrarHistorico')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Registrar Logs</span>
              <span className="text-[10px] text-slate-400 block">Auditoria detalhada de tempo e erros</span>
            </div>
            <input
              type="checkbox"
              checked={settings.registrarLogs}
              onChange={() => handleToggle('registrarLogs')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          <div className="p-3 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Executar em Segundo Plano</span>
              <span className="text-[10px] text-slate-400 block">Manter serviço ativo mesmo com app fechado</span>
            </div>
            <input
              type="checkbox"
              checked={settings.executarSegundoPlano}
              onChange={() => handleToggle('executarSegundoPlano')}
              className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono border-b border-slate-800 pb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400 text-lg">verified_user</span>
          Status de Permissões do Aparelho (Android 10+)
        </h4>

        <div className="space-y-3">
          <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Acesso às Notificações</span>
              <span className="text-[10px] text-slate-400 block">
                {permissionManager.getInstructions('notificationAccess')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleGrantPermission('notificationAccess')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                permissions.notificationAccess
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              {permissions.notificationAccess ? 'Concedida' : 'Conceder'}
            </button>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Execução em Segundo Plano</span>
              <span className="text-[10px] text-slate-400 block">
                {permissionManager.getInstructions('backgroundExecution')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleGrantPermission('backgroundExecution')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                permissions.backgroundExecution
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              {permissions.backgroundExecution ? 'Concedida' : 'Conceder'}
            </button>
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-850 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">Inicialização Automática</span>
              <span className="text-[10px] text-slate-400 block">
                {permissionManager.getInstructions('autoStart')}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleGrantPermission('autoStart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                permissions.autoStart
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500 text-slate-950'
              }`}
            >
              {permissions.autoStart ? 'Concedida' : 'Conceder'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
