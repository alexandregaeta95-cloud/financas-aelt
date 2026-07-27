import React, { useState } from 'react';
import { UserProfileData } from '../types/profile';

interface ProfilePersonalInfoProps {
  profile: UserProfileData;
  onUpdate: (data: Partial<UserProfileData>) => void;
  showAlert?: (title: string, message: string) => void;
}

export const ProfilePersonalInfo: React.FC<ProfilePersonalInfoProps> = ({
  profile,
  onUpdate,
  showAlert
}) => {
  const [formData, setFormData] = useState({
    nome: profile.nome || 'Alexandre Gaeta',
    email: profile.email || 'alexandre.gaeta@example.com',
    telefone: profile.telefone || '(11) 98765-4321',
    empresa: profile.empresa || 'Gestão de Frotas & Finanças',
    documento: profile.documento || '123.456.789-00'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
    if (showAlert) {
      showAlert('Perfil Atualizado', 'Informações pessoais salvas com sucesso.');
    }
  };

  return (
    <section className="bg-slate-900/40 border border-slate-800 p-5 rounded-2xl space-y-4">
      <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-400">badge</span>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider font-display">Informações Pessoais</h3>
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">DADOS DO TITULAR</span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Nome Completo</label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            placeholder="Nome Completo"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">E-mail Corporativo/Pessoal</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            placeholder="email@dominio.com"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Telefone / WhatsApp</label>
          <input
            type="text"
            name="telefone"
            value={formData.telefone}
            onChange={handleChange}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            placeholder="(11) 99999-9999"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-400 font-medium">Empresa / Organização</label>
          <input
            type="text"
            name="empresa"
            value={formData.empresa}
            onChange={handleChange}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            placeholder="Nome da empresa"
          />
        </div>

        <div className="sm:col-span-2 space-y-1">
          <label className="block text-slate-400 font-medium">CPF / CNPJ</label>
          <input
            type="text"
            name="documento"
            value={formData.documento}
            onChange={handleChange}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
            placeholder="000.000.000-00"
          />
        </div>

        <div className="sm:col-span-2 pt-2 flex justify-end">
          <button
            type="submit"
            className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            Salvar Alterações
          </button>
        </div>
      </form>
    </section>
  );
};

export default React.memo(ProfilePersonalInfo);
