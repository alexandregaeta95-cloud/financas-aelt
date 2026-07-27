import React, { useState, useEffect } from 'react';
import { PixSettings } from '../types';
import { PixRuleEngine } from '../services/pixRuleEngine';
import { PixLoggerService } from '../services/pixLoggerService';

const STORAGE_KEY = 'wealthflow_pix_settings';

export const DEFAULT_PIX_SETTINGS: PixSettings = {
  ativarMonitoramento: true,
  mostrarConfirmacao: true,
  registrarHistorico: true,
  detectarDuplicados: true,
  ativarSugestoesInteligentes: true
};

export function obterPixSettings(): PixSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_PIX_SETTINGS;
  } catch {
    return DEFAULT_PIX_SETTINGS;
  }
}

export function salvarPixSettings(settings: PixSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e: any) {
    PixLoggerService.logError('ERRO_GRAVACAO', 'Erro ao salvar configurações do PIX', e);
  }
}

export function PixSettingsView() {
  const [settings, setSettings] = useState<PixSettings>(obterPixSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleToggle = (key: keyof PixSettings) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    salvarPixSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            ⚙️ Configurações do Assistente PIX
          </h3>
          <p className="text-xs text-slate-400">
            Ajuste os parâmetros de detecção e confirmação automática de notificações PIX.
          </p>
        </div>
        {savedSuccess && (
          <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-lg animate-fade-in">
            ✓ Configurações salvas
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Toggle 1: Ativar monitoramento */}
        <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div>
            <div className="text-sm font-semibold text-slate-200">Ativar monitoramento</div>
            <p className="text-xs text-slate-400">
              Escuta ativamente notificações e comprovantes de bancos em tempo real.
            </p>
          </div>
          <button
            onClick={() => handleToggle('ativarMonitoramento')}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.ativarMonitoramento ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.ativarMonitoramento ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Toggle 2: Mostrar confirmação */}
        <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div>
            <div className="text-sm font-semibold text-slate-200">Mostrar confirmação</div>
            <p className="text-xs text-slate-400">
              Abre o diálogo interativo do PIX para escolha do tipo de lançamento antes de salvar.
            </p>
          </div>
          <button
            onClick={() => handleToggle('mostrarConfirmacao')}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.mostrarConfirmacao ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.mostrarConfirmacao ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Toggle 3: Registrar histórico */}
        <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div>
            <div className="text-sm font-semibold text-slate-200">Registrar histórico</div>
            <p className="text-xs text-slate-400">
              Mantém registro no histórico de todas as notificações recebidas e interpretadas.
            </p>
          </div>
          <button
            onClick={() => handleToggle('registrarHistorico')}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.registrarHistorico ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.registrarHistorico ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Toggle 4: Detectar duplicados */}
        <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div>
            <div className="text-sm font-semibold text-slate-200">Detectar duplicados</div>
            <p className="text-xs text-slate-400">
              Evita lançamentos duplicados quando o banco envia múltiplas notificações para o mesmo PIX.
            </p>
          </div>
          <button
            onClick={() => handleToggle('detectarDuplicados')}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.detectarDuplicados ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.detectarDuplicados ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* Toggle 5: Ativar sugestões inteligentes */}
        <div className="flex items-center justify-between p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50">
          <div>
            <div className="text-sm font-semibold text-slate-200">Ativar sugestões inteligentes</div>
            <p className="text-xs text-slate-400">
              Sugere automaticamente a categoria e descrição com base nas regras de termos-chave.
            </p>
          </div>
          <button
            onClick={() => handleToggle('ativarSugestoesInteligentes')}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              settings.ativarSugestoesInteligentes ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                settings.ativarSugestoesInteligentes ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

export default PixSettingsView;
