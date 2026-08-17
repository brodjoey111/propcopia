import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

test('connect route refreshes saved Rithmic identity after successful authentication before marking the account connected', () => {
  assert.match(routesSource, /app\.post\(\"\/api\/accounts\/:id\/connect\"/);
  assert.match(routesSource, /const reconnect = await reconnectSavedRithmicAccountForUser\(/);
  assert.match(
    routesSource,
    /refreshRithmicAccountIdentity\(savedAccount, userId, rithmicAPI, \{\s*allowDiscoveryFailure: true,\s*\}\)/,
  );
  assert.match(routesSource, /existing = reconnect\.account;/);
  assert.match(
    routesSource,
    /const updated = await updateAccountConnectionState\(\{\s*accountId: id,\s*userId: req\.session\.userId,\s*isConnected: true,/,
  );
});

test('disconnect route tears down any cached Rithmic session before marking the account disconnected', () => {
  assert.match(routesSource, /app\.post\(\"\/api\/accounts\/:id\/disconnect\"/);
  assert.match(routesSource, /const userRithmicInstances = rithmicInstances\.forUser\(req\.session\.userId\);/);
  assert.match(routesSource, /const instance = userRithmicInstances\.get\(existing\.rithmicUsername\);/);
  assert.match(routesSource, /await instance\.disconnect\(\);/);
  assert.match(routesSource, /userRithmicInstances\.delete\(existing\.rithmicUsername\);/);
  assert.match(routesSource, /rithmicReconnectValidationStore\.clear\(existing\.id\);/);
  assert.match(routesSource, /accountConnectionRecoveryStore\.disconnected\(req\.session\.userId, id\);/);
  assert.match(
    routesSource,
    /const updated = await updateAccountConnectionState\(\{\s*accountId: id,\s*userId: req\.session\.userId,\s*isConnected: false,/,
  );
});

test('trade copy status route returns the live engine status payload directly', () => {
  assert.match(routesSource, /app\.get\(\"\/api\/trade-copy\/status\/:userId\"/);
  assert.match(routesSource, /const engine = tradeCopyEngines\.get\(userId\);/);
  assert.match(routesSource, /message: \"No active trade copying session\"/);
  assert.match(routesSource, /data: engine\.getStatus\(\),/);
});
