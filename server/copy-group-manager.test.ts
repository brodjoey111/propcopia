import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CopyGroupManager, copyGroupManager } from './copy-group-manager';
import type { CopyFollower, CopyGroup } from './copy-group-types';
import { propCopiaEventBus } from './event-bus';

function createGroup(groupId: string, overrides: Partial<CopyGroup> = {}): CopyGroup {
  return {
    groupId,
    userId: `user-${groupId}`,
    name: `Group ${groupId}`,
    masterAccountId: `master-${groupId}`,
    followerAccountIds: [`follower-${groupId}-1`, `follower-${groupId}-2`],
    groupSettings: {
      enabled: true,
    },
    riskSettings: {
      onRiskBreach: 'PAUSE',
    },
    executionSettings: {
      mode: 'LIVE',
      maxRetries: 0,
      retryDelayMs: 1000,
      orderTimeoutMs: 5000,
      flattenOnEmergencyStop: false,
    },
    createdAt: '2026-08-03T12:00:00.000Z',
    updatedAt: '2026-08-03T12:00:00.000Z',
    ...overrides,
  };
}

function createFollowers(groupId: string): CopyFollower[] {
  return [
    {
      groupId,
      followerAccountId: `follower-${groupId}-1`,
      enabled: true,
      createdAt: '2026-08-03T12:00:00.000Z',
      updatedAt: '2026-08-03T12:00:00.000Z',
    },
    {
      groupId,
      followerAccountId: `follower-${groupId}-2`,
      enabled: true,
      createdAt: '2026-08-03T12:00:00.000Z',
      updatedAt: '2026-08-03T12:00:00.000Z',
    },
  ];
}

function createIntentInput(suffix: string) {
  return {
    masterAccountId: `master-${suffix}`,
    masterFillId: `fill-${suffix}`,
    followerAccountId: `follower-${suffix}`,
    symbol: 'ES',
    side: 'BUY' as const,
    quantity: 1,
  };
}

test('registration creates exactly one runtime component of each type', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));

  assert.equal(runtime.tradeIntentManager, runtime.engine.getTradeIntentManager());
  assert.equal(runtime.executionManager, runtime.engine.getExecutionManager());
  assert.equal(runtime.state.status, 'STOPPED');
  assert.equal(runtime.state.totalFollowerCount, 2);
  assert.equal(runtime.health.status, 'DEGRADED');
});

test('duplicate registration throws', () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));

  assert.throws(() => manager.registerGroup(createGroup('g1'), createFollowers('g1')), {
    message: 'Copy group already registered: g1',
  });
});

test('two groups have isolated managers, engines, state, statistics, and health', () => {
  const manager = new CopyGroupManager();
  const first = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const second = manager.registerGroup(createGroup('g2'), createFollowers('g2'));

  assert.notEqual(first.tradeIntentManager, second.tradeIntentManager);
  assert.notEqual(first.executionManager, second.executionManager);
  assert.notEqual(first.engine, second.engine);
  assert.notEqual(first.state, second.state);
  assert.notEqual(first.statistics, second.statistics);
  assert.notEqual(first.health, second.health);
});

test('start changes only the selected group', async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  manager.registerGroup(createGroup('g2'), createFollowers('g2'));

  await manager.start('g1');

  assert.equal(manager.getRuntime('g1')?.state.status, 'RUNNING');
  assert.equal(manager.getRuntime('g2')?.state.status, 'STOPPED');
  assert.deepEqual(manager.getRunningGroups().map((runtime) => runtime.group.groupId), ['g1']);
});

test('pause and resume affect only the selected group', async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  manager.registerGroup(createGroup('g2'), createFollowers('g2'));

  await manager.start('g1');
  await manager.start('g2');
  manager.pause('g1');

  assert.equal(manager.getRuntime('g1')?.state.status, 'PAUSED');
  assert.equal(manager.getRuntime('g1')?.executionManager.isPaused(), true);
  assert.equal(manager.getRuntime('g2')?.state.status, 'RUNNING');
  assert.equal(manager.getRuntime('g2')?.executionManager.isPaused(), false);

  manager.resume('g1');
  assert.equal(manager.getRuntime('g1')?.state.status, 'RUNNING');
  assert.equal(manager.getRuntime('g1')?.executionManager.isPaused(), false);
});

