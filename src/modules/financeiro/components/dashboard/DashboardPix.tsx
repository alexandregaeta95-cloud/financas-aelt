import React, { useState } from 'react';
import { QrCode, ArrowUpRight, ArrowDownRight, Bell, Zap, Copy, Check } from 'lucide-react';
import { Transaction, BankAccount, CreditCard } from '../../../../types';

export interface DashboardPixProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  onTriggerNotification?: (notif: any) => void;
  hideValuesMode: boolean;
  onNavigate: (tab: string) => void;
}

export const DashboardPix: React.FC<DashboardPixProps> = React.memo(({
  transactions,
  bankAccounts,
  creditCards,
  onTriggerNotification,
  hideValuesMode,
  onNavigate,
}) => {
  const [isOpenSimulator, setIsOpenSimulator] = useState<boolean>(false);
  const [simType, setSimType] = useState<'RECEITA' | 'DESPESA'>('RECEITA');
  const [simValor, setSimValor] = useState<string>('50.00');
  const [simDesc, setSimDesc] = useState<string>('Transferência PIX Recebida');
  const [simAccountKey, setSimAccountKey] = useState<string>('');

  const pixStats = React.useMemo(() => {
    let receivedVal = 0;
    let receivedCount = 0;
    let paidVal = 0;
    let paidCount = 0;

    transactions.forEach(t => {
      const descUpper = (t.descricao || '').toUpperCase();
      const catUpper = (t.categoria || '').toUpperCase();
      const origUpper = (t.origem || '').toUpperCase();

      const isPix = descUpper.includes('PIX') || catUpper.includes('PIX') || origUpper.includes('PIX');
      if (isPix) {
        if (t.tipo === 'RECEITA') {
          receivedVal += t.valor;
          receivedCount++;
        } else {
          paidVal += t.valor;
          paidCount++;
        }
      }
    });

    return { receivedVal, receivedCount, paidVal, paidCount };
  }, [transactions]);

  const handleSimulatePixNotification = () => {
    const valNum = parseFloat(simValor);
    if (isNaN(valNum) || valNum <= 0) return;

    if (onTriggerNotification) {
      onTriggerNotification({
        banco: 'Bradesco',
        tipo: simType,
        valor: valNum,
        descricao: simDesc || 'PIX Simulado',
        categoria: 'PIX',
        accountId: bankAccounts[0]?.id || 1,
        isCreditCard: false,
      });
    }

    setIsOpenSimulator(false);
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <QrCode className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Indicadores & Processamento PIX</h3>
            <p className="text-[11px] text-slate-400">Volume transacionado via Instant Payments</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpenSimulator(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 font-bold text-xs rounded-xl transition-all"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Simular Notificação PIX</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">PIX Recebido</span>
            <span className={`text-lg font-extrabold text-emerald-400 font-mono ${hideValuesMode ? 'blur-[5px]' : ''}`}>
              R$ {pixStats.receivedVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">{pixStats.receivedCount} transação(ões)</span>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block">PIX Enviado / Pago</span>
            <span className={`text-lg font-extrabold text-rose-400 font-mono ${hideValuesMode ? 'blur-[5px]' : ''}`}>
              R$ {pixStats.paidVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-500 block">{pixStats.paidCount} transação(ões)</span>
          </div>
          <div className="p-2 bg-rose-500/10 text-rose-400 rounded-xl">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Simulator Modal */}
      {isOpenSimulator && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              Simular Notificação Push de PIX
            </h3>
            <p className="text-xs text-slate-400">
              Gere um alerta push simulado de pagamento PIX para testar a detecção inteligente e conciliação bancária.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Tipo</label>
                <select
                  value={simType}
                  onChange={(e) => setSimType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                >
                  <option value="RECEITA">PIX Recebido (+)</option>
                  <option value="DESPESA">PIX Pago (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Valor (R$)</label>
                <input
                  type="number"
                  value={simValor}
                  onChange={(e) => setSimValor(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Descrição</label>
                <input
                  type="text"
                  value={simDesc}
                  onChange={(e) => setSimDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="Ex: Transferência PIX Recebida"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsOpenSimulator(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSimulatePixNotification}
                className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
              >
                Disparar Alerta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

DashboardPix.displayName = 'DashboardPix';
