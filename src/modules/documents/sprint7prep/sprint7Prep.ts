export interface DashboardAnalytics {
  calcularMétricasGerais(): Promise<any>;
}

export interface FinancialBI {
  gerarRelatórioBI(): Promise<any>;
}

export interface PredictiveDashboard {
  obterPrevisõesFuturas(): Promise<any>;
}

export interface SmartNotifications {
  enviarNotificaçãoInteligente(mensagem: string, severidade: 'INFO' | 'ALERTA' | 'CRITICO'): void;
}

export interface GoalEngine {
  processarMetas(): Promise<any>;
}

export interface InvestmentEngine {
  analisarCarteira(): Promise<any>;
}

export interface VehicleCostAnalyzer {
  calcularCustoPorKm(): Promise<any>;
}

export interface MaintenancePredictor {
  preverManutenções(): Promise<any>;
}

export interface RiskScoring {
  calcularPontuaçãoRisco(): Promise<number>;
}

export interface PersonalAssistant {
  responderConsultaVozOuTexto(query: string): Promise<string>;
}
