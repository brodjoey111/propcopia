import { randomUUID } from 'crypto';
import type {
  CopyGroupActivity,
  CopyFollower,
  CopyGroup,
  CopyGroupHealth,
  CopyGroupObservability,
  CopyGroupRuntimeState,
  CopyGroupStatistics,
} from './copy-group-types';
import { TradeCopyEngine } from './trade-copy-engine';
import { TradeIntentManager } from './trade-intent-manager';
import { ExecutionManager } from './execution-manager';
import type { ExecutionRecord } from './execution-types';
import type { TradeIntent } from './trade-intent-types';
import { propCopiaEventBus } from './event-bus';
import { formatRuleReasonLabel } from './rule-reason-label';
import { CopyGroupActivityJournal } from './copy-group-activity-journal';

export interface RegisteredCopyGroup {
  group: CopyGroup;
  followers: CopyFollower[];
}

export interface CopyGroupRegistrationOptions {
  persistedState?: Partial<CopyGroupRuntimeState> | null;
}

export interface CopyGroupManagerOptions {
  onActivityRecorded?: (input: {
    userId: string;
    groupId: string;
    activity: CopyGroupActivity;
  }) => void | Promise<void>;
}

export interface CopyGroupRuntime {
  group: CopyGroup;
  followers: CopyFollower[];
  engine: TradeCopyEngine;
  tradeIntentManager: TradeIntentManager;
  executionManager: ExecutionManager;
  state: CopyGroupRuntimeState;
  statistics: CopyGroupStatistics;
  health: CopyGroupHealth;
  observability: CopyGroupObservability;
}

type TradeCopiedPayload = {
  followerCount?: number;
  successCount?: number;
  failureCount?: number;
};

type TradeRuleObservedPayload = {
  followerAccountId: string;
  masterFillId: string;
  symbol: string;
  reasonCode: string | null;
  side?: string;
  quantity?: number;
};

function nowIso(): string {
  return new Date().toISOString();
}

function createInitialState(groupId: string, followerCount: number): CopyGroupRuntimeState {
  return {
    groupId,
    status: 'STOPPED',
    isKillSwitchActive: false,
    masterConnected: false,
    connectedFollowerCount: 0,
    totalFollowerCount: followerCount,
  };
}

function createStateFromPersistence(
  groupId: string,
  followerCount: number,
  persistedState?: Partial<CopyGroupRuntimeState> | null,
): CopyGroupRuntimeState {
  const baseState = createInitialState(groupId, followerCount);

  if (!persistedState) {
    return baseState;
  }

  const safeState: CopyGroupRuntimeState = {
    ...baseState,
    lastMasterFillAt: persistedState.lastMasterFillAt,
    lastIntentCreatedAt: persistedState.lastIntentCreatedAt,
    lastExecutionAt: persistedState.lastExecutionAt,
    lastErrorAt: persistedState.lastErrorAt,
    lastErrorMessage: persistedState.lastErrorMessage,
  };

  switch (persistedState.status) {
    case 'PAUSED':
      safeState.status = 'PAUSED';
      safeState.pausedAt = persistedState.pausedAt ?? nowIso();
      safeState.resumedAt = persistedState.resumedAt;
      return safeState;
    case 'EMERGENCY_STOPPED':
      safeState.status = 'EMERGENCY_STOPPED';
      safeState.isKillSwitchActive = true;
      safeState.emergencyStoppedAt = persistedState.emergencyStoppedAt ?? nowIso();
      safeState.emergencyStopReason = persistedState.emergencyStopReason;
      return safeState;
    case 'STOPPED':
      safeState.stoppedAt = persistedState.stoppedAt;
      return safeState;
    case 'RUNNING':
    case 'STARTING':
    case 'STOPPING':
    case 'ERROR':
      safeState.stoppedAt = nowIso();
      return safeState;
    default:
      return safeState;
  }
}