test('registerGroup restores paused groups without restoring live connections', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'), {
    persistedState: {
      status: 'PAUSED',
      pausedAt: '2026-08-05T10:00:00.000Z',
      masterConnected: true,
      connectedFollowerCount: 2,
      totalFollowerCount: 2,
    },
  });

  assert.equal(runtime.state.status, 'PAUSED');
  assert.equal(runtime.state.pausedAt, '2026-08-05T10:00:00.000Z');
  assert.equal(runtime.state.masterConnected, false);
  assert.equal(runtime.state.connectedFollowerCount, 0);
  assert.equal(runtime.executionManager.isPaused(), true);
  assert.equal(
    manager.getRecentActivity('g1')[0]?.message,
    'Restored paused copy group Group g1 in a safe offline state.',
  );
});

test('registerGroup restores emergency stops with kill switch active', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'), {
    persistedState: {
      status: 'EMERGENCY_STOPPED',
      emergencyStoppedAt: '2026-08-05T10:05:00.000Z',
      emergencyStopReason: 'manual review required',
    },
  });

  assert.equal(runtime.state.status, 'EMERGENCY_STOPPED');
  assert.equal(runtime.state.isKillSwitchActive, true);
  assert.equal(runtime.state.emergencyStopReason, 'manual review required');
  assert.equal(runtime.executionManager.isKillSwitchActive(), true);
  assert.equal(
    manager.getRecentActivity('g1')[0]?.message,
    'Restored emergency stop for Group g1: manual review required',
  );
});

test('registerGroup downgrades active persisted runtime states into STOPPED', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'), {
    persistedState: {
      status: 'RUNNING',
      startedAt: '2026-08-05T10:00:00.000Z',
      masterConnected: true,
      connectedFollowerCount: 2,
    },
  });

  assert.equal(runtime.state.status, 'STOPPED');
  assert.equal(runtime.state.masterConnected, false);
  assert.equal(runtime.state.connectedFollowerCount, 0);
  assert.equal(typeof runtime.state.stoppedAt, 'string');
  assert.equal(
    manager.getRecentActivity('g1')[0]?.message,
    'Recovered copy group Group g1 into STOPPED state after reload.',
  );
});

test('syncGroup updates a stopped group in place and preserves safe lifecycle state', () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));

  const syncedRuntime = manager.syncGroup(
    createGroup('g1', {
      name: 'Group g1 synced',
      followerAccountIds: ['follower-g1-1'],
    }),
    [createFollowers('g1')[0]!],
    {
      persistedState: {
        status: 'PAUSED',
      },
    },
  );

  assert.equal(syncedRuntime.group.name, 'Group g1 synced');
  assert.equal(syncedRuntime.followers.length, 1);
  assert.equal(syncedRuntime.state.status, 'PAUSED');
  assert.equal(syncedRuntime.executionManager.isPaused(), true);
  assert.equal(
    manager.getRecentActivity('g1')[0]?.message,
    'Synchronized copy group Group g1 synced configuration.',
  );
});

test('syncGroup rejects configuration changes while a group is actively running', async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  await manager.start('g1');

  assert.throws(
    () => manager.syncGroup(createGroup('g1'), createFollowers('g1')),
    {
      message: 'Copy group g1 must be stopped before syncing configuration.',
    },
  );
});

test('emergencyStop affects only the selected group', async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  manager.registerGroup(createGroup('g2'), createFollowers('g2'));

  await manager.start('g1');
  await manager.start('g2');
  await manager.emergencyStop('g1', 'panic');

  assert.equal(manager.getRuntime('g1')?.state.status, 'EMERGENCY_STOPPED');
  assert.equal(manager.getRuntime('g1')?.state.isKillSwitchActive, true);
  assert.equal(manager.getRuntime('g1')?.executionManager.isKillSwitchActive(), true);
  assert.equal(manager.getRuntime('g2')?.state.status, 'RUNNING');
  assert.equal(manager.getRuntime('g2')?.executionManager.isKillSwitchActive(), false);
});

test('intentCreated updates only the correct group', () => {
  const manager = new CopyGroupManager();
  const first = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const second = manager.registerGroup(createGroup('g2'), createFollowers('g2'));

  first.tradeIntentManager.createIntent(createIntentInput('g1'));

  assert.equal(first.statistics.intentsCreated, 1);
  assert.equal(second.statistics.intentsCreated, 0);
});

