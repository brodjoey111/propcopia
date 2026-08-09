import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('trade-copy start route logs the exact master and follower broker wiring', () => {
  const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

  assert.match(routesSource, /\[TradeCopy\] Session wiring ready/);
  assert.match(routesSource, /masterBrokerAccountId:/);
  assert.match(routesSource, /followerBrokerAccountIds:/);
});
