import assert from 'node:assert/strict';
import test from 'node:test';

import { propCopiaEventBus } from './event-bus';
import { CopyGroupAlertStore } from './copy-group-alert-store';

function createGroup() {
  return {
    groupId: 'group-1',
    userId: 'user-1',
    name: 'Primary Group',
    masterAccountId: 'master-1',
    followerAccountIds: ['acct-1'],
    groupSettings: { enabled: true },
    riskSettings: { onRiskBreach: 'PAUSE' as const },
    executionSettings: {
      mode: 'SIMULATED' as const,
      maxRetries: 1,
      retryDelayMs: 100,
      orderTimeoutMs: 1000,
      flattenOnEmergencyStop: false,
    },
    createdAt: '2026-08-11T11:00:00.000Z',
    updatedAt: '2026-08-11T11:00:00.000Z',
  };
}

test('CopyGroupAlertStore records event-driven alert history and active stories', () => {
  propCopiaEventBus.removeAllListeners();
  const store = new CopyGroupAlertStore();
  store.start();

  const group = createGroup();

  propCopiaEventBus.publish('copy_group.activity_recorded', {
    group,
    runtime: {
      groupId: group.groupId,
      status: 'PAUSED',
      pausedAt: '2026-08-11T11:02:00.000Z',
      isKillSwitchActive: false,
      masterConnected: false,
      connectedFollowerCount: 0,
      totalFollowerCount: 1,
    },
    activity: {
      eventId: 'event-1',
      groupId: group.groupId,
      timestamp: '2026-08-11T11:02:00.000Z',
      severity: 'WARN',
      category: 'HEALTH',
      message: 'Follower reconnecting',
      followerAccountId: 'acct-1',
    },
    observability: {
      groupId: group.groupId,
      recentActivity: [
        {
          eventId: 'event-1',
          groupId: group.groupId,
          timestamp: '2026-08-11T11:02:00.000Z',
          severity: 'WARN',
          category: 'HEALTH',
          message: 'Follower reconnecting',
          followerAccountId: 'acct-1',
        },
      ],
      totalEvents: 1,
      infoEventCount: 0,
      warningEventCount: 1,
      errorEventCount: 0,
      categoryCounts: {
        lifecycle: 0,
        trade: 0,
        rule: 0,
        intent: 0,
        execution: 0,
        health: 1,
      },
      lifecycleCounts: {
        started: 0,
        paused: 0,
        resumed: 0,
        stopped: 0,
        emergencyStopped: 0,
      },
      lastEventAt: '2026-08-11T11:02:00.000Z',
      lastErrorAt: undefined,
      lastErrorMessage: undefined,
    },
  });

  propCopiaEventBus.publish('copy_group.health_changed', {
    group,
    runtime: {
      groupId: group.groupId,
      status: 'RUNNING',
      startedAt: '2026-08-11T11:04:00.000Z',
      isKillSwitchActive: false,
      masterConnected: true,
      connectedFollowerCount: 1,
      totalFollowerCount: 1,
    },
    previousStatus: 'DEGRADED',
    health: {
      groupId: group.groupId,
      status: 'HEALTHY',
      masterConnection: { ok: true, message: 'Master connected' },
      followerConnections: { ok: true, message: 'Connected followers: 1/1' },
      executionPipeline: { ok: true, message: 'Execution pipeline ready' },
      intentPipeline: { ok: true, message: 'Intent pipeline ready' },
      warnings: [],
      errors: [],
      checkedAt: '2026-08-11T11:04:00.000Z',
    },
  });

  const history = store.listRecent({ userId: 'user-1' });
  const activeStories = store.listActiveStories({ userId: 'user-1' });

  assert.equal(history.length, 2);
  assert.equal(history[0]?.severity, 'info');
  assert.equal(history[1]?.severity, 'warn');
  assert.equal(activeStories.length, 0);

  store.stop();
  store.clear();
  propCopiaEventBus.removeAllListeners();
});

test('CopyGroupAlertStore keeps the latest unresolved group alert active', () => {
  propCopiaEventBus.removeAllListeners();
  const store = new CopyGroupAlertStore();
  store.start();
  const group = createGroup();

  propCopiaEventBus.publish('copy_group.health_changed', {
    group,
    runtime: {
      groupId: group.groupId,
      status: 'EMERGENCY_STOPPED',
      emergencyStoppedAt: '2026-08-11T11:05:00.000Z',
      isKillSwitchActive: true,
      emergencyStopReason: 'manual review required',
      masterConnected: false,
      connectedFollowerCount: 0,
      totalFollowerCount: 1,
    },
    previousStatus: 'HEALTHY',
    health: {
      groupId: group.groupId,
      status: 'UNHEALTHY',
      masterConnection: { ok: false, message: 'Group started without master connection in Phase 1' },
      followerConnections: { ok: false, message: 'Connected followers: 0/1' },
      executionPipeline: { ok: false, message: 'Execution pipeline halted by emergency stop' },
      intentPipeline: { ok: false, message: 'Intent pipeline halted by emergency stop' },
      warnings: [],
      errors: ['Emergency stop: manual review required'],
      checkedAt: '2026-08-11T11:05:00.000Z',
    },
  });

  const activeStories = store.listActiveStories({ userId: 'user-1' });

  assert.equal(activeStories.length, 1);
  assert.equal(activeStories[0]?.title, 'Primary Group recovery required');
  assert.equal(activeStories[0]?.severity, 'error');

  store.stop();
  store.clear();
  propCopiaEventBus.removeAllListeners();
});
