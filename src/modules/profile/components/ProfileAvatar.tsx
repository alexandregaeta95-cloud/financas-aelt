import React, { useState, useRef } from 'react';

interface ProfileAvatarProps {
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarUrl,
  onAvatarChange,
  showAlert
}) => {
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [photoUrlInput, setPhotoUrlInput] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 300;
      canvas.height = videoRef.current.videoHeight || 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        onAvatarChange(dataUrl);
        setIsCameraActive(false);
        setIsEditingPhoto(false);
        if (showAlert) showAlert("Sucesso", "Foto capturada e atualizada com sucesso!");
      }
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <button
        type="button"
        onClick={() => setIsEditingPhoto(!isEditingPhoto)}
        className="mt-2 text-[11px] font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-xs">{isEditingPhoto ? 'expand_less' : 'edit'}</span>
        {isEditingPhoto ? 'Fechar Editor' : 'Alterar Foto de Perfil'}
      </button>

      {isEditingPhoto && (
        <div className="w-full max-w-lg mt-4 p-4 bg-slate-950/80 border border-slate-800/60 rounded-xl text-left space-y-4 animate-fade-in">
          <div className="flex justify-between items-center pb-2 border-b border-slate-900">
            <span className="text-xs font-bold text-white uppercase tracking-wider">Configurar Foto</span>
            <button 
              type="button"
              onClick={() => setIsEditingPhoto(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>

          {/* Option 1: File Upload */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Enviar do seu Dispositivo</span>
            <label className="flex items-center justify-center gap-2 border border-dashed border-slate-800 hover:border-sky-500 hover:bg-slate-900/40 p-3 rounded-lg cursor-pointer transition-all active:scale-98">
              <span className="material-symbols-outlined text-sky-400 text-base">cloud_upload</span>
              <span className="text-[10px] font-bold text-slate-200">Escolher Arquivo Local</span>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (typeof reader.result === 'string') {
                        onAvatarChange(reader.result);
                        if (showAlert) showAlert("Sucesso", "Foto de perfil atualizada com sucesso!");
                      }
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
            </label>
          </div>

          {/* Option 2: Tirar uma Foto com a Câmera */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">2. Tirar Foto com a Câmera</span>
            {!isCameraActive ? (
              <button
                type="button"
                onClick={() => setIsCameraActive(true)}
                className="w-full flex items-center justify-center gap-2 border border-dashed border-slate-800 hover:border-emerald-500 hover:bg-slate-900/40 p-3 rounded-lg cursor-pointer transition-all active:scale-98 text-slate-200"
              >
                <span className="material-symbols-outlined text-emerald-400 text-base">photo_camera</span>
                <span className="text-[10px] font-bold">Ativar Câmera e Capturar</span>
              </button>
            ) : (
              <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-3">
                <div className="relative aspect-square max-w-[200px] mx-auto rounded-full overflow-hidden border-2 border-emerald-500 bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
                {cameraError && (
                  <p className="text-[10px] text-rose-400 text-center font-semibold">{cameraError}</p>
                )}
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">photo_camera</span>
                    Capturar Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCameraActive(false)}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-xs">close</span>
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 3: Presets */}
          <div className="space-y-2">
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">3. Escolher do Banco Premium</span>
            <div className="flex justify-between items-center gap-2 bg-slate-900/40 p-2 rounded-lg">
              {[
                { name: "Org", url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDclcawui2tKuHgw4p_DWvKBp0R7XYoJIo41kp-qWXzNhTbDso-7IAoirqhYyc-HEWXFiHIGP6YdyvyG4u4xgKT0ecq0uBLAJEXGIxgaymfedUvUw5PmlAfsh600Je_GbTdL8UgPj2BZ18ovSoiV_-08bm1CxxuR-RaAO569na_pVi2ObUv5FfHdqk1JhAf68RSSZF5WqsPDCCmYfWunTzLuQcRHOJn29EvtKwGGBucDh8ZAdyadLyd" },
                { name: "M", url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
                { name: "W", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
                { name: "Exec", url: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" },
                { name: "Crea", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" }
              ].map((preset, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    onAvatarChange(preset.url);
                    if (showAlert) showAlert("Sucesso", "Foto de perfil atualizada com sucesso!");
                  }}
                  className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all hover:scale-105 active:scale-95 ${
                    avatarUrl === preset.url ? 'border-sky-400 ring-1 ring-sky-400/20' : 'border-slate-800 hover:border-slate-600'
                  }`}
                  title={preset.name}
                >
                  <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Option 4: URL */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (photoUrlInput.trim().startsWith('http')) {
                onAvatarChange(photoUrlInput.trim());
                setPhotoUrlInput('');
                setIsEditingPhoto(false);
                if (showAlert) showAlert("Sucesso", "Foto de perfil atualizada com sucesso!");
              } else if (showAlert) {
                showAlert("Link Inválido", "Por favor, insira um link (URL) de imagem válido.");
              }
            }}
            className="space-y-1.5"
          >
            <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">4. Colar Link de Imagem (URL)</span>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={photoUrlInput}
                onChange={(e) => setPhotoUrlInput(e.target.value)}
                placeholder="https://exemplo.com/foto.jpg"
                className="flex-grow bg-slate-900 border border-slate-850 text-[11px] px-3 py-1.5 rounded-lg outline-none focus:border-sky-500 text-slate-100 placeholder-slate-600 font-mono"
              />
              <button
                type="submit"
                className="bg-sky-400 hover:bg-sky-300 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer active:scale-95"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProfileAvatar);