function createInitialStatistics(groupId: string): CopyGroupStatistics {
  return {
    groupId,
    tradesObserved: 0,
    intentsCreated: 0,
    intentsSent: 0,
    intentsAcknowledged: 0,
    intentsFilled: 0,
    intentsRejected: 0,
    intentsCancelled: 0,
    intentsFailed: 0,
    followerOrdersSubmitted: 0,
    followerOrdersSucceeded: 0,
    followerOrdersFailed: 0,
    skippedBlockedSymbolCount: 0,
    skippedDisabledFollowerCount: 0,
    skippedZeroQuantityCount: 0,
    avgDispatchLatencyMs: 0,
    p50DispatchLatencyMs: 0,
    p95DispatchLatencyMs: 0,
    p99DispatchLatencyMs: 0,
    lastUpdatedAt: nowIso(),
  };
}

function createInitialHealth(groupId: string): CopyGroupHealth {
  return {
    groupId,
    status: 'DEGRADED',
    masterConnection: {
      ok: false,
      message: 'Group not started',
    },
    followerConnections: {
      ok: false,
      message: 'Group not started',
    },
    executionPipeline: {
      ok: false,
      message: 'Group not started',
    },
    intentPipeline: {
      ok: false,
      message: 'Group not started',
    },
    warnings: [],
    errors: [],
    checkedAt: nowIso(),
  };
}

export class CopyGroupManager {
  private groups = new Map<string, RegisteredCopyGroup>();
  private runtimes = new Map<string, CopyGroupRuntime>();
  private intentIdToGroupId = new Map<string, string>();
  private cleanupCallbacks = new Map<string, Array<() => void>>();
  private observedIntentStatuses = new Map<string, Map<string, Set<string>>>();
  private activityJournal = new CopyGroupActivityJournal();
  private onActivityRecorded?: CopyGroupManagerOptions["onActivityRecorded"];

  constructor(options: CopyGroupManagerOptions = {}) {
    this.onActivityRecorded = options.onActivityRecorded;
  }

  setActivityRecorder(onActivityRecorded?: CopyGroupManagerOptions["onActivityRecorded"]): void {
    this.onActivityRecorded = onActivityRecorded;
  }

  registerGroup(
    group: CopyGroup,
    followers: CopyFollower[],
    options?: CopyGroupRegistrationOptions,
  ): CopyGroupRuntime {
    if (this.groups.has(group.groupId)) {
      throw new Error(`Copy group already registered: ${group.groupId}`);
    }

    const tradeIntentManager = new TradeIntentManager();
    const engine = new TradeCopyEngine('demo', tradeIntentManager);
    const executionManager = engine.getExecutionManager();

    const runtime: CopyGroupRuntime = {
      group,
      followers,
      engine,
      tradeIntentManager: engine.getTradeIntentManager(),
      executionManager,
      state: createStateFromPersistence(
        group.groupId,
        followers.length,
        options?.persistedState,
      ),
      statistics: createInitialStatistics(group.groupId),
      health: createInitialHealth(group.groupId),
      observability: this.activityJournal.getObservability(group.groupId),
    };

    if (runtime.state.status === 'PAUSED') {
      runtime.executionManager.pause();
    }

    if (runtime.state.status === 'EMERGENCY_STOPPED') {
      runtime.executionManager.activateKillSwitch(runtime.state.emergencyStopReason);
    }

    this.groups.set(group.groupId, { group, followers });
    this.runtimes.set(group.groupId, runtime);
    this.cleanupCallbacks.set(group.groupId, []);
    this.observedIntentStatuses.set(group.groupId, new Map());
    this.subscribeRuntime(runtime);
    const persistedStatus = options?.persistedState?.status;
    if (persistedStatus === 'PAUSED') {
      this.recordActivity(runtime, {
        severity: 'WARN',
        category: 'LIFECYCLE',
        message: `Restored paused copy group ${group.name} in a safe offline state.`,
        details: {
          followerCount: followers.length,
          executionMode: group.executionSettings.mode,
        },
      });
    } else if (persistedStatus === 'EMERGENCY_STOPPED') {
      this.recordActivity(runtime, {
        severity: 'ERROR',
        category: 'LIFECYCLE',
        message: runtime.state.emergencyStopReason
          ? `Restored emergency stop for ${group.name}: ${runtime.state.emergencyStopReason}`
          : `Restored emergency stop for ${group.name}.`,
        details: {
          followerCount: followers.length,
          executionMode: group.executionSettings.mode,
        },
      });
    } else if (
      persistedStatus === 'RUNNING' ||
      persistedStatus === 'STARTING' ||
      persistedStatus === 'STOPPING' ||
      persistedStatus === 'ERROR'
    ) {
      this.recordActivity(runtime, {
        severity: 'WARN',
        category: 'LIFECYCLE',
        message: `Recovered copy group ${group.name} into STOPPED state after reload.`,
        details: {
          previousStatus: persistedStatus,
          followerCount: followers.length,
          executionMode: group.executionSettings.mode,
        },
      });
    } else {
      this.recordActivity(runtime, {
        severity: 'INFO',
        category: 'LIFECYCLE',
        message: `Registered copy group ${group.name}.`,
        details: {
          followerCount: followers.length,
          executionMode: group.executionSettings.mode,
        },
      });
    }
    return runtime;
  }

