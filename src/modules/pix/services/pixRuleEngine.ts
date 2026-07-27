import { PixRule, PixTransaction, RuleEngine } from '../types';
import { normalizarTexto } from '../utils/pixUtils';

const DEFAULT_RULES: PixRule[] = [
  {
    id: 'rule-1',
    termoChave: 'posto',
    tipoTransacao: 'ENVIADO',
    categoriaSugerida: 'ABASTECIMENTO',
    descricaoSugerida: 'Combustível - Posto',
    ativo: true
  },
  {
    id: 'rule-2',
    termoChave: 'mercado',
    tipoTransacao: 'ENVIADO',
    categoriaSugerida: 'CASA',
    descricaoSugerida: 'Supermercado',
    ativo: true
  },
  {
    id: 'rule-3',
    termoChave: 'salario',
    tipoTransacao: 'RECEBIDO',
    categoriaSugerida: 'TRABALHO',
    descricaoSugerida: 'Salário / Prolabore',
    ativo: true
  },
  {
    id: 'rule-4',
    termoChave: 'cliente',
    tipoTransacao: 'RECEBIDO',
    categoriaSugerida: 'TRABALHO',
    descricaoSugerida: 'Receita de Cliente',
    ativo: true
  },
  {
    id: 'rule-5',
    termoChave: 'uber',
    tipoTransacao: 'ENVIADO',
    categoriaSugerida: 'TRANSPORTE',
    descricaoSugerida: 'Uber / Táxi',
    ativo: true
  },
  {
    id: 'rule-6',
    termoChave: 'farmacia',
    tipoTransacao: 'ENVIADO',
    categoriaSugerida: 'SAÚDE',
    descricaoSugerida: 'Farmácia / Medicamentos',
    ativo: true
  }
];

export class PixRuleEngine implements RuleEngine {
  private static STORAGE_KEY = 'wealthflow_pix_rules';

  static obterRegras(): PixRule[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }
    return DEFAULT_RULES;
  }

  static salvarRegras(regras: PixRule[]) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(regras));
  }

  aplicarRegras(pix: PixTransaction, regrasInput?: PixRule[]): { categoria?: string; descricao?: string } {
    const regras = regrasInput || PixRuleEngine.obterRegras();
    const textoBase = normalizarTexto(`${pix.textoOriginal} ${pix.nomePessoa || ''} ${pix.banco || ''}`);

    for (const r of regras) {
      if (!r.ativo) continue;
      const termoNorm = normalizarTexto(r.termoChave);
      if (!termoNorm) continue;

      const tipoBate = !r.tipoTransacao || r.tipoTransacao === pix.tipo;
      const textoBate = textoBase.includes(termoNorm);

      if (tipoBate && textoBate) {
        return {
          categoria: r.categoriaSugerida,
          descricao: r.descricaoSugerida || (pix.tipo === 'RECEBIDO' ? `PIX Recebido - ${pix.nomePessoa || pix.banco}` : `PIX Enviado - ${pix.nomePessoa || pix.banco}`)
        };
      }
    }

    // Default fallback
    if (pix.tipo === 'RECEBIDO') {
      return {
        categoria: 'TRABALHO',
        descricao: `PIX Recebido - ${pix.nomePessoa || pix.banco}`
      };
    } else {
      return {
        categoria: 'PESSOAL',
        descricao: `PIX Enviado - ${pix.nomePessoa || pix.banco}`
      };
    }
  }
}

export const pixRuleEngine = new PixRuleEngine();
