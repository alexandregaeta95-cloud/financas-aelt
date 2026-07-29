import React from 'react';
import { ExecutiveDashboardView } from '../modules/analytics';
import { Transaction, BankAccount, CreditCard, RegisteredVehicle, RiskZone, Infraction, Compromisso } from '../types';

interface DashboardPageProps {
  transactions?: Transaction[];
  bankAccounts?: BankAccount[];
  creditCards?: CreditCard[];
  registeredVehicles?: RegisteredVehicle[];
  riskZones?: RiskZone[];
  infractions?: Infraction[];
  compromissos?: Compromisso[];
  onNavigateTab?: (tab: string) => void;
  showAlert?: (title: string, message: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <ExecutiveDashboardView />
    </div>
  );
};

export default DashboardPage;
