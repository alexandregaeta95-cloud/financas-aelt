import React, { useState } from 'react';
import { InfractionUrgencyColors } from '../types/profile';
import { DEFAULT_INFRACTION_URGENCY_COLORS, INFRACTION_SWATCH_COLORS, PRESET_COLOR_THEMES } from '../utils/profileUtils';

interface ProfileAppearanceProps {
  showAlert?: (title: string, message: string) => void;
}

export const ProfileAppearance: React.FC<ProfileAppearanceProps> = ({ showAlert }) => {
  const [themeMode, setThemeMode] = useState<'dark' | 'light' | 'system'>('dark');
  const [urgencyColors, setUrgencyColors] = useState<InfractionUrgencyColors>(DEFAULT_INFRACTION_URGENCY_COLORS);

  const applyPresetTheme = (colors: InfractionUrgencyColors) => {
    setUrgencyColors(colors);
    if (showAlert) showAlert("Tema Aplicado", "Paleta de cores de infrações atualizada!");
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-5">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-400">palette</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Aparência &amp; Personalização Visual</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">CUSTOMIZÁVEL</span>
      </div>

      <div className="space-y-4 text-xs">
        {/* Theme mode selection */}
        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Tema Visual da Interface</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'dark', label: 'Escuro (Dark)', icon: 'dark_mode' },
              { id: 'light', label: 'Claro (Light)', icon: 'light_mode' },
              { id: 'system', label: 'Automático (Sistema)', icon: 'settings_brightness' }
            ].map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setThemeMode(t.id as any);
                  if (showAlert) showAlert("Tema Visual", `Modo ${t.label} selecionado.`);
                }}
                className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 font-bold text-[11px] transition-all cursor-pointer ${
                  themeMode === t.id 
                    ? 'bg-purple-500/20 border-purple-500 text-purple-300' 
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-base">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Infraction Preset Themes */}
        <div className="space-y-2 pt-2">
          <label className="block text-slate-400 font-medium">Paleta de Cores de Gravidade de Infrações</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESET_COLOR_THEMES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPresetTheme(preset.colors)}
                className="p-2.5 bg-slate-950/60 border border-slate-800 hover:border-purple-500/50 rounded-xl flex items-center justify-between transition-all cursor-pointer text-left"
              >
                <span className="font-bold text-slate-200">{preset.name}</span>
                <div className="flex gap-1">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.gravissima }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.grave }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.media }} />
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.colors.leve }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileAppearance);