  syncGroup(
    group: CopyGroup,
    followers: CopyFollower[],
    options?: CopyGroupRegistrationOptions,
  ): CopyGroupRuntime {
    const existingRuntime = this.runtimes.get(group.groupId);
    if (!existingRuntime) {
      return this.registerGroup(group, followers, options);
    }

    if (
      existingRuntime.state.status === 'RUNNING' ||
      existingRuntime.state.status === 'STARTING' ||
      existingRuntime.state.status === 'STOPPING'
    ) {
      throw new Error(`Copy group ${group.groupId} must be stopped before syncing configuration.`);
    }

    const nextState = createStateFromPersistence(
      group.groupId,
      followers.length,
      options?.persistedState ?? existingRuntime.state,
    );

    existingRuntime.group = group;
    existingRuntime.followers = followers;
    existingRuntime.state = nextState;

    if (nextState.status === 'EMERGENCY_STOPPED') {
      existingRuntime.executionManager.activateKillSwitch(nextState.emergencyStopReason);
    } else {
      existingRuntime.executionManager.deactivateKillSwitch();
    }

    if (nextState.status === 'PAUSED') {
      existingRuntime.executionManager.pause();
    } else {
      existingRuntime.executionManager.resume();
    }

    this.groups.set(group.groupId, { group, followers });
    existingRuntime.statistics.lastUpdatedAt = nowIso();
    this.recordActivity(existingRuntime, {
      severity: 'INFO',
      category: 'LIFECYCLE',
      message: `Synchronized copy group ${group.name} configuration.`,
      details: {
        followerCount: followers.length,
        executionMode: group.executionSettings.mode,
      },
    });
    this.refreshHealth(existingRuntime);

    return existingRuntime;
  }

  async unregisterGroup(groupId: string): Promise<void> {
    const runtime = this.runtimes.get(groupId);
    if (!runtime) {
      throw new Error(`Copy group not found: ${groupId}`);
    }

    if (runtime.state.status !== 'STOPPED' && runtime.state.status !== 'EMERGENCY_STOPPED') {
      await this.stop(groupId);
    }

    const cleanupCallbacks = this.cleanupCallbacks.get(groupId) ?? [];
    for (const cleanup of cleanupCallbacks) {
      cleanup();
    }

    for (const [intentId, indexedGroupId] of Array.from(this.intentIdToGroupId.entries())) {
      if (indexedGroupId === groupId) {
        this.intentIdToGroupId.delete(intentId);
      }
    }

    this.cleanupCallbacks.delete(groupId);
    this.observedIntentStatuses.delete(groupId);
    this.runtimes.delete(groupId);
    this.groups.delete(groupId);
  }

  async start(groupId: string): Promise<void> {
    const runtime = this.requireRuntime(groupId);
    if (runtime.state.status !== 'STOPPED') {
      throw new Error(`Copy group ${groupId} cannot start from status ${runtime.state.status}`);
    }

    runtime.state.status = 'STARTING';
    this.refreshHealth(runtime);

    runtime.state.startedAt = nowIso();
    runtime.state.status = 'RUNNING';
    runtime.statistics.lastUpdatedAt = nowIso();
    this.recordActivity(runtime, {
      severity: 'INFO',
      category: 'LIFECYCLE',
      message: `Copy group ${runtime.group.name} started.`,
      details: {
        followerCount: runtime.followers.length,
      },
    });
    propCopiaEventBus.publish('copy_group.started', {
      group: runtime.group,
      runtime: { ...runtime.state },
      startedAt: runtime.state.startedAt,
    });
    this.refreshHealth(runtime);
  }

