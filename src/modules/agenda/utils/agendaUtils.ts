import { Compromisso } from '../types';

export function agruparPorData(compromissos: Compromisso[]): Record<string, Compromisso[]> {
  const resultado: Record<string, Compromisso[]> = {};
  compromissos.forEach(c => {
    const dataKey = c.data || 'Sem Data';
    if (!resultado[dataKey]) {
      resultado[dataKey] = [];
    }
    resultado[dataKey].push(c);
  });
  return resultado;
}
