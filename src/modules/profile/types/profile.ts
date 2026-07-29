import React from 'react';
import { BankAccount, CreditCard, Transaction, RiskZone, Infraction, RegisteredVehicle, Compromisso, SecurityConfig } from '../../../types';

export type ProfileSubTab = 'config' | 'notificacoes' | 'metas' | 'integracoes';

export interface UserProfileData {
  nome: string;
  email: string;
  telefone: string;
  empresa: string;
  documento: string;
  avatarUrl: string;
  idioma: string;
  moeda: string;
  regiao: string;
  formatoData: string;
  tema: 'dark' | 'light' | 'system';
}

export interface InfractionUrgencyColors {
  gravissima: string;
  grave: string;
  media: string;
  leve: string;
}

export interface ProfileTabProps {
  bankAccounts: BankAccount[];
  setBankAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  creditCards: CreditCard[];
  setCreditCards: React.Dispatch<React.SetStateAction<CreditCard[]>>;
  avatarUrl: string;
  onAvatarChange: (url: string) => void;
  transactions: Transaction[];
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  riskZones: RiskZone[];
  setRiskZones: React.Dispatch<React.SetStateAction<RiskZone[]>>;
  infractions: Infraction[];
  setInfractions: React.Dispatch<React.SetStateAction<Infraction[]>>;
  nonAppealed: any[];
  setNonAppealed: React.Dispatch<React.SetStateAction<any[]>>;
  showAlert: (title: string, message: string) => void;
  showConfirm: (title: string, message: string, onConfirm: () => void, requireInputText?: string) => void;
  registeredVehicles: RegisteredVehicle[];
  setRegisteredVehicles: React.Dispatch<React.SetStateAction<RegisteredVehicle[]>>;
  compromissos?: Compromisso[];
  customCategories: string[];
  setCustomCategories: React.Dispatch<React.SetStateAction<string[]>>;
  securityConfig: SecurityConfig;
  setSecurityConfig: React.Dispatch<React.SetStateAction<SecurityConfig>>;
  onTestLock: () => void;
  categoryBudgets?: { [category: string]: number };
  setCategoryBudgets?: React.Dispatch<React.SetStateAction<{ [category: string]: number }>>;
  googleToken?: string | null;
  googleUser?: any | null;
  onGoogleLogin?: () => Promise<void>;
  onGoogleLogout?: () => Promise<void>;
  ipvaLeadDays?: number;
  setIpvaLeadDays?: React.Dispatch<React.SetStateAction<number>>;
  ipvaClosingDay?: number;
  setIpvaClosingDay?: React.Dispatch<React.SetStateAction<number>>;
  medicalAppointmentLeadDays?: number;
  setMedicalAppointmentLeadDays?: React.Dispatch<React.SetStateAction<number>>;
  ipvaNotificationColor?: string;
  setIpvaNotificationColor?: React.Dispatch<React.SetStateAction<string>>;
  notifyIpva?: boolean;
  setNotifyIpva?: React.Dispatch<React.SetStateAction<boolean>>;
  notifyBudget?: boolean;
  setNotifyBudget?: React.Dispatch<React.SetStateAction<boolean>>;
  notifyAppointments?: boolean;
  setNotifyAppointments?: React.Dispatch<React.SetStateAction<boolean>>;
  dailyCheckInTime?: string;
  setDailyCheckInTime?: React.Dispatch<React.SetStateAction<string>>;
  defaultVehicleId?: string;
  setDefaultVehicleId?: React.Dispatch<React.SetStateAction<string>>;
  licensingReminderDay?: number;
  setLicensingReminderDay?: React.Dispatch<React.SetStateAction<number>>;
  notifyLicensing?: boolean;
  setNotifyLicensing?: React.Dispatch<React.SetStateAction<boolean>>;
  notifyCarServices?: boolean;
  setNotifyCarServices?: React.Dispatch<React.SetStateAction<boolean>>;
  notifyMedical?: boolean;
  setNotifyMedical?: React.Dispatch<React.SetStateAction<boolean>>;
  notifyRiskZones?: boolean;
  setNotifyRiskZones?: React.Dispatch<React.SetStateAction<boolean>>;
  onReindexBankAccounts?: () => void;
  onReindexCreditCards?: () => void;
  onReindexVehicles?: () => void;
  onTriggerNotification?: (moduleTitle: string, customMessage: string) => void;
}