  async stop(groupId: string): Promise<void> {
    const runtime = this.requireRuntime(groupId);
    if (runtime.state.status === 'STOPPED') {
      throw new Error(`Copy group ${groupId} is already STOPPED`);
    }

    runtime.state.status = 'STOPPING';
    this.refreshHealth(runtime);

    await runtime.engine.disconnect();

    runtime.state.status = 'STOPPED';
    runtime.state.stoppedAt = nowIso();
    runtime.state.masterConnected = false;
    runtime.state.connectedFollowerCount = 0;
    runtime.state.isKillSwitchActive = false;
    runtime.state.emergencyStopReason = undefined;
    runtime.statistics.lastUpdatedAt = nowIso();
    this.recordActivity(runtime, {
      severity: 'INFO',
      category: 'LIFECYCLE',
      message: `Copy group ${runtime.group.name} stopped.`,
    });
    if (runtime.state.stoppedAt) {
      propCopiaEventBus.publish('copy_group.stopped', {
        group: runtime.group,
        runtime: { ...runtime.state },
        stoppedAt: runtime.state.stoppedAt,
      });
    }
    this.refreshHealth(runtime);
  }

  pause(groupId: string): void {
    const runtime = this.requireRuntime(groupId);
    if (runtime.state.status !== 'RUNNING') {
      throw new Error(`Copy group ${groupId} cannot pause from status ${runtime.state.status}`);
    }

    runtime.executionManager.pause();
    runtime.state.status = 'PAUSED';
    runtime.state.pausedAt = nowIso();
    runtime.statistics.lastUpdatedAt = nowIso();
    this.recordActivity(runtime, {
      severity: 'WARN',
      category: 'LIFECYCLE',
      message: `Copy group ${runtime.group.name} paused.`,
    });
    if (runtime.state.pausedAt) {
      propCopiaEventBus.publish('copy_group.paused', {
        group: runtime.group,
        runtime: { ...runtime.state },
        pausedAt: runtime.state.pausedAt,
      });
    }
    this.refreshHealth(runtime);
  }

  resume(groupId: string): void {
    const runtime = this.requireRuntime(groupId);
    if (runtime.state.status !== 'PAUSED') {
      throw new Error(`Copy group ${groupId} cannot resume from status ${runtime.state.status}`);
    }

    runtime.executionManager.resume();
    runtime.state.status = 'RUNNING';
    runtime.state.resumedAt = nowIso();
    runtime.statistics.lastUpdatedAt = nowIso();
    this.recordActivity(runtime, {
      severity: 'INFO',
      category: 'LIFECYCLE',
      message: `Copy group ${runtime.group.name} resumed.`,
    });
    if (runtime.state.resumedAt) {
      propCopiaEventBus.publish('copy_group.resumed', {
        group: runtime.group,
        runtime: { ...runtime.state },
        resumedAt: runtime.state.resumedAt,
      });
    }
    this.refreshHealth(runtime);
  }

  async emergencyStop(groupId: string, reason?: string): Promise<void> {
    const runtime = this.requireRuntime(groupId);

    runtime.executionManager.activateKillSwitch(reason);
    await runtime.engine.disconnect();

    runtime.state.status = 'EMERGENCY_STOPPED';
    runtime.state.isKillSwitchActive = true;
    runtime.state.emergencyStoppedAt = nowIso();
    runtime.state.emergencyStopReason = reason;
    runtime.state.masterConnected = false;
    runtime.state.connectedFollowerCount = 0;
    runtime.statistics.lastUpdatedAt = nowIso();
    this.recordActivity(runtime, {
      severity: 'ERROR',
      category: 'LIFECYCLE',
      message: runtime.state.emergencyStopReason
        ? `Emergency stop activated: ${runtime.state.emergencyStopReason}`
        : 'Emergency stop activated.',
    });
    if (runtime.state.emergencyStoppedAt) {
      propCopiaEventBus.publish('copy_group.emergency_stopped', {
        group: runtime.group,
        runtime: { ...runtime.state },
        emergencyStoppedAt: runtime.state.emergencyStoppedAt,
        reason,
      });
    }
    this.refreshHealth(runtime);
  }

