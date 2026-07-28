import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Transaction, BankAccount, CreditCard, MedicalAppointment, MedicalPrescription, 
  Compromisso, RiskZone, RegisteredVehicle, CarServiceScheduled, SavingsGoal 
} from '../../../../types';

import { DashboardHeader } from './DashboardHeader';
import { DashboardCards } from './DashboardCards';
import { DashboardCharts } from './DashboardCharts';
import { DashboardKPIs } from './DashboardKPIs';
import { DashboardForecast } from './DashboardForecast';
import { DashboardCashFlow } from './DashboardCashFlow';
import { DashboardGoals } from './DashboardGoals';
import { DashboardPix } from './DashboardPix';
import { DashboardVehicles } from './DashboardVehicles';
import { DashboardAlerts } from './DashboardAlerts';
import { DashboardInsights } from './DashboardInsights';

// Helper to parse dates in DD/MM/YYYY or YYYY-MM-DD
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return null;
}

export interface DashboardProps {
  transactions: Transaction[];
  bankAccounts: BankAccount[];
  creditCards: CreditCard[];
  onNavigate: (tab: string) => void;
  appointments?: MedicalAppointment[];
  prescriptions?: MedicalPrescription[];
  compromissos?: Compromisso[];
  scheduledServices?: CarServiceScheduled[];
  onEditTransaction?: (id: number, tx: Partial<Transaction>) => void;
  onAddTransaction?: (newTx: Omit<Transaction, 'id'> | Omit<Transaction, 'id'>[]) => Promise<void>;
  onTriggerNotification?: (notif: {
    banco: string;
    tipo: 'RECEITA' | 'DESPESA' | 'PAGO' | 'ETANOL' | 'GAS. COMUM' | string;
    valor: number;
    descricao: string;
    categoria: string;
    accountId: number;
    isCreditCard: boolean;
    cardId?: number;
  }) => void;
  onTriggerBankIntegration?: (bancoId: number, valor: number, descricao: string) => void;
  showConfirm?: (title: string, message: string, onConfirm: () => void) => void;
  showAlert?: (title: string, message: string) => void;
  riskZones?: RiskZone[];
  registeredVehicles?: RegisteredVehicle[];
  setRegisteredVehicles?: React.Dispatch<React.SetStateAction<RegisteredVehicle[]>>;
  categoryBudgets?: { [category: string]: number };
  setCategoryBudgets?: React.Dispatch<React.SetStateAction<{ [category: string]: number }>>;
  customCategories?: string[];
  ipvaLeadDays?: number;
  setIpvaLeadDays?: React.Dispatch<React.SetStateAction<number>>;
  dailyCheckInTime?: string;
  setDailyCheckInTime?: (time: string) => void;
  ipvaClosingDay?: number;
  medicalAppointmentLeadDays?: number;
  ipvaNotificationColor?: string;
  notifyIpva?: boolean;
  defaultVehicleId?: string;
}

