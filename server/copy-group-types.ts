export type CopyGroupStatus =
  | 'STOPPED'
  | 'STARTING'
  | 'RUNNING'
  | 'PAUSED'
  | 'STOPPING'
  | 'EMERGENCY_STOPPED'
  | 'ERROR';

export type CopyGroupHealthStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNHEALTHY';

export type CopySizingMode =
  | 'MULTIPLIER'
  | 'FIXED';

export interface CopyGroup {
  groupId: string;
  userId: string;
  name: string;
  masterAccountId: string;
  followerAccountIds: string[];
  groupSettings: CopyGroupSettings;
  riskSettings: CopyGroupRiskSettings;
  executionSettings: CopyGroupExecutionSettings;
  createdAt: string;
  updatedAt: string;
}

export interface CopyGroupSettings {
  enabled: boolean;
  allowedSymbols?: string[];
  blockedSymbols?: string[];
  notes?: string;
}

export interface CopyGroupRiskSettings {
  maxGroupNotional?: number;
  maxGroupContracts?: number;
  maxDailyLoss?: number;
  onRiskBreach: 'PAUSE' | 'STOP' | 'FLATTEN_AND_STOP';
}

export interface CopyGroupExecutionSettings {
  mode: 'LIVE' | 'SIMULATED';
  maxRetries: number;
  retryDelayMs: number;
  orderTimeoutMs: number;
  flattenOnEmergencyStop: boolean;
}

export interface CopyFollower {
  groupId: string;
  followerAccountId: string;
  enabled: boolean;
  sizingMode?: CopySizingMode;
  fixedQuantity?: number;
  multiplier?: number;
  reverseCopy?: boolean;
  maxContracts?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CopyGroupRuntimeState {
  groupId: string;
  status: CopyGroupStatus;
  startedAt?: string;
  stoppedAt?: string;
  pausedAt?: string;
  resumedAt?: string;
  emergencyStoppedAt?: string;
  isKillSwitchActive: boolean;
  emergencyStopReason?: string;
  masterConnected: boolean;
  connectedFollowerCount: number;
  totalFollowerCount: number;
  lastMasterFillAt?: string;
  lastIntentCreatedAt?: string;
  lastExecutionAt?: string;
  lastErrorAt?: string;
  lastErrorMessage?: string;
}

export interface CopyGroupStatistics {
  groupId: string;
  tradesObserved: number;
  intentsCreated: number;
  intentsSent: number;
  intentsAcknowledged: number;
  intentsFilled: number;
  intentsRejected: number;
  intentsCancelled: number;
  intentsFailed: number;
  followerOrdersSubmitted: number;
  followerOrdersSucceeded: number;
  followerOrdersFailed: number;
  skippedBlockedSymbolCount: number;
  skippedDisabledFollowerCount: number;
  skippedZeroQuantityCount: number;
  avgDispatchLatencyMs: number;
  p50DispatchLatencyMs: number;
  p95DispatchLatencyMs: number;
  p99DispatchLatencyMs: number;
  lastUpdatedAt: string;
}

export interface CopyGroupHealth {
  groupId: string;
  status: CopyGroupHealthStatus;
  masterConnection: HealthCheck;
  followerConnections: HealthCheck;
  executionPipeline: HealthCheck;
  intentPipeline: HealthCheck;
  warnings: string[];
  errors: string[];
  checkedAt: string;
}

export interface HealthCheck {
  ok: boolean;
  message: string;
  lastSuccessAt?: string;
  lastFailureAt?: string;
}
