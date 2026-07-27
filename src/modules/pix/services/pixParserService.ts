import { PixTransaction } from '../types';
import { extrairValor, identificarBanco, identificarTipo, normalizarTexto } from '../utils/pixUtils';
import { PixLoggerService } from './pixLoggerService';
import { pixRuleEngine } from './pixRuleEngine';

export class PixParserService {
  /**
   * Interpreta um texto de notificação de PIX e extrai dados estruturados
   */
  static interpretarTexto(textoOriginal: string, pacoteApp?: string): PixTransaction {
    try {
      if (!textoOriginal) {
        throw new Error('Texto original vazio');
      }

      const valor = extrairValor(textoOriginal);
      const banco = identificarBanco(textoOriginal, pacoteApp);
      const tipo = identificarTipo(textoOriginal);

      // Extract name or CPF/CNPJ if possible
      let nomePessoa = this.extrairNomePessoa(textoOriginal);
      let cpfCnpj = this.extrairCpfCnpj(textoOriginal);

      const agora = new Date();
      const data = agora.toISOString().split('T')[0]; // YYYY-MM-DD
      const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      const pixParcial: PixTransaction = {
        id: `pix-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        valor,
        banco,
        nomePessoa,
        cpfCnpj,
        data,
        hora,
        tipo,
        textoOriginal,
        status: 'PENDENTE'
      };

      // Apply rule engine suggestions
      const sugestao = pixRuleEngine.aplicarRegras(pixParcial);
      pixParcial.categoriaSugerida = sugestao.categoria;

      return pixParcial;
    } catch (e: any) {
      PixLoggerService.logError('ERRO_INTERPRETACAO', 'Falha ao interpretar notificação PIX', {
        textoOriginal,
        erro: e?.message || e
      });

      const agora = new Date();
      return {
        id: `pix-err-${Date.now()}`,
        valor: 0,
        banco: 'Desconhecido',
        data: agora.toISOString().split('T')[0],
        hora: agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'INDEFINIDO',
        textoOriginal: textoOriginal || '',
        status: 'ERRO'
      };
    }
  }

  private static extrairNomePessoa(texto: string): string {
    // Patterns like "de NOME PESSOA", "para NOME PESSOA", "de: NOME", "para: NOME"
    const matchDePara = texto.match(/(?:de|para|por)\s+([A-ZÁÉÍÓÚÃÕÇ\s]{3,30})/i);
    if (matchDePara && matchDePara[1]) {
      const candidato = matchDePara[1].trim();
      if (!/^\d+$/.test(candidato) && candidato.length > 2) {
        return candidato;
      }
    }
    return '';
  }

  private static extrairCpfCnpj(texto: string): string {
    const matchCpf = texto.match(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/);
    if (matchCpf) return matchCpf[0];

    const matchCnpj = texto.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/);
    if (matchCnpj) return matchCnpj[0];

    return '';
  }
}

export const pixParserService = PixParserService;
