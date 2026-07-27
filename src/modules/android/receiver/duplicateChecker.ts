import { PixHistoryService } from '../../pix';
import { androidLogger } from '../logs/androidLogger';

export function isDuplicateNotification(
  valor: number,
  banco: string,
  textoOriginal: string,
  data?: string,
  hora?: string
): boolean {
  const existingPixList = PixHistoryService.obterHistorico();
  const targetData = data || new Date().toISOString().split('T')[0];

  const duplicate = existingPixList.find((item) => {
    // Check if value matches
    const sameValor = Math.abs(item.valor - valor) < 0.01;
    // Check if bank matches
    const sameBanco = item.banco?.toLowerCase() === banco?.toLowerCase();
    // Check if text is identical or data matches
    const textOriginal = item.textoRecebido || item.resultadoInterpretacao?.textoOriginal || '';
    const sameText = textOriginal && textoOriginal && textOriginal.trim() === textoOriginal.trim();
    const itemData = item.dataHora ? item.dataHora.split('T')[0] : '';
    const sameData = itemData === targetData;

    return sameValor && (sameText || (sameBanco && sameData));
  });

  if (duplicate) {
    androidLogger.log(
      'DUPLICATE_DETECTED',
      `Transação duplicada detectada: R$ ${valor} (${banco}) em ${targetData}.`,
      'WARN',
      { valor, banco, targetData }
    );
    return true;
  }

  return false;
}
