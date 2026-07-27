/**
 * PREPARAÇÃO ARQUITETURAL PARA A SPRINT 8
 * Interfaces e contratos para Automações, Sincronização Offline, Nuvem e Colaboração Multi-usuário.
 */

export interface CloudBackup {
  backupId: string;
  timestamp: string;
  sizeBytes: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  cloudProvider: 'GOOGLE_DRIVE' | 'GOOGLE_APPS_SCRIPT' | 'AWS_S3';
  downloadUrl?: string;
}

export interface OfflineSync {
  pendingSyncCount: number;
  lastSyncedTimestamp: string;
  syncState: 'IDLE' | 'SYNCING' | 'OFFLINE' | 'ERROR';
  queueItemIds: string[];
}

export interface MultiUser {
  userId: string;
  userName: string;
  email: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER' | 'AUDITOR';
  activeSessionId: string;
  avatarUrl?: string;
}

export interface PermissionManager {
  userRole: MultiUser['role'];
  allowedModules: string[];
  canExportData: boolean;
  canEditSettings: boolean;
  canManageUsers: boolean;
}

export interface AuditCenter {
  auditId: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress?: string;
  details: Record<string, unknown>;
}

export interface NotificationCenter {
  notificationId: string;
  recipientUserId: string;
  title: string;
  message: string;
  channel: 'PUSH' | 'EMAIL' | 'IN_APP' | 'WHATSAPP';
  read: boolean;
  createdAt: string;
}

export interface AutomationEngine {
  automationId: string;
  name: string;
  triggerType: 'CRON' | 'EVENT' | 'WEBHOOK';
  active: boolean;
  lastExecutionTime?: string;
  executionCount: number;
}

export interface WorkflowEngine {
  workflowId: string;
  title: string;
  steps: {
    stepId: string;
    stepName: string;
    action: string;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }[];
  currentStepIndex: number;
  completed: boolean;
}

export interface SmartScheduler {
  scheduleId: string;
  taskName: string;
  cronExpression: string;
  nextRunTime: string;
  enabled: boolean;
}

export interface WebhookEngine {
  webhookId: string;
  targetUrl: string;
  secretToken: string;
  events: string[];
  enabled: boolean;
  retryCount: number;
}