test('intent status changes update correct counters', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const intent = runtime.tradeIntentManager.createIntent(createIntentInput('g1'));

  runtime.tradeIntentManager.markValidated(intent.intentId);
  runtime.tradeIntentManager.markReadyToSend(intent.intentId);
  runtime.tradeIntentManager.markSent(intent.intentId);
  runtime.tradeIntentManager.markAcknowledged(intent.intentId);
  runtime.tradeIntentManager.markFilled(intent.intentId);

  assert.equal(runtime.statistics.intentsSent, 1);
  assert.equal(runtime.statistics.intentsAcknowledged, 1);
  assert.equal(runtime.statistics.intentsFilled, 1);
});

test('repeated observation of the same status is not double-counted', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const intent = runtime.tradeIntentManager.createIntent(createIntentInput('g1'));

  runtime.tradeIntentManager.markValidated(intent.intentId);
  runtime.tradeIntentManager.markReadyToSend(intent.intentId);
  runtime.tradeIntentManager.markSent(intent.intentId);
  runtime.tradeIntentManager.emit('intentUpdated', {
    ...runtime.tradeIntentManager.getIntent(intent.intentId)!,
    status: 'SENT',
  });

  assert.equal(runtime.statistics.intentsSent, 1);
});

test('tradeCopied updates only the correct group statistics', () => {
  const manager = new CopyGroupManager();
  const first = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const second = manager.registerGroup(createGroup('g2'), createFollowers('g2'));

  first.engine.emit('tradeCopied', {
    followerCount: 2,
    successCount: 1,
    failureCount: 1,
  });

  assert.equal(first.statistics.tradesObserved, 1);
  assert.equal(first.statistics.followerOrdersSubmitted, 2);
  assert.equal(first.statistics.followerOrdersSucceeded, 1);
  assert.equal(first.statistics.followerOrdersFailed, 1);
  assert.equal(second.statistics.tradesObserved, 0);
});

test('stop disconnects the engine and resets live flags', async () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  let disconnectCalls = 0;
  const originalDisconnect = runtime.engine.disconnect.bind(runtime.engine);
  runtime.state.masterConnected = true;
  runtime.state.connectedFollowerCount = 2;

  runtime.engine.disconnect = async () => {
    disconnectCalls += 1;
    await originalDisconnect();
  };

  await manager.start('g1');
  await manager.stop('g1');

  assert.equal(disconnectCalls, 1);
  assert.equal(runtime.state.status, 'STOPPED');
  assert.equal(runtime.state.masterConnected, false);
  assert.equal(runtime.state.connectedFollowerCount, 0);
});

test('unregister removes runtime, subscriptions, and intent indexes', async () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const intent = runtime.tradeIntentManager.createIntent(createIntentInput('g1'));

  await manager.unregisterGroup('g1');

  assert.equal(manager.getGroup('g1'), undefined);
  assert.equal(manager.getRuntime('g1'), undefined);
  assert.equal((manager as any).intentIdToGroupId.has(intent.intentId), false);

  runtime.tradeIntentManager.createIntent(createIntentInput('g1-late'));
  assert.equal((manager as any).intentIdToGroupId.size, 0);
});

test('missing group control actions throw', async () => {
  const manager = new CopyGroupManager();

  await assert.rejects(() => manager.start('missing-group'), {
    message: 'Copy group not found: missing-group',
  });
  await assert.rejects(() => manager.stop('missing-group'), {
    message: 'Copy group not found: missing-group',
  });
  await assert.rejects(() => manager.emergencyStop('missing-group'), {
    message: 'Copy group not found: missing-group',
  });
  assert.throws(() => manager.pause('missing-group'), {
    message: 'Copy group not found: missing-group',
  });
  assert.throws(() => manager.resume('missing-group'), {
    message: 'Copy group not found: missing-group',
  });
});

test('read methods return the correct groups and active runtimes', async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  manager.registerGroup(createGroup('g2'), createFollowers('g2'));
  await manager.start('g1');

  assert.equal(manager.getAllGroups().length, 2);
  assert.equal(manager.getGroup('g1')?.group.groupId, 'g1');
  assert.equal(manager.getRuntime('g2')?.group.groupId, 'g2');
  assert.deepEqual(manager.getRunningGroups().map((runtime) => runtime.group.groupId), ['g1']);
});

test('singleton copyGroupManager instance exists', () => {
  assert.ok(copyGroupManager instanceof CopyGroupManager);
});

