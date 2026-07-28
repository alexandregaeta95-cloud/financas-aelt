import React, { useState } from 'react';
import { PixNotificationService } from '../services/pixNotificationService';
import { notificationListenerService } from '../../android/notification/notificationListenerService';

export interface PixSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PixSimulatorModal({ isOpen, onClose }: PixSimulatorModalProps) {
  const [texto, setTexto] = useState('');
  const [banco, setBanco] = useState('Nubank');

  if (!isOpen) return null;

  const exemplos = [
    'Você recebeu um Pix de R$ 150,00 de João Silva no Nubank',
    'Pix enviado de R$ 85,50 para Posto Shell Ltda - Itaú',
    'Transferência Pix recebida: R$ 2.500,00 de Empresa ABC Ltda (Salário)',
    'Você pagou R$ 42,00 para Mercado do Bairro via Pix Bradesco'
  ];

  const handleProcessar = () => {
    if (!texto.trim()) return;
    
    // Process via Android Notification Listener Service
    notificationListenerService.receberNotificacao({
      id: `sim-${Date.now()}`,
      packageName: `com.${(banco || '').toLowerCase().replace(/\s+/g, '')}.app`,
      bankName: banco,
      title: `Notificação PIX - ${banco}`,
      text: texto,
      timestamp: new Date().toISOString()
    });

    PixNotificationService.detectarNotificacao({
      id: `sim-${Date.now()}`,
      bancoNome: banco,
      titulo: `Notificação ${banco}`,
      texto: texto,
      dataHora: new Date().toISOString()
    });
    setTexto('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 text-slate-100 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            ⚡ Simular Notificação PIX / Comprovante
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-sm">
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-400">
          Cole ou digite o texto da notificação do banco para simular a detecção automática do Assistente PIX.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Selecione o Banco
            </label>
            <select
              value={banco}
              onChange={e => setBanco(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200"
            >
              <option value="Nubank">Nubank</option>
              <option value="Itaú">Itaú</option>
              <option value="Bradesco">Bradesco</option>
              <option value="Santander">Santander</option>
              <option value="Banco do Brasil">Banco do Brasil</option>
              <option value="Banco Inter">Banco Inter</option>
              <option value="Caixa">Caixa Econômica</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Texto da Notificação ou Comprovante
            </label>
            <textarea
              rows={3}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              placeholder="Ex: Você recebeu um Pix de R$ 150,00 de Maria..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <span className="block text-[11px] font-semibold text-slate-400 mb-1.5">
              Exemplos Prontos (Clique para testar):
            </span>
            <div className="space-y-1.5">
              {exemplos.map((ex, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setTexto(ex)}
                  className="w-full text-left px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700/50 truncate transition"
                >
                  💡 {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleProcessar}
            disabled={!texto.trim()}
            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-lg"
          >
            ⚡ Testar Detecção
          </button>
        </div>
      </div>
    </div>
  );
}

export default PixSimulatorModal;
