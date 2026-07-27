import React, { useState } from 'react';

interface ProfileOCRProps {
  showAlert?: (title: string, message: string) => void;
}

export const ProfileOCR: React.FC<ProfileOCRProps> = ({ showAlert }) => {
  const [ocrAutoProcess, setOcrAutoProcess] = useState(true);
  const [ocrEnhanceContrast, setOcrEnhanceContrast] = useState(true);

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-teal-400">document_scanner</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">OCR &amp; Scanner de Comprovantes</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-teal-400 bg-teal-500/10 border border-teal-500/20 px-2 py-0.5 rounded">LEITURA ÓPTICA</span>
      </div>

      <div className="space-y-3 text-xs">
        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Processamento Automático ao Capturar Foto</p>
            <p className="text-[10px] text-slate-400">Extrai valor, data e estabelecimento instantaneamente</p>
          </div>
          <input
            type="checkbox"
            checked={ocrAutoProcess}
            onChange={(e) => setOcrAutoProcess(e.target.checked)}
            className="accent-teal-500 w-4 h-4 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div>
            <p className="font-bold text-slate-200">Realce de Contraste Óptico</p>
            <p className="text-[10px] text-slate-400">Filtro para recibos térmicos apagados ou com pouca luz</p>
          </div>
          <input
            type="checkbox"
            checked={ocrEnhanceContrast}
            onChange={(e) => setOcrEnhanceContrast(e.target.checked)}
            className="accent-teal-500 w-4 h-4 cursor-pointer"
          />
        </div>
      </div>
    </section>
  );
};

export default React.memo(ProfileOCR);
