import assert from 'node:assert/strict';
import test from 'node:test';

import { CopyGroupActivityJournal } from './copy-group-activity-journal';
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
  assert.equal(observability.lastErrorMessage, 'Follower disconnected.');
});
