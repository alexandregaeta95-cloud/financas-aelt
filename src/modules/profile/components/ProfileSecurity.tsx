import React, { useState } from 'react';
import { SecurityConfig } from '../../../types';

interface ProfileSecurityProps {
  securityConfig: SecurityConfig;
  setSecurityConfig: React.Dispatch<React.SetStateAction<SecurityConfig>>;
  onTestLock: () => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileSecurity: React.FC<ProfileSecurityProps> = ({
  securityConfig,
  setSecurityConfig,
  onTestLock,
  showAlert
}) => {
  const [pinInput, setPinInput] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);

  const handleToggleRequireLock = (enabled: boolean) => {
    setSecurityConfig(prev => ({
      ...prev,
      requireAppLock: enabled
    }));
    if (showAlert) {
      showAlert('Bloqueio do App', enabled ? 'Bloqueio de tela ativado.' : 'Bloqueio de tela desativado.');
    }
  };

  const handleToggleBiometrics = (enabled: boolean) => {
    setSecurityConfig(prev => ({
      ...prev,
      biometricsEnabled: enabled,
      biometricsType: prev.biometricsType || 'FINGERPRINT'
    }));
    if (showAlert) {
      showAlert('Biometria', enabled ? 'Autenticação biométrica ativada.' : 'Autenticação biométrica desativada.');
    }
  };

  const handleSavePin = () => {
    if (pinInput.length < 4) {
      if (showAlert) showAlert('PIN Inválido', 'O PIN de segurança deve ter pelo menos 4 dígitos.');
      return;
    }
    setSecurityConfig(prev => ({
      ...prev,
      pinCode: pinInput,
      requireAppLock: true
    }));
    setPinInput('');
    setIsSettingPin(false);
    if (showAlert) showAlert('PIN Configurado', 'Código PIN de segurança atualizado.');
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-400">lock</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Segurança &amp; Autenticação</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">PROTEÇÃO</span>
      </div>

      <div className="space-y-4 text-xs">
        {/* Lock Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-slate-200">Exigir Bloqueio do App</p>
              <p className="text-[10px] text-slate-400">Solicitar autenticação ao reabrir</p>
            </div>
            <input
              type="checkbox"
              checked={securityConfig.requireAppLock || false}
              onChange={(e) => handleToggleRequireLock(e.target.checked)}
              className="accent-rose-500 w-4 h-4 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <div>
              <p className="font-bold text-slate-200">Autenticação Biométrica</p>
              <p className="text-[10px] text-slate-400">Digital / Face ID do dispositivo</p>
            </div>
            <input
              type="checkbox"
              checked={securityConfig.biometricsEnabled || false}
              onChange={(e) => handleToggleBiometrics(e.target.checked)}
              className="accent-rose-500 w-4 h-4 cursor-pointer"
            />
          </div>
        </div>

        {/* PIN setup block */}
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-slate-200">Código PIN de Acesso</p>
              <p className="text-[10px] text-slate-400">
                {securityConfig.pinCode ? 'PIN de 4-6 dígitos configurado' : 'Nenhum PIN definido'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSettingPin(!isSettingPin)}
              className="text-xs text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
            >
              {isSettingPin ? 'Cancelar' : 'Alterar PIN'}
            </button>
          </div>

          {isSettingPin && (
            <div className="flex gap-2 pt-1">
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Novo PIN (ex: 1234)"
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-white outline-none focus:border-rose-500 font-mono text-xs flex-1"
              />
              <button
                type="button"
                onClick={handleSavePin}
                className="bg-rose-500 hover:bg-rose-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-all"
              >
                Salvar PIN
              </button>
            </div>
          )}
        </div>

        {/* Test Lock Action */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onTestLock}
            className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">lock_reset</span>
            Testar Tela de Bloqueio Agora
          </button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileSecurity);