test('lifecycle actions record observability activity and publish copy-group events', async () => {
  propCopiaEventBus.removeAllListeners();
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));

  const events = {
    started: 0,
    paused: 0,
    resumed: 0,
    emergencyStopped: 0,
  };

  propCopiaEventBus.subscribe('copy_group.started', () => {
    events.started += 1;
  });
  propCopiaEventBus.subscribe('copy_group.paused', () => {
    events.paused += 1;
  });
  propCopiaEventBus.subscribe('copy_group.resumed', () => {
    events.resumed += 1;
  });
  propCopiaEventBus.subscribe('copy_group.emergency_stopped', () => {
    events.emergencyStopped += 1;
  });

  await manager.start('g1');
  manager.pause('g1');
  manager.resume('g1');
  await manager.emergencyStop('g1', 'panic');

  assert.deepEqual(events, {
    started: 1,
    paused: 1,
    resumed: 1,
    emergencyStopped: 1,
  });
  assert.equal(runtime.observability.totalEvents >= 5, true);
  assert.equal(runtime.observability.errorEventCount >= 1, true);
  assert.equal(runtime.observability.recentActivity[0].message.includes('Emergency stop'), true);
  assert.equal(runtime.observability.recentActivity.some((entry) => entry.category === 'LIFECYCLE'), true);

  propCopiaEventBus.removeAllListeners();
});

test('execution, rule, and master-fill events update observability and counters', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const intent = runtime.tradeIntentManager.createIntent(createIntentInput('g1'));

  runtime.engine.emit('masterFillReceived', {
    timestamp: '2026-08-04T13:00:00.000Z',
    fillId: 'fill-observed',
    symbol: 'ES',
  });
  runtime.engine.emit('ruleSkipped', {
    followerAccountId: 'follower-g1-1',
    masterFillId: 'fill-observed',
    symbol: 'ES',
    reasonCode: 'SYMBOL_BLOCKED',
  });
  runtime.engine.emit('ruleSkipped', {
    followerAccountId: 'follower-g1-2',
    masterFillId: 'fill-observed',
    symbol: 'ES',
    reasonCode: 'FOLLOWER_DISABLED',
  });
  runtime.engine.emit('ruleSkipped', {
    followerAccountId: 'follower-g1-2',
    masterFillId: 'fill-observed',
    symbol: 'ES',
    reasonCode: 'ZERO_QUANTITY',
  });
  runtime.engine.emit('ruleRejected', {
    followerAccountId: 'follower-g1-2',
    masterFillId: 'fill-observed',
    symbol: 'ES',
    reasonCode: 'MAX_TRADES_PER_DAY_REACHED',
  });
  runtime.executionManager.emit('executionQueued', {
    intentId: intent.intentId,
    intent,
    request: {
      accountId: 'follower-g1-1',
      symbol: 'ES',
      side: 'BUY',
      quantity: 1,
    },
    attempts: 1,
    brokerKey: 'follower-ws:follower-g1-1',
  });
  runtime.executionManager.emit('executionFailed', {
    intentId: intent.intentId,
    intent,
    request: {
      accountId: 'follower-g1-1',
      symbol: 'ES',
      side: 'BUY',
      quantity: 1,
    },
    attempts: 1,
    brokerKey: 'follower-ws:follower-g1-1',
    failedAt: '2026-08-04T13:01:00.000Z',
    lastErrorMessage: 'Broker adapter is not connected',
  });

  assert.equal(runtime.state.lastMasterFillAt, '2026-08-04T13:00:00.000Z');
  assert.equal(runtime.statistics.skippedBlockedSymbolCount, 1);
  assert.equal(runtime.statistics.skippedDisabledFollowerCount, 1);
  assert.equal(runtime.statistics.skippedZeroQuantityCount, 1);
  assert.equal(runtime.observability.errorEventCount >= 2, true);
  assert.equal(runtime.observability.lastErrorMessage, 'Broker adapter is not connected');
  assert.equal(
    manager.getRecentActivity('g1').some((entry) => entry.message.includes('Max trades per day reached')),
    true,
  );
  assert.equal(manager.getRecentActivity('g1').length > 0, true);
});

