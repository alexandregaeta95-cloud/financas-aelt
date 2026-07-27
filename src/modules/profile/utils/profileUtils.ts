import { InfractionUrgencyColors } from '../types/profile';

export const DEFAULT_INFRACTION_URGENCY_COLORS: InfractionUrgencyColors = {
  gravissima: '#ef4444',
  grave: '#f97316',
  media: '#eab308',
  leve: '#06b6d4'
};

export const INFRACTION_SWATCH_COLORS = [
  { name: 'Vermelho Crítico', hex: '#ef4444' },
  { name: 'Laranja Alerta', hex: '#f97316' },
  { name: 'Amarelo Atenção', hex: '#eab308' },
  { name: 'Ciano Informativo', hex: '#06b6d4' },
  { name: 'Esmeralda Seguro', hex: '#10b981' },
  { name: 'Roxo Elétrico', hex: '#a855f7' },
  { name: 'Rosa Choque', hex: '#ec4899' },
  { name: 'Azul Celeste', hex: '#3b82f6' },
  { name: 'Cinza Discreto', hex: '#64748b' }
];

export const PRESET_COLOR_THEMES = [
  {
    name: 'Padrão Trânsito (CTB)',
    colors: { gravissima: '#ef4444', grave: '#f97316', media: '#eab308', leve: '#06b6d4' }
  },
  {
    name: 'Alerta Neon',
    colors: { gravissima: '#ec4899', grave: '#a855f7', media: '#eab308', leve: '#10b981' }
  },
  {
    name: 'Tons Quentes',
    colors: { gravissima: '#dc2626', grave: '#ea580c', media: '#d97706', leve: '#ca8a04' }
  },
  {
    name: 'Pastéis Suaves',
    colors: { gravissima: '#f87171', grave: '#fb923c', media: '#facc15', leve: '#38bdf8' }
  }
];

export const validarEmail = (email: string): boolean => {
  if (!email) return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
};

export const validarTelefone = (phone: string): boolean => {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
};

export const formatarNome = (name: string): string => {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const formatarDocumento = (doc: string): string => {
  if (!doc) return '';
  const digits = doc.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return doc;
};

export const validarConfiguracoes = (config: any): boolean => {
  return config && typeof config === 'object';
};

export const limparCache = (): void => {
  try {
    sessionStorage.clear();
    console.log("Cache temporário limpo com sucesso.");
  } catch (e) {
    console.error("Erro ao limpar cache:", e);
  }
};

export const playNotificationSound = (soundType: 'system' | 'custom', optionKey: string, customBase64?: string) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (soundType === 'custom' && customBase64) {
      const base64Data = customBase64.includes(',') ? customBase64.split(',')[1] : customBase64;
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      ctx.decodeAudioData(bytes.buffer, (buffer) => {
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      }, (e) => console.error("Error decoding audio data", e));
      return;
    }

    const playTone = (freq: number, type: OscillatorType, start: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      
      gainNode.gain.setValueAtTime(volume, start);
      gainNode.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    const now = ctx.currentTime;

    switch (optionKey) {
      case 'bell':
        playTone(880, 'sine', now, 1.2, 0.4);
        playTone(1320, 'sine', now + 0.05, 0.8, 0.15);
        break;
      case 'crystal':
        playTone(1500, 'sine', now, 0.4, 0.3);
        playTone(2000, 'sine', now + 0.1, 0.3, 0.2);
        playTone(2500, 'sine', now + 0.2, 0.3, 0.1);
        break;
      case 'digital':
        playTone(987.77, 'square', now, 0.08, 0.15);
        playTone(1318.51, 'square', now + 0.1, 0.15, 0.15);
        break;
      case 'echo':
        playTone(523.25, 'triangle', now, 0.5, 0.3);
        playTone(587.33, 'triangle', now + 0.15, 0.5, 0.2);
        playTone(659.25, 'triangle', now + 0.3, 0.5, 0.1);
        break;
      case 'piano':
        playTone(261.63, 'sine', now, 1.0, 0.3);
        playTone(329.63, 'sine', now + 0.1, 0.9, 0.25);
        playTone(392.00, 'sine', now + 0.2, 0.8, 0.2);
        playTone(523.25, 'sine', now + 0.3, 0.7, 0.15);
        break;
      case 'zen': {
        const oscNode = ctx.createOscillator();
        const gainNode = ctx.createGain();
        oscNode.type = 'sine';
        oscNode.frequency.setValueAtTime(220, now);
        oscNode.frequency.exponentialRampToValueAtTime(440, now + 1.2);
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.linearRampToValueAtTime(0.001, now + 1.2);
        oscNode.connect(gainNode);
        gainNode.connect(ctx.destination);
        oscNode.start(now);
        oscNode.stop(now + 1.2);
        break;
      }
      default:
        playTone(440, 'sine', now, 0.5, 0.3);
        break;
    }
  } catch (e) {
    console.error("Audio Web API error:", e);
  }
};