  getGroup(groupId: string): RegisteredCopyGroup | undefined {
    return this.groups.get(groupId);
  }

  getRuntime(groupId: string): CopyGroupRuntime | undefined {
    return this.runtimes.get(groupId);
  }

  getAllGroups(): RegisteredCopyGroup[] {
    return Array.from(this.groups.values());
  }

  getRunningGroups(): CopyGroupRuntime[] {
    return Array.from(this.runtimes.values()).filter((runtime) =>
      runtime.state.status === 'RUNNING' || runtime.state.status === 'PAUSED'
    );
  }

  getRecentActivity(groupId: string): CopyGroupActivity[] {
    this.requireRuntime(groupId);
    return this.activityJournal.getRecentActivity(groupId);
  }

  getPersistedState(groupId: string): CopyGroupRuntimeState {
    const runtime = this.requireRuntime(groupId);

    return createStateFromPersistence(
      runtime.group.groupId,
      runtime.followers.length,
      runtime.state,
    );
  }

  recordExternalActivity(
    groupId: string,
    activity: Omit<CopyGroupActivity, 'eventId' | 'groupId' | 'timestamp'>,
  ): void {
    const runtime = this.requireRuntime(groupId);
    this.recordActivity(runtime, activity);

    if (activity.severity === 'ERROR') {
      runtime.state.lastErrorAt = nowIso();
      runtime.state.lastErrorMessage = activity.message;
    }

    runtime.statistics.lastUpdatedAt = nowIso();
    this.refreshHealth(runtime);
  }

  private requireRuntime(groupId: string): CopyGroupRuntime {
    const runtime = this.runtimes.get(groupId);
    if (!runtime) {
      throw new Error(`Copy group not found: ${groupId}`);
    }

    return runtime;
  }