test('recordExternalActivity appends health alerts and updates error state', () => {
  const manager = new CopyGroupManager();
  const runtime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));

  manager.recordExternalActivity('g1', {
    severity: 'WARN',
    category: 'HEALTH',
    message: 'Follower is approaching a risk threshold.',
    followerAccountId: 'follower-g1-1',
  });
  manager.recordExternalActivity('g1', {
    severity: 'ERROR',
    category: 'HEALTH',
    message: 'Follower breached configured risk limits.',
    followerAccountId: 'follower-g1-2',
  });

  const activity = manager.getRecentActivity('g1');
  assert.equal(activity[0]?.category, 'HEALTH');
  assert.equal(activity[0]?.severity, 'ERROR');
  assert.equal(activity[1]?.severity, 'WARN');
  assert.equal(runtime.state.lastErrorMessage, 'Follower breached configured risk limits.');
  assert.equal(runtime.observability.errorEventCount >= 1, true);
});

test('activity journal survives runtime recreation for the same group id', async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  await manager.start('g1');
  manager.recordExternalActivity('g1', {
    severity: 'WARN',
    category: 'HEALTH',
    message: 'Follower reconnecting after startup.',
  });

  const beforeUnregister = manager.getRecentActivity('g1');
  await manager.unregisterGroup('g1');

  const restoredRuntime = manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  const restoredActivity = manager.getRecentActivity('g1');

  assert.equal(beforeUnregister.length >= 2, true);
  assert.equal(restoredActivity.length >= beforeUnregister.length, true);
  assert.equal(restoredActivity.some((entry) => entry.message.includes('Follower reconnecting')), true);
  assert.equal(restoredRuntime.observability.totalEvents >= beforeUnregister.length, true);
  assert.equal(restoredRuntime.observability.warningEventCount >= 1, true);
});

test('getPersistedState exports only safe lifecycle state', async () => {
  const manager = new CopyGroupManager();
  manager.registerGroup(createGroup('g1'), createFollowers('g1'));
  await manager.start('g1');

  const persistedState = manager.getPersistedState('g1');

  assert.equal(persistedState.status, 'STOPPED');
  assert.equal(persistedState.masterConnected, false);
  assert.equal(persistedState.connectedFollowerCount, 0);
  assert.equal(persistedState.totalFollowerCount, 2);
  assert.equal(typeof persistedState.stoppedAt, 'string');
});

test('routes expose copy group endpoints through CopyGroupManager only', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /app\.get\("\/api\/copy-groups"/);
  assert.match(routesSource, /app\.get\("\/api\/copy-groups\/snapshot"/);
  assert.match(routesSource, /app\.get\("\/api\/copy-groups\/:groupId"/);
  assert.match(routesSource, /app\.get\("\/api\/copy-groups\/:groupId\/activity"/);
  assert.match(routesSource, /app\.post\("\/api\/copy-groups\/register"/);
  assert.match(routesSource, /app\.post\("\/api\/copy-groups\/start"/);
  assert.match(routesSource, /app\.post\("\/api\/copy-groups\/stop"/);
  assert.match(routesSource, /app\.post\("\/api\/copy-groups\/pause"/);
  assert.match(routesSource, /app\.post\("\/api\/copy-groups\/resume"/);
  assert.match(routesSource, /app\.post\("\/api\/copy-groups\/emergency-stop"/);
  assert.match(routesSource, /app\.delete\("\/api\/copy-groups\/:groupId"/);
  assert.match(routesSource, /getOwnedRegisteredGroup/);
  assert.match(routesSource, /copyGroupManager\.syncGroup/);
  assert.match(routesSource, /copyGroupManager\.start/);
  assert.match(routesSource, /copyGroupManager\.stop/);
  assert.match(routesSource, /copyGroupManager\.pause/);
  assert.match(routesSource, /copyGroupManager\.resume/);
  assert.match(routesSource, /copyGroupManager\.emergencyStop/);
  assert.match(routesSource, /copyGroupManager\.unregisterGroup/);
  assert.match(routesSource, /copyGroupRegistrationStore/);
  assert.match(routesSource, /ensurePersistedCopyGroupsLoaded/);
  assert.match(routesSource, /persistRegisteredGroupState/);
  assert.match(routesSource, /persistedState:\s*runtimeState/);
  assert.match(routesSource, /evaluateFollowerRiskAlerts/);
  assert.match(routesSource, /copyGroupManager\.recordExternalActivity/);
  assert.match(routesSource, /req\.session\?\.userId/);
  assert.match(routesSource, /registeredGroup\.group\.userId === req\.session\.userId/);
});
