import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCopyGroupObservability,
  CopyGroupActivityJournal,
} from './copy-group-activity-journal';
import type { CopyGroupActivity } from './copy-group-types';

function createActivity(
  eventId: string,
  severity: CopyGroupActivity['severity'],
  message: string,
): CopyGroupActivity {
  return {
    eventId,
    groupId: 'group-1',
    timestamp: `2026-08-11T12:00:0${eventId.slice(-1)}.000Z`,
    severity,
    category: severity === 'ERROR' ? 'HEALTH' : 'LIFECYCLE',
    message,
  };
}

test('journal keeps recent activity bounded while preserving cumulative observability counts', () => {
  const journal = new CopyGroupActivityJournal(2);

  journal.append('group-1', createActivity('event-1', 'INFO', 'Registered group.'));
  journal.append('group-1', createActivity('event-2', 'WARN', 'Follower reconnecting.'));
  const observability = journal.append('group-1', createActivity('event-3', 'ERROR', 'Follower disconnected.'));

  assert.deepEqual(
    journal.getRecentActivity('group-1').map((entry) => entry.eventId),
    ['event-3', 'event-2'],
  );
  assert.equal(observability.totalEvents, 3);
  assert.equal(observability.infoEventCount, 1);
  assert.equal(observability.warningEventCount, 1);
  assert.equal(observability.errorEventCount, 1);
  assert.equal(observability.restartRecoveryCount, 0);
  assert.deepEqual(observability.categoryCounts, {
    lifecycle: 2,
    trade: 0,
    rule: 0,
    intent: 0,
    execution: 0,
    health: 1,
  });
  assert.deepEqual(observability.lifecycleCounts, {
    started: 0,
    paused: 0,
    resumed: 0,
    stopped: 0,
    emergencyStopped: 0,
  });
  assert.equal(observability.lastErrorMessage, 'Follower disconnected.');
});

test("journal tracks lifecycle markers and latest lifecycle summary separately from errors", () => {
  const journal = new CopyGroupActivityJournal(10);

  journal.append("group-1", {
    eventId: "event-1",
    groupId: "group-1",
    timestamp: "2026-08-11T12:00:00.000Z",
    severity: "INFO",
    category: "LIFECYCLE",
    message: "Copy group Alpha started.",
  });
  journal.append("group-1", {
    eventId: "event-2",
    groupId: "group-1",
    timestamp: "2026-08-11T12:05:00.000Z",
    severity: "WARN",
    category: "LIFECYCLE",
    message: "Copy group Alpha paused.",
  });
  const observability = journal.append("group-1", {
    eventId: "event-3",
    groupId: "group-1",
    timestamp: "2026-08-11T12:06:00.000Z",
    severity: "ERROR",
    category: "LIFECYCLE",
    message: "Emergency stop activated: manual review required",
  });

  assert.deepEqual(observability.lifecycleCounts, {
    started: 1,
    paused: 1,
    resumed: 0,
    stopped: 0,
    emergencyStopped: 1,
  });
  assert.equal(observability.lastLifecycleAt, "2026-08-11T12:06:00.000Z");
  assert.equal(
    observability.lastLifecycleMessage,
    "Emergency stop activated: manual review required",
  );
  assert.equal(
    observability.lastErrorMessage,
    "Emergency stop activated: manual review required",
  );
  assert.equal(observability.restartRecoveryCount, 0);
});

test("journal captures restart recovery markers separately from general lifecycle activity", () => {
  const journal = new CopyGroupActivityJournal(10);

  const observability = journal.append("group-1", {
    eventId: "event-1",
    groupId: "group-1",
    timestamp: "2026-08-11T12:08:00.000Z",
    severity: "WARN",
    category: "LIFECYCLE",
    message: "Recovered copy group Alpha into STOPPED state after reload.",
  });

  assert.equal(observability.restartRecoveryCount, 1);
  assert.equal(
    observability.lastRestartRecoveryMessage,
    "Recovered copy group Alpha into STOPPED state after reload.",
  );
  assert.equal(
    observability.lastRestartRecoveryAt,
    "2026-08-11T12:08:00.000Z",
  );
});

test("buildCopyGroupObservability merges persisted activity with runtime seed counters", () => {
  const observability = buildCopyGroupObservability(
    "group-1",
    [
      {
        eventId: "event-3",
        groupId: "group-1",
        timestamp: "2026-08-11T12:07:00.000Z",
        severity: "ERROR",
        category: "HEALTH",
        message: "Follower disconnected after restart.",
      },
      {
        eventId: "event-2",
        groupId: "group-1",
        timestamp: "2026-08-11T12:06:00.000Z",
        severity: "WARN",
        category: "LIFECYCLE",
        message: "Copy group Alpha paused.",
      },
    ],
    {
      groupId: "group-1",
      recentActivity: [],
      totalEvents: 5,
      infoEventCount: 2,
      warningEventCount: 1,
      errorEventCount: 1,
      restartRecoveryCount: 1,
      categoryCounts: {
        lifecycle: 3,
        trade: 1,
        rule: 0,
        intent: 0,
        execution: 0,
        health: 1,
      },
      lifecycleCounts: {
        started: 1,
        paused: 1,
        resumed: 1,
        stopped: 0,
        emergencyStopped: 0,
      },
      lastEventAt: "2026-08-11T12:05:00.000Z",
      lastLifecycleAt: "2026-08-11T12:05:00.000Z",
      lastLifecycleMessage: "Copy group Alpha resumed.",
      lastErrorAt: "2026-08-11T12:04:00.000Z",
      lastErrorMessage: "Recovered copy group Alpha into STOPPED state after reload.",
      lastRestartRecoveryAt: "2026-08-11T12:04:00.000Z",
      lastRestartRecoveryMessage: "Recovered copy group Alpha into STOPPED state after reload.",
    },
  );

  assert.equal(observability.totalEvents, 5);
  assert.equal(observability.warningEventCount, 1);
  assert.equal(observability.errorEventCount, 1);
  assert.deepEqual(observability.recentActivity.map((entry) => entry.eventId), ["event-3", "event-2"]);
  assert.equal(observability.categoryCounts.trade, 1);
  assert.equal(observability.lifecycleCounts.started, 1);
  assert.equal(observability.lifecycleCounts.paused, 1);
  assert.equal(observability.restartRecoveryCount, 1);
  assert.equal(observability.lastLifecycleMessage, "Copy group Alpha paused.");
  assert.equal(observability.lastErrorMessage, "Follower disconnected after restart.");
  assert.equal(
    observability.lastRestartRecoveryMessage,
    "Recovered copy group Alpha into STOPPED state after reload.",
  );
});