  private subscribeRuntime(runtime: CopyGroupRuntime): void {
    const groupId = runtime.group.groupId;
    const cleanups = this.cleanupCallbacks.get(groupId);
    if (!cleanups) {
      return;
    }

    const onIntentCreated = (intent: TradeIntent) => {
      this.intentIdToGroupId.set(intent.intentId, groupId);
      runtime.statistics.intentsCreated += 1;
      runtime.state.lastIntentCreatedAt = nowIso();
      runtime.statistics.lastUpdatedAt = nowIso();
      this.recordActivity(runtime, {
        severity: 'INFO',
        category: 'INTENT',
        message: `Intent created for ${intent.symbol} ${intent.side} x${intent.quantity}.`,
        intentId: intent.intentId,
        followerAccountId: intent.followerAccountId,
        details: {
          masterFillId: intent.masterFillId,
        },
      });
      this.refreshHealth(runtime);
    };

    const onIntentUpdated = (intent: TradeIntent) => {
      const statusSetByIntent = this.observedIntentStatuses.get(groupId);
      if (!statusSetByIntent) {
        return;
      }

      const observedStatuses = statusSetByIntent.get(intent.intentId) ?? new Set<string>();
      if (observedStatuses.has(intent.status)) {
        return;
      }

      let incremented = false;

      switch (intent.status) {
        case 'SENT':
          runtime.statistics.intentsSent += 1;
          incremented = true;
          break;
        case 'ACKNOWLEDGED':
          runtime.statistics.intentsAcknowledged += 1;
          incremented = true;
          break;
        case 'FILLED':
          runtime.statistics.intentsFilled += 1;
          incremented = true;
          break;
        case 'REJECTED':
          runtime.statistics.intentsRejected += 1;
          incremented = true;
          break;
        case 'CANCELLED':
          runtime.statistics.intentsCancelled += 1;
          incremented = true;
          break;
        case 'FAILED':
          runtime.statistics.intentsFailed += 1;
          incremented = true;
          break;
      }

      if (!incremented) {
        return;
      }

      observedStatuses.add(intent.status);
      statusSetByIntent.set(intent.intentId, observedStatuses);
      runtime.statistics.lastUpdatedAt = nowIso();
      this.recordActivity(runtime, {
        severity:
          intent.status === 'FAILED' || intent.status === 'REJECTED' ? 'ERROR' : 'INFO',
        category: 'INTENT',
        message: `Intent ${intent.status} for ${intent.symbol} ${intent.side} x${intent.quantity}.`,
        intentId: intent.intentId,
        followerAccountId: intent.followerAccountId,
      });
      this.refreshHealth(runtime);
    };

    const onExecutionQueued = (record: ExecutionRecord) => {
      this.recordActivity(runtime, {
        severity: 'INFO',
        category: 'EXECUTION',
        message: `Execution queued for ${record.request.symbol} ${record.request.side} x${record.request.quantity}.`,
        intentId: record.intentId,
        followerAccountId: record.intent.followerAccountId,
      });
    };

    const onExecutionSent = (record: ExecutionRecord) => {
      this.recordActivity(runtime, {
        severity: 'INFO',
        category: 'EXECUTION',
        message: `Execution sent to broker for ${record.request.symbol} ${record.request.side} x${record.request.quantity}.`,
        intentId: record.intentId,
        followerAccountId: record.intent.followerAccountId,
        details: {
          attempts: record.attempts,
        },
      });
    };

    const onExecutionFailed = (record: ExecutionRecord) => {
      runtime.state.lastErrorAt = record.failedAt ?? nowIso();
      runtime.state.lastErrorMessage = record.lastErrorMessage;
      this.recordActivity(runtime, {
        severity: 'ERROR',
        category: 'EXECUTION',
        message: record.lastErrorMessage ?? 'Execution failed.',
        intentId: record.intentId,
        followerAccountId: record.intent.followerAccountId,
        details: {
          attempts: record.attempts,
          brokerKey: record.brokerKey,
        },
      });
      this.refreshHealth(runtime);
    };

    const onExecutionCancelled = (record: ExecutionRecord) => {
      this.recordActivity(runtime, {
        severity: 'WARN',
        category: 'EXECUTION',
        message: `Execution cancelled for ${record.request.symbol} ${record.request.side} x${record.request.quantity}.`,
        intentId: record.intentId,
        followerAccountId: record.intent.followerAccountId,
      });
    };

    const onMasterFillReceived = (payload: { timestamp: string; fillId: string; symbol: string }) => {
      runtime.state.lastMasterFillAt = payload.timestamp;
      this.recordActivity(runtime, {
        severity: 'INFO',
        category: 'TRADE',
        message: `Master fill received for ${payload.symbol}.`,
        details: {
          fillId: payload.fillId,
        },
      });
    };

    const onRuleAllowed = (payload: TradeRuleObservedPayload) => {
      this.recordActivity(runtime, {
        severity: 'INFO',
        category: 'RULE',
        message: `Follower ${payload.followerAccountId} passed rule checks for ${payload.symbol}.`,
        followerAccountId: payload.followerAccountId,
        details: {
          masterFillId: payload.masterFillId,
          quantity: payload.quantity ?? 0,
        },
      });
    };

    const onRuleSkipped = (payload: TradeRuleObservedPayload) => {
      const reasonLabel = formatRuleReasonLabel(payload.reasonCode);
      if (payload.reasonCode === 'SYMBOL_BLOCKED') {
        runtime.statistics.skippedBlockedSymbolCount += 1;
      }
      if (payload.reasonCode === 'FOLLOWER_DISABLED') {
        runtime.statistics.skippedDisabledFollowerCount += 1;
      }
      if (payload.reasonCode === 'ZERO_QUANTITY') {
        runtime.statistics.skippedZeroQuantityCount += 1;
      }
      runtime.statistics.lastUpdatedAt = nowIso();
      this.recordActivity(runtime, {
        severity: 'WARN',
        category: 'RULE',
        message: `Follower ${payload.followerAccountId} skipped for ${payload.symbol}: ${reasonLabel}.`,
        followerAccountId: payload.followerAccountId,
        details: {
          masterFillId: payload.masterFillId,
        },
      });
    };

    const onRuleRejected = (payload: TradeRuleObservedPayload) => {
      const reasonLabel = formatRuleReasonLabel(payload.reasonCode);
      runtime.state.lastErrorAt = nowIso();
      runtime.state.lastErrorMessage = `${reasonLabel} for ${payload.followerAccountId}`;
      runtime.statistics.lastUpdatedAt = nowIso();
      this.recordActivity(runtime, {
        severity: 'ERROR',
        category: 'RULE',
        message: `Follower ${payload.followerAccountId} rejected for ${payload.symbol}: ${reasonLabel}.`,
        followerAccountId: payload.followerAccountId,
        details: {
          masterFillId: payload.masterFillId,
        },
      });
      this.refreshHealth(runtime);
    };

    const onTradeCopied = (payload: TradeCopiedPayload) => {
      runtime.statistics.tradesObserved += 1;

      if (typeof payload.successCount === 'number') {
        runtime.statistics.followerOrdersSucceeded += payload.successCount;
      }

      if (typeof payload.failureCount === 'number') {
        runtime.statistics.followerOrdersFailed += payload.failureCount;
      }

      if (
        typeof payload.successCount === 'number' &&
        typeof payload.failureCount === 'number'
      ) {
        runtime.statistics.followerOrdersSubmitted += payload.successCount + payload.failureCount;
      } else if (typeof payload.followerCount === 'number') {
        runtime.statistics.followerOrdersSubmitted += payload.followerCount;
      }

      const latency = runtime.engine.getLatencyStats();
      if (latency.sampleSize > 0) {
        runtime.statistics.avgDispatchLatencyMs = latency.avgLatency;
        runtime.statistics.p50DispatchLatencyMs = latency.p50;
        runtime.statistics.p95DispatchLatencyMs = latency.p95;
        runtime.statistics.p99DispatchLatencyMs = latency.p99;
      }

      runtime.state.lastExecutionAt = nowIso();
      runtime.statistics.lastUpdatedAt = nowIso();
      this.syncConnectionState(runtime);
      this.recordActivity(runtime, {
        severity: payload.failureCount && payload.failureCount > 0 ? 'WARN' : 'INFO',
        category: 'TRADE',
        message: `Trade copied to ${payload.successCount ?? 0}/${payload.followerCount ?? 0} followers.`,
        details: {
          successCount: payload.successCount ?? 0,
          failureCount: payload.failureCount ?? 0,
        },
      });
      this.refreshHealth(runtime);
    };

    runtime.tradeIntentManager.on('intentCreated', onIntentCreated);
    runtime.tradeIntentManager.on('intentUpdated', onIntentUpdated);
    runtime.executionManager.on('executionQueued', onExecutionQueued);
    runtime.executionManager.on('executionSent', onExecutionSent);
    runtime.executionManager.on('executionFailed', onExecutionFailed);
    runtime.executionManager.on('executionCancelled', onExecutionCancelled);
    runtime.engine.on('masterFillReceived', onMasterFillReceived);
    runtime.engine.on('ruleAllowed', onRuleAllowed);
    runtime.engine.on('ruleSkipped', onRuleSkipped);
    runtime.engine.on('ruleRejected', onRuleRejected);
    runtime.engine.on('tradeCopied', onTradeCopied);

    cleanups.push(() => runtime.tradeIntentManager.off('intentCreated', onIntentCreated));
    cleanups.push(() => runtime.tradeIntentManager.off('intentUpdated', onIntentUpdated));
    cleanups.push(() => runtime.executionManager.off('executionQueued', onExecutionQueued));
    cleanups.push(() => runtime.executionManager.off('executionSent', onExecutionSent));
    cleanups.push(() => runtime.executionManager.off('executionFailed', onExecutionFailed));
    cleanups.push(() => runtime.executionManager.off('executionCancelled', onExecutionCancelled));
    cleanups.push(() => runtime.engine.off('masterFillReceived', onMasterFillReceived));
    cleanups.push(() => runtime.engine.off('ruleAllowed', onRuleAllowed));
    cleanups.push(() => runtime.engine.off('ruleSkipped', onRuleSkipped));
    cleanups.push(() => runtime.engine.off('ruleRejected', onRuleRejected));
    cleanups.push(() => runtime.engine.off('tradeCopied', onTradeCopied));
  }

