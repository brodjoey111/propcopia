import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('trade-copy start route logs the exact master and follower broker wiring', () => {
  const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

  assert.match(routesSource, /\[TradeCopy\] Session wiring ready/);
  assert.match(routesSource, /masterBrokerAccountId:/);
  assert.match(routesSource, /followerBrokerAccountIds:/);
});

test('trade-copy start route refuses to silently reuse an existing engine', () => {
  const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

  assert.match(routesSource, /const existingEngine = tradeCopyEngines\.get\(userId\);/);
  assert.match(routesSource, /return res\.status\(409\)\.json\(\{/);
  assert.match(
    routesSource,
    /A trade-copy session is already running\. Stop the current session before starting a new one\./,
  );
});

test('trade-copy routes preflight breached follower accounts before wiring brokers', () => {
  const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

  assert.match(routesSource, /function getTradeCopyRiskPreflightError/);
  assert.match(routesSource, /Follower \$\{account\.name\} cannot join trade copying because it has/);
  assert.match(routesSource, /const breachedFollowerErrors = refreshedFollowerAccounts/);
  assert.match(routesSource, /return res\.status\(409\)\.json\(\{\s*success: false,\s*message: breachedFollowerErrors\[0\]/);
  assert.match(routesSource, /const riskPreflightError = getTradeCopyRiskPreflightError\(savedAccount\);/);
});
