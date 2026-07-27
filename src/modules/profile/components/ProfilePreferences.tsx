import React from 'react';
import { UserProfileData } from '../types/profile';

interface ProfilePreferencesProps {
  profile: UserProfileData;
  onUpdate: (data: Partial<UserProfileData>) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfilePreferences: React.FC<ProfilePreferencesProps> = ({
  profile,
  onUpdate,
  showAlert
}) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-400">tune</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Preferências Gerais</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">REGIONAL</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Idioma do Sistema</label>
          <select
            value={profile.idioma || 'pt-BR'}
            onChange={(e) => {
              onUpdate({ idioma: e.target.value });
              if (showAlert) showAlert('Idioma Atualizado', 'Preferência de idioma salva.');
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500 font-mono"
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en-US">English (United States)</option>
            <option value="es-ES">Español</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Moeda Principal</label>
          <select
            value={profile.moeda || 'BRL'}
            onChange={(e) => {
              onUpdate({ moeda: e.target.value });
              if (showAlert) showAlert('Moeda Atualizada', 'Preferência de moeda salva.');
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500 font-mono"
          >
            <option value="BRL">R$ (Real Brasileiro - BRL)</option>
            <option value="USD">$ (Dólar Americano - USD)</option>
            <option value="EUR">€ (Euro - EUR)</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Região / País</label>
          <input
            type="text"
            value={profile.regiao || 'Brasil'}
            onChange={(e) => onUpdate({ regiao: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500 font-mono"
            placeholder="Brasil"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Formato de Data</label>
          <select
            value={profile.formatoData || 'DD/MM/YYYY'}
            onChange={(e) => {
              onUpdate({ formatoData: e.target.value });
              if (showAlert) showAlert('Formato de Data', 'Preferência salva.');
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-sky-500 font-mono"
          >
            <option value="DD/MM/YYYY">DD/MM/AAAA (ex: 23/07/2026)</option>
            <option value="YYYY-MM-DD">AAAA-MM-DD (ex: 2026-07-23)</option>
            <option value="MM/DD/YYYY">MM/DD/AAAA (ex: 07/23/2026)</option>
          </select>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfilePreferences);
