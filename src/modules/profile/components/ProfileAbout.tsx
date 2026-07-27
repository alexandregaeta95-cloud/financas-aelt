import React from 'react';

interface ProfileAboutProps {
  showAlert?: (title: string, message: string) => void;
}

export const ProfileAbout: React.FC<ProfileAboutProps> = ({ showAlert }) => {
  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sky-400">info</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Sobre o Aplicativo &amp; Licença</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">v2.5.0 ENTERPRISE</span>
      </div>

      <div className="space-y-3 text-xs text-slate-300">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
          <p className="font-bold text-white text-sm">Gestão de Frotas &amp; Finanças Pessoais Pro</p>
          <p className="text-[11px] text-slate-400">
            Plataforma corporativa unificada para controle financeiro, frotas veiculares, licenciamentos, zoneamento de risco GPS e inteligência artificial Gemini.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-medium">Versão do Build</span>
            <span className="font-mono font-bold text-emerald-400">v2.5.0-release.2026</span>
          </div>

          <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800">
            <span className="text-slate-400 block font-medium">Licenciamento</span>
            <span className="font-mono font-bold text-sky-400">Licença Comercial Ativa</span>
          </div>
        </div>

        <div className="pt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
          <span>© 2026 Todos os direitos reservados.</span>
          <button
            type="button"
            onClick={() => {
              if (showAlert) showAlert("Verificação de Atualização", "Você já está na versão mais recente (v2.5.0).");
            }}
            className="text-sky-400 hover:underline cursor-pointer"
          >
            Buscar Atualizações
          </button>
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileAbout);
