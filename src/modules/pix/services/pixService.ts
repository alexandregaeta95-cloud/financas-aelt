import { PixTransaction } from '../types';

export class PixService {
  static async processarComprovante(texto: string): Promise<Partial<PixTransaction>> {
    // Parse simulated Pix receipt text
    const matchValor = texto.match(/R\$\s*([\d.,]+)/i);
    const valor = matchValor ? parseFloat(matchValor[1].replace('.', '').replace(',', '.')) : 0;
    
    return {
      textoOriginal: texto,
      valor,
      data: new Date().toISOString().split('T')[0],
      hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'PENDENTE'
    };
  }
}

export const pixService = PixService;