export default function Dashboard({ 
  transactions, 
  bankAccounts, 
  creditCards, 
  onNavigate, 
  appointments = [],
  prescriptions = [],
  compromissos = [],
  scheduledServices = [],
  onEditTransaction,
  onAddTransaction,
  onTriggerNotification,
  onTriggerBankIntegration,
  showConfirm,
  showAlert,
  riskZones = [],
  registeredVehicles = [],
  setRegisteredVehicles,
  categoryBudgets = {},
  setCategoryBudgets,
  customCategories = [],
  ipvaLeadDays = 30,
  setIpvaLeadDays,
  dailyCheckInTime = '',
  setDailyCheckInTime,
  ipvaClosingDay = 15,
  medicalAppointmentLeadDays = 2,
  ipvaNotificationColor = 'orange',
  notifyIpva = true,
  defaultVehicleId = ''
}: DashboardProps) {
  // Global View / Privacy Settings
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [hideValuesMode, setHideValuesMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('wealthflow_hide_values_mode');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('wealthflow_hide_values_mode', String(hideValuesMode));
    } catch (e) {
      console.error(e);
    }
  }, [hideValuesMode]);

  const [dashboardTab, setDashboardTab] = useState<'geral' | 'orcamento'>('geral');

  // Month Key Selector State & Calculations
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    transactions.forEach(t => {
      const pDate = parseDate(t.data);
      if (pDate) {
        const y = pDate.getFullYear();
        const m = pDate.getMonth() + 1;
        monthsSet.add(`${y}-${String(m).padStart(2, '0')}`);
      }
    });

    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    monthsSet.add(curKey);

    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(() => {
    if (availableMonths.length > 0) return availableMonths[0];
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const formatMonthKey = useCallback((key: string) => {
    const [yStr, mStr] = key.split('-');
    const year = parseInt(yStr, 10);
    const month = parseInt(mStr, 10) - 1;
    const date = new Date(year, month, 1);
    const name = date.toLocaleString('pt-BR', { month: 'long' });
    return `${name.charAt(0).toUpperCase() + name.slice(1)} de ${year}`;
  }, []);

  const monthlyTransactions = useMemo(() => {
    const [selYear, selMonth] = selectedMonthKey.split('-').map(Number);
    return transactions.filter(t => {
      const pDate = parseDate(t.data);
      if (!pDate) return false;
      return pDate.getFullYear() === selYear && (pDate.getMonth() + 1) === selMonth;
    });
  }, [transactions, selectedMonthKey]);

  // Aggregated Totals & Category Breakdown
  const totalBalance = useMemo(() => {
    return bankAccounts.reduce((acc, b) => acc + (b.saldoInicial || 0), 0);
  }, [bankAccounts]);

  const totalIncome = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.tipo === 'RECEITA')
      .reduce((acc, curr) => acc + curr.valor, 0);
  }, [monthlyTransactions]);

  const totalExpense = useMemo(() => {
    return monthlyTransactions
      .filter(t => t.tipo === 'DESPESA' || t.tipo === 'PAGO' || ['ETANOL', 'GAS. COMUM', 'ETANOL ADITIVADA', 'GAS, ADITIVADA'].includes(t.tipo))
      .reduce((acc, curr) => acc + curr.valor, 0);
  }, [monthlyTransactions]);

  const netBalance = useMemo(() => {
    return totalIncome - totalExpense;
  }, [totalIncome, totalExpense]);

  const monthlyCategoryData = useMemo(() => {
    const categoriesMap: { [key: string]: number } = {};
    let total = 0;

    monthlyTransactions.forEach(t => {
      const isExpense = t.tipo !== 'RECEITA' && t.tipo !== 'RECEBIDO';
      if (isExpense && t.categoria && t.valor > 0 && t.categoria !== 'BANCO' && t.categoria !== 'CARTÃO') {
        const cat = t.categoria.trim();
        categoriesMap[cat] = (categoriesMap[cat] || 0) + t.valor;
        total += t.valor;
      }
    });

    const categoryColors: { [key: string]: string } = {
      'CASA': '#3b82f6',
      'ALIMENTAÇÃO': '#ef4444',
      'TRANSPORTE': '#f59e0b',
      'COMBUSTÍVEL': '#10b981',
      'CONSUMO': '#8b5cf6',
      'LAZER': '#ec4899',
      'SAÚDE': '#14b8a6',
      'EDUCAÇÃO': '#6366f1',
    };

    const colorPalette = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

    const sortedList = Object.entries(categoriesMap)
      .map(([name, value], idx) => {
        const upper = (name || '').toUpperCase();
        const color = categoryColors[upper] || colorPalette[idx % colorPalette.length];
        return { name, value, color };
      })
      .sort((a, b) => b.value - a.value);

    const listWithPct = sortedList.map(item => ({
      ...item,
      percentage: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));

    return { list: listWithPct, total };
  }, [monthlyTransactions]);

  const donutSegments = useMemo(() => {
    const { list, total } = monthlyCategoryData;
    if (total === 0 || list.length === 0) return [];

    let accumulated = 0;
    return list.map(item => {
      const pctFloat = (item.value / total) * 100;
      const offset = -accumulated;
      accumulated += pctFloat;
      return { ...item, pctFloat, offset };
    });
  }, [monthlyCategoryData]);

  // GPS Proximity State & Handlers
  const [gpsPosition, setGpsPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isGpsTracking, setIsGpsTracking] = useState<boolean>(false);
  const [activeRiskAlertZone, setActiveRiskAlertZone] = useState<RiskZone | null>(null);
  const [isGpsSimulated, setIsGpsSimulated] = useState<boolean>(false);

  const handleSimulateGPS = useCallback((zoneId: number) => {
    const zone = riskZones.find(z => z.id === zoneId);
    if (!zone) return;

    setIsGpsSimulated(true);
    setIsGpsTracking(true);
    setGpsError(null);
    setGpsPosition({ latitude: zone.latitude, longitude: zone.longitude });
    setActiveRiskAlertZone(zone);

    if (showAlert) {
      showAlert(
        "📍 GPS Simulado com Sucesso",
        `Sua localização simulada foi definida para o perímetro de "${zone.nomeLocal}".`
      );
    }
  }, [riskZones, showAlert]);

  const handleStopGPSTracking = useCallback(() => {
    setIsGpsTracking(false);
    setIsGpsSimulated(false);
    setGpsPosition(null);
    setGpsError(null);
    setActiveRiskAlertZone(null);
  }, []);

  // Savings Goals State Management
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    try {
      const stored = localStorage.getItem('wealthflow_savings_goals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const saveSavingsGoals = useCallback((goals: SavingsGoal[]) => {
    setSavingsGoals(goals);
    try {
      localStorage.setItem('wealthflow_savings_goals', JSON.stringify(goals));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const [isOpenGoalModal, setIsOpenGoalModal] = useState<boolean>(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalName, setGoalName] = useState<string>('');
  const [goalTarget, setGoalTarget] = useState<string>('');
  const [goalCurrent, setGoalCurrent] = useState<string>('');
  const [goalDeadline, setGoalDeadline] = useState<string>('');
  const [goalCategory, setGoalCategory] = useState<string>('Segurança');
  const [goalDesc, setGoalDesc] = useState<string>('');

  const [isOpenTransferModal, setIsOpenTransferModal] = useState<boolean>(false);
  const [transferType, setTransferType] = useState<'DEPOSIT' | 'WITHDRAW' | null>(null);
  const [transferAmount, setTransferAmount] = useState<string>('');
  const [transferGoalId, setTransferGoalId] = useState<string | null>(null);

  const handleOpenGoalModal = useCallback((goal?: SavingsGoal) => {
    if (goal) {
      setEditingGoal(goal);
      setGoalName(goal.nome);
      setGoalTarget(String(goal.valorAlvo));
      setGoalCurrent(String(goal.valorAtual));
      setGoalDeadline(goal.prazo || '');
      setGoalCategory(goal.categoria || 'Segurança');
      setGoalDesc(goal.descricao || '');
    } else {
      setEditingGoal(null);
      setGoalName('');
      setGoalTarget('');
      setGoalCurrent('');
      setGoalDeadline('');
      setGoalCategory('Segurança');
      setGoalDesc('');
    }
    setIsOpenGoalModal(true);
  }, []);

  const handleSaveGoal = useCallback(() => {
    if (!goalName.trim()) {
      if (showAlert) showAlert("Campo Obrigatório", "Por favor, insira o nome do objetivo.");
      return;
    }

    const parsedTarget = parseFloat(goalTarget);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      if (showAlert) showAlert("Valor Alvo Inválido", "O valor alvo precisa ser maior que zero.");
      return;
    }

    const parsedCurrent = parseFloat(goalCurrent) || 0;

    if (editingGoal) {
      const updated = savingsGoals.map(g => g.id === editingGoal.id ? {
        ...g,
        nome: goalName,
        valorAlvo: parsedTarget,
        valorAtual: parsedCurrent,
        prazo: goalDeadline,
        categoria: goalCategory,
        descricao: goalDesc,
        updatedAt: Date.now()
      } : g);
      saveSavingsGoals(updated);
      if (showAlert) showAlert("Meta Atualizada", "Sua meta foi atualizada com sucesso!");
    } else {
      const newGoal: SavingsGoal = {
        id: 'goal_' + Math.random().toString(36).substr(2, 9),
        nome: goalName,
        valorAlvo: parsedTarget,
        valorAtual: parsedCurrent,
        prazo: goalDeadline,
        categoria: goalCategory,
        descricao: goalDesc,
        updatedAt: Date.now()
      };
      saveSavingsGoals([...savingsGoals, newGoal]);
      if (showAlert) showAlert("Meta Criada", "Sua nova meta de economia foi criada!");
    }

    setIsOpenGoalModal(false);
  }, [editingGoal, goalName, goalTarget, goalCurrent, goalDeadline, goalCategory, goalDesc, savingsGoals, saveSavingsGoals, showAlert]);

  const handleOpenTransferModal = useCallback((type: 'DEPOSIT' | 'WITHDRAW', goalId: string) => {
    setTransferType(type);
    setTransferGoalId(goalId);
    setTransferAmount('');
    setIsOpenTransferModal(true);
  }, []);

  const handleConfirmTransfer = useCallback(() => {
    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      if (showAlert) showAlert("Valor Inválido", "Por favor, insira um valor válido.");
      return;
    }

    if (!transferGoalId) return;

    const updated = savingsGoals.map(g => {
      if (g.id === transferGoalId) {
        const cur = g.valorAtual || 0;
        const newCur = transferType === 'DEPOSIT' ? cur + amountNum : Math.max(0, cur - amountNum);
        return { ...g, valorAtual: newCur, updatedAt: Date.now() };
      }
      return g;
    });

    saveSavingsGoals(updated);
    setIsOpenTransferModal(false);
    if (showAlert) {
      showAlert(
        transferType === 'DEPOSIT' ? "Aporte Realizado" : "Resgate Realizado",
        `Operação de R$ ${amountNum.toFixed(2)} concluída com sucesso!`
      );
    }
  }, [transferAmount, transferGoalId, transferType, savingsGoals, saveSavingsGoals, showAlert]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* 1. Header & Navigation Controls */}
      <DashboardHeader
        showBalance={showBalance}
        setShowBalance={setShowBalance}
        hideValuesMode={hideValuesMode}
        setHideValuesMode={setHideValuesMode}
        dashboardTab={dashboardTab}
        setDashboardTab={setDashboardTab}
        selectedMonthKey={selectedMonthKey}
        setSelectedMonthKey={setSelectedMonthKey}
        availableMonths={availableMonths}
        formatMonthKey={formatMonthKey}
        onNavigate={onNavigate}
      />

      {/* 2. Top Summary Cards */}
      <DashboardCards
        totalBalance={totalBalance}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        netBalance={netBalance}
        showBalance={showBalance}
        hideValuesMode={hideValuesMode}
        bankAccounts={bankAccounts}
        creditCards={creditCards}
        onNavigate={onNavigate}
      />

      {/* 3. Key Performance Indicators (KPIs) */}
      <DashboardKPIs
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        netBalance={netBalance}
        hideValuesMode={hideValuesMode}
      />

      {/* 4. Financial Charts & Visualizations */}
      <DashboardCharts
        monthlyTransactions={monthlyTransactions}
        monthlyCategoryData={monthlyCategoryData}
        donutSegments={donutSegments}
        hideValuesMode={hideValuesMode}
        selectedMonthKey={selectedMonthKey}
        formatMonthKey={formatMonthKey}
      />

      {/* 5. Forecast & Cash Flow Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardForecast
          transactions={transactions}
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          hideValuesMode={hideValuesMode}
        />
        <DashboardCashFlow
          transactions={transactions}
          selectedMonthKey={selectedMonthKey}
          hideValuesMode={hideValuesMode}
        />
      </div>

      {/* 6. Savings Goals & Financial Targets */}
      <DashboardGoals
        savingsGoals={savingsGoals}
        onOpenGoalModal={handleOpenGoalModal}
        onOpenTransferModal={handleOpenTransferModal}
        hideValuesMode={hideValuesMode}
      />

      {/* 7. PIX Transacted Stats & Simulator */}
      <DashboardPix
        transactions={transactions}
        bankAccounts={bankAccounts}
        creditCards={creditCards}
        onTriggerNotification={onTriggerNotification}
        hideValuesMode={hideValuesMode}
        onNavigate={onNavigate}
      />

      {/* 8. Fleet & Vehicles Section */}
      <DashboardVehicles
        registeredVehicles={registeredVehicles}
        scheduledServices={scheduledServices}
        ipvaLeadDays={ipvaLeadDays}
        ipvaClosingDay={ipvaClosingDay}
        notifyIpva={notifyIpva}
        onNavigate={onNavigate}
      />

      {/* 9. Security Alerts & GPS Monitoring */}
      <DashboardAlerts
        activeRiskAlertZone={activeRiskAlertZone}
        gpsPosition={gpsPosition}
        isGpsTracking={isGpsTracking}
        isGpsSimulated={isGpsSimulated}
        gpsError={gpsError}
        riskZones={riskZones}
        onSimulateGPS={handleSimulateGPS}
        onStopGPSTracking={handleStopGPSTracking}
        appointments={appointments}
        prescriptions={prescriptions}
        compromissos={compromissos}
        dismissedReminders={[]}
        onDismissReminder={() => {}}
        onNavigate={onNavigate}
      />

      {/* 10. AI Financial Insights & Advice */}
      <DashboardInsights
        transactions={transactions}
        categoryBudgets={categoryBudgets}
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        hideValuesMode={hideValuesMode}
        onNavigate={onNavigate}
      />

      {/* Goal Edit / Creation Modal */}
      {isOpenGoalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-sm font-bold text-white">
              {editingGoal ? 'Editar Meta de Economia' : 'Nova Meta de Economia'}
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nome da Meta</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="Ex: Reserva de Emergência, Viagem..."
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Valor Alvo (R$)</label>
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={(e) => setGoalTarget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    placeholder="10000"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Valor Atual (R$)</label>
                  <input
                    type="number"
                    value={goalCurrent}
                    onChange={(e) => setGoalCurrent(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Prazo Desejado</label>
                <input
                  type="text"
                  value={goalDeadline}
                  onChange={(e) => setGoalDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  placeholder="Ex: Dezembro/2026"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsOpenGoalModal(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveGoal}
                className="flex-1 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl"
              >
                Salvar Meta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Aporte/Resgate Modal */}
      {isOpenTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-sm font-bold text-white">
              {transferType === 'DEPOSIT' ? 'Aportar na Meta' : 'Resgatar da Meta'}
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">Valor (R$)</label>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono text-sm"
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsOpenTransferModal(false)}
                className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTransfer}
                className={`flex-1 py-2 font-bold text-xs rounded-xl text-slate-950 ${
                  transferType === 'DEPOSIT' ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-500 hover:bg-rose-400'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
