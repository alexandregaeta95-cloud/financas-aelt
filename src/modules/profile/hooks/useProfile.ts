import { useState, useCallback, useEffect } from 'react';
import { UserProfileData } from '../types/profile';
import { profileService } from '../services/profileService';
import { validarEmail, validarTelefone } from '../utils/profileUtils';

export function useProfile() {
  const [profile, setProfile] = useState<UserProfileData>(() => profileService.carregarPerfil());

  const carregar = useCallback(() => {
    const loaded = profileService.carregarPerfil();
    setProfile(loaded);
    return loaded;
  }, []);

  const salvar = useCallback((data: Partial<UserProfileData>) => {
    const updated = profileService.salvarPerfil(data);
    setProfile(updated);
    return updated;
  }, []);

  const atualizar = useCallback((field: keyof UserProfileData, value: any) => {
    const updated = profileService.atualizarPerfil(field, value);
    setProfile(updated);
    return updated;
  }, []);

  const sincronizar = useCallback(async (token?: string) => {
    return await profileService.sincronizarGoogleSheets(token);
  }, []);

  const restaurar = useCallback(() => {
    const restored = profileService.restaurarPadrao();
    setProfile(restored);
    return restored;
  }, []);

  const validar = useCallback((): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];
    if (!profile.nome || profile.nome.trim().length < 2) {
      erros.push('Nome inválido ou muito curto.');
    }
    if (profile.email && !validarEmail(profile.email)) {
      erros.push('Formato de e-mail inválido.');
    }
    if (profile.telefone && !validarTelefone(profile.telefone)) {
      erros.push('Telefone deve conter de 10 a 11 dígitos.');
    }
    return {
      valido: erros.length === 0,
      erros
    };
  }, [profile]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return {
    profile,
    carregar,
    salvar,
    atualizar,
    sincronizar,
    restaurar,
    validar
  };
}