  private syncConnectionState(runtime: CopyGroupRuntime): void {
    const status = runtime.engine.getStatus();
    runtime.state.masterConnected = status.masterConnected;
    runtime.state.connectedFollowerCount = status.connectedFollowerCount;
    runtime.state.totalFollowerCount = runtime.followers.length;
    runtime.state.lastMasterFillAt = status.lastMasterFillAt ?? runtime.state.lastMasterFillAt;
  }

  private recordActivity(
    runtime: CopyGroupRuntime,
    activity: Omit<CopyGroupActivity, 'eventId' | 'groupId' | 'timestamp'>
  ): void {
    const timestamp = nowIso();
    const entry: CopyGroupActivity = {
      eventId: randomUUID(),
      groupId: runtime.group.groupId,
      timestamp,
      ...activity,
    };

    runtime.observability = this.activityJournal.append(runtime.group.groupId, entry);

    if (!this.onActivityRecorded) {
      return;
    }

    Promise.resolve(
      this.onActivityRecorded({
        userId: runtime.group.userId,
        groupId: runtime.group.groupId,
        activity: entry,
      }),
    ).catch((error) => {
      console.error('Failed to persist copy-group activity:', error);
    });
  }

  private refreshHealth(runtime: CopyGroupRuntime): void {
    this.syncConnectionState(runtime);
    const checkedAt = nowIso();
    const warnings: string[] = [];
    const errors: string[] = [];

    const executionPipelineOk =
      runtime.state.status === 'RUNNING' || runtime.state.status === 'PAUSED';
    const intentPipelineOk =
      runtime.state.status !== 'STOPPED' && runtime.state.status !== 'EMERGENCY_STOPPED';

    if (!runtime.state.masterConnected) {
      warnings.push('Master account is not connected in Phase 1.');
    }

    if (runtime.state.connectedFollowerCount < runtime.state.totalFollowerCount) {
      warnings.push('Not all followers are connected in Phase 1.');
    }

    if (runtime.state.status === 'ERROR') {
      errors.push(runtime.state.lastErrorMessage ?? 'Copy group entered ERROR status.');
    }

    if (runtime.state.status === 'EMERGENCY_STOPPED') {
      errors.push(
        runtime.state.emergencyStopReason
          ? `Emergency stop: ${runtime.state.emergencyStopReason}`
          : 'Emergency stop activated.'
      );
    }

    runtime.health.masterConnection = {
      ok: runtime.state.masterConnected,
      message:
        runtime.state.status === 'STOPPED'
          ? 'Group stopped'
          : runtime.state.masterConnected
            ? 'Master connected'
            : 'Group started without master connection in Phase 1',
      lastFailureAt: runtime.state.masterConnected ? undefined : checkedAt,
    };

    runtime.health.followerConnections = {
      ok:
        runtime.state.totalFollowerCount === 0 ||
        runtime.state.connectedFollowerCount === runtime.state.totalFollowerCount,
      message:
        runtime.state.status === 'STOPPED'
          ? 'Group stopped'
          : `Connected followers: ${runtime.state.connectedFollowerCount}/${runtime.state.totalFollowerCount}`,
      lastFailureAt:
        runtime.state.connectedFollowerCount === runtime.state.totalFollowerCount
          ? undefined
          : checkedAt,
    };

    runtime.health.executionPipeline = {
      ok: executionPipelineOk,
      message:
        runtime.state.status === 'STOPPED'
          ? 'Group not started'
          : runtime.state.status === 'EMERGENCY_STOPPED'
            ? 'Execution pipeline halted by emergency stop'
            : runtime.executionManager.isPaused()
              ? 'Execution pipeline paused'
              : 'Execution pipeline ready',
    };

    runtime.health.intentPipeline = {
      ok: intentPipelineOk,
      message:
        runtime.state.status === 'STOPPED'
          ? 'Group not started'
          : runtime.state.status === 'EMERGENCY_STOPPED'
            ? 'Intent pipeline halted by emergency stop'
            : 'Intent pipeline ready',
    };

    runtime.health.warnings = warnings;
    runtime.health.errors = errors;
    runtime.health.checkedAt = checkedAt;

    if (errors.length > 0) {
      runtime.health.status = 'UNHEALTHY';
    } else if (warnings.length > 0 || !runtime.health.executionPipeline.ok || !runtime.health.intentPipeline.ok) {
      runtime.health.status = 'DEGRADED';
    } else {
      runtime.health.status = 'HEALTHY';
    }
  }
}

export const copyGroupManager = new CopyGroupManager();
