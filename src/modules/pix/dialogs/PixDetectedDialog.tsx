import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PixTransaction } from '../types';
import { formatarPix } from '../utils/pixUtils';

export interface PixDetectedDialogProps {
  isOpen: boolean;
  pix: PixTransaction | null;
  onOptionSelect: (
    opcao: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA' | 'IGNORAR',
    payload?: any
  ) => void;
  onClose: () => void;
}

export function PixDetectedDialog({
  isOpen,
  pix,
  onOptionSelect,
  onClose
}: PixDetectedDialogProps) {
  if (!isOpen || !pix) return null;

  const handleSelect = (opcao: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA' | 'IGNORAR') => {
    if (opcao === 'IGNORAR') {
      onOptionSelect('IGNORAR');
      onClose();
      return;
    }

    const payload = {
      valor: pix.valor,
      tipo: opcao === 'RECEITA' ? 'RECEITA' : opcao === 'DESPESA' ? 'DESPESA' : 'TRANSFERENCIA',
      categoria: pix.categoriaSugerida || (opcao === 'RECEITA' ? 'TRABALHO' : 'PESSOAL'),
      descricao: pix.nomePessoa
        ? `PIX ${opcao === 'RECEITA' ? 'Recebido' : 'Enviado'} - ${pix.nomePessoa}`
        : `PIX ${opcao === 'RECEITA' ? 'Recebido' : 'Enviado'} - ${pix.banco}`,
      bancoNome: pix.banco,
      formaPagamento: 'PIX',
      origem: 'PIX',
      statusProcessamento: 'PENDENTE',
      data: pix.data,
      hora: pix.hora,
      obs: `Texto da Notificação: ${pix.textoOriginal}`
    };

    onOptionSelect(opcao, payload);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-slate-900 border border-emerald-500/30 w-full max-w-md rounded-2xl p-6 text-slate-100 shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">PIX Detectado</h3>
                <p className="text-xs text-slate-400">Assistente de Lançamento Automático</p>
              </div>
            </div>
            <button
              onClick={() => handleSelect('IGNORAR')}
              className="text-slate-400 hover:text-white text-sm"
            >
              ✕
            </button>
          </div>

          {/* Details */}
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Valor</span>
              <span className="text-xl font-black text-emerald-400">
                {formatarPix(pix.valor)}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Banco</span>
              <span className="font-semibold text-slate-200">{pix.banco}</span>
            </div>
            {pix.nomePessoa && (
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Pessoa / Origem</span>
                <span className="font-semibold text-slate-200">{pix.nomePessoa}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400">Data / Hora</span>
              <span className="text-slate-300">{pix.data} às {pix.hora}</span>
            </div>
            {pix.categoriaSugerida && (
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-700/40">
                <span className="text-slate-400">Sugestão de Categoria</span>
                <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded font-medium">
                  {pix.categoriaSugerida}
                </span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            <p className="text-xs text-slate-400 text-center font-medium">
              Como deseja registrar este PIX?
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                onClick={() => handleSelect('RECEITA')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-lg transition"
              >
                💰 Receita
              </button>

              <button
                onClick={() => handleSelect('DESPESA')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shadow-lg transition"
              >
                💸 Despesa
              </button>

              <button
                onClick={() => handleSelect('TRANSFERENCIA')}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg transition"
              >
                🔄 Transf.
              </button>
            </div>

            <button
              onClick={() => handleSelect('IGNORAR')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-xl font-semibold text-xs transition border border-slate-700/50"
            >
              ❌ Ignorar Notificação
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default PixDetectedDialog;
