import { UserProfileData } from '../types/profile';

const DEFAULT_PROFILE: UserProfileData = {
  nome: 'Alexandre Gaeta',
  email: 'alexandre.gaeta@example.com',
  telefone: '(11) 98765-4321',
  empresa: 'Gestão de Frotas & Finanças',
  documento: '123.456.789-00',
  avatarUrl: '',
  idioma: 'pt-BR',
  moeda: 'BRL',
  regiao: 'Brasil',
  formatoData: 'DD/MM/YYYY',
  tema: 'dark'
};

const STORAGE_KEY = 'user_profile_data_v2';

export const profileService = {
  carregarPerfil(): UserProfileData {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Error loading profile from localStorage', e);
    }
    return DEFAULT_PROFILE;
  },

  salvarPerfil(data: Partial<UserProfileData>): UserProfileData {
    try {
      const current = this.carregarPerfil();
      const updated = { ...current, ...data };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving profile to localStorage', e);
      return DEFAULT_PROFILE;
    }
  },

  atualizarPerfil(field: keyof UserProfileData, value: any): UserProfileData {
    return this.salvarPerfil({ [field]: value });
  },

  async sincronizarGoogleSheets(token?: string): Promise<{ success: boolean; message: string }> {
    if (!token) {
      return { success: false, message: 'Conta Google não conectada.' };
    }
    try {
      // Simulate/trigger sync with Google Sheets API
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, message: 'Sincronização com Google Sheets concluída.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Erro na sincronização.' };
    }
  },

  exportarConfiguracoes(): string {
    const profile = this.carregarPerfil();
    const configExport = {
      profile,
      exportedAt: new Date().toISOString(),
      version: '2.5.0'
    };
    return JSON.stringify(configExport, null, 2);
  },

  importarConfiguracoes(jsonStr: string): UserProfileData {
    try {
      const parsed = JSON.parse(jsonStr);
      const dataToSave = parsed.profile || parsed;
      return this.salvarPerfil(dataToSave);
    } catch (e) {
      throw new Error('Arquivo de configuração inválido.');
    }
  },

  restaurarPadrao(): UserProfileData {
    localStorage.removeItem(STORAGE_KEY);
    return DEFAULT_PROFILE;
  }
};
