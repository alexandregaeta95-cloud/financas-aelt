import React from 'react';
import { motion } from 'motion/react';
import { History, User, Clock, ArrowUpRight, ArrowDownLeft, Edit3, Tag } from 'lucide-react';
import { Transaction } from '../types';

interface TransactionAuditLogProps {
  transactions: Transaction[];
  className?: string;
  maxItems?: number;
}

export const TransactionAuditLog: React.FC<TransactionAuditLogProps> = ({
  transactions,
  className = '',
  maxItems = 5,
}) => {
  // Filter transactions that have updatedAt defined and sort descending
  const modifiedTransactions = transactions
    .filter((t) => typeof t.updatedAt === 'number' && t.updatedAt > 0)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, maxItems);

  // Fallback: If no transactions have updatedAt set yet, take top items by id/order
  const displayList = modifiedTransactions.length > 0
    ? modifiedTransactions
    : [...transactions]
        .slice(-maxItems)
        .reverse();

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp || timestamp <= 0) return 'Data não registrada';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Data inválida';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let relativeText = '';
    if (diffMins < 1) {
      relativeText = 'agora mesmo';
    } else if (diffMins < 60) {
      relativeText = `há ${diffMins} min`;
    } else if (diffHours < 24) {
      relativeText = `há ${diffHours}h`;
    } else if (diffDays === 1) {
      relativeText = 'ontem';
    } else if (diffDays < 7) {
      relativeText = `há ${diffDays} dias`;
    }

    const fullDate = date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return relativeText ? `${fullDate} (${relativeText})` : fullDate;
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  return (
    <div
      id="transaction-audit-log-card"
      className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-4 md:p-5 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-base">
              Histórico de Alterações
            </h3>
            <p className="text-xs text-slate-500">
              Últimas {maxItems} modificações em transações (quem, quando, o quê)
            </p>
          </div>
        </div>
        <span className="text-xs font-medium px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
          {displayList.length} registro{displayList.length !== 1 ? 's' : ''}
        </span>
      </div>

      {displayList.length === 0 ? (
        <div className="py-8 text-center text-slate-400">
          <Edit3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhuma alteração recente encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((tx, idx) => {
            const isReceita =
              tx.tipo?.toUpperCase() === 'RECEITA' ||
              tx.tipo?.toUpperCase() === 'PAGO' ||
              tx.valor > 0;

            const userWho = tx.motorista || 'Usuário';
            const whenFormatted = formatTimestamp(tx.updatedAt);

            return (
              <motion.div
                key={tx.id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: idx * 0.05 }}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                      isReceita
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {isReceita ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>

                  <div>
                    {/* O que (What) */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">
                        {tx.descricao || 'Transação sem descrição'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700 font-medium">
                        <Tag className="w-3 h-3" />
                        {tx.categoria || 'Geral'}
                      </span>
                      {tx.bancoNome && (
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {tx.bancoNome}
                        </span>
                      )}
                    </div>

                    {/* Quem & Quando (Who & When) */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1 font-medium text-slate-600">
                        <User className="w-3.5 h-3.5 text-indigo-500" />
                        {userWho}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {whenFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Valor (Value) */}
                <div className="sm:text-right shrink-0 pl-11 sm:pl-0">
                  <span
                    className={`font-semibold text-sm ${
                      isReceita ? 'text-emerald-600' : 'text-slate-900'
                    }`}
                  >
                    {formatCurrency(tx.valor)}
                  </span>
                  {tx.tipo && (
                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                      {tx.tipo}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TransactionAuditLog;
