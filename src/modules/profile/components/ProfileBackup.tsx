import React, { useState } from 'react';
import { uploadBackupToDrive } from '../../../lib/googleAuth';
import { profileService } from '../services/profileService';

interface ProfileBackupProps {
  googleToken?: string | null;
  showAlert?: (title: string, message: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export const ProfileBackup: React.FC<ProfileBackupProps> = ({
  googleToken,
  showAlert,
  showConfirm
}) => {
  const [isBackupBusy, setIsBackupBusy] = useState(false);

  const handleExportJson = () => {
    const json = profileService.exportarConfiguracoes();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_gestao_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (showAlert) showAlert("Exportação Concluída", "Arquivo JSON de backup baixado com sucesso!");
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        profileService.importarConfiguracoes(content);
        if (showAlert) showAlert("Importação Concluída", "Configurações e dados de perfil restaurados!");
      } catch (err: any) {
        if (showAlert) showAlert("Erro ao Importar", err.message || "Arquivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  const handleDriveBackup = async () => {
    if (!googleToken) {
      if (showAlert) showAlert("Google Auth", "Conecte sua conta Google para usar o backup em nuvem.");
      return;
    }
    try {
      setIsBackupBusy(true);
      const json = profileService.exportarConfiguracoes();
      await uploadBackupToDrive(googleToken, json);
      if (showAlert) showAlert("Backup no Google Drive", "Backup salvo na nuvem com sucesso!");
    } catch (e: any) {
      if (showAlert) showAlert("Erro no Backup", e.message || "Falha ao enviar backup para o Drive.");
    } finally {
      setIsBackupBusy(false);
    }
  };

  const handleRestoreDefaults = () => {
    if (showConfirm) {
      showConfirm(
        "Restaurar Padrões de Fábrica",
        "Esta ação limpará as configurações personalizadas. Continuar?",
        () => {
          profileService.restaurarPadrao();
          if (showAlert) showAlert("Restaurado", "Configurações restauradas para o padrão inicial.");
        }
      );
    }
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400">cloud_upload</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Backup &amp; Restauração em Nuvem</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">DRIVE SYNC</span>
      </div>

      <div className="space-y-3 text-xs">
        <button
          type="button"
          onClick={handleDriveBackup}
          disabled={isBackupBusy}
          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${isBackupBusy ? 'animate-spin' : ''}`}>cloud_sync</span>
          {isBackupBusy ? 'Enviando Backup...' : 'Salvar Backup Agora no Google Drive'}
        </button>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportJson}
            className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Exportar JSON Local
          </button>

          <label className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 px-3 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 text-center">
            <span className="material-symbols-outlined text-sm">upload</span>
            Importar JSON Local
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="w-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            Restaurar Configurações Padrão
          </button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileBackup);
