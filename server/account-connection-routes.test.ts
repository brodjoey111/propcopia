import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

test('connect route refreshes saved Rithmic identity after successful authentication before marking the account connected', () => {
  assert.match(routesSource, /app\.post\(\"\/api\/accounts\/:id\/connect\"/);
  assert.match(routesSource, /if \(!req\.session\.userId\) \{/);
  assert.match(routesSource, /const \{ id \} = req\.params;/);
  assert.match(
    routesSource,
    /select\(\)\s*\.from\(accounts\)\s*\.where\(and\(eq\(accounts\.id, id\), eq\(accounts\.userId, req\.session\.userId\)\)\)/,
  );
  assert.match(routesSource, /message: "Account not found"/);
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
  assert.match(routesSource, /operationalLogger\.error\("account\.connect_failed"/);
  assert.match(routesSource, /message: "Failed to connect account"/);
});

test('disconnect route tears down any cached Rithmic session before marking the account disconnected', () => {
  assert.match(routesSource, /app\.post\(\"\/api\/accounts\/:id\/disconnect\"/);
  assert.match(routesSource, /if \(!req\.session\.userId\) \{/);
  assert.match(routesSource, /const \{ id \} = req\.params;/);
  assert.match(
    routesSource,
    /select\(\)\s*\.from\(accounts\)\s*\.where\(and\(eq\(accounts\.id, id\), eq\(accounts\.userId, req\.session\.userId\)\)\)/,
  );
  assert.match(routesSource, /message: "Account not found"/);
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
  assert.match(routesSource, /operationalLogger\.error\("account\.disconnect_failed"/);
  assert.match(routesSource, /message: "Failed to disconnect account"/);
});

test('trade copy status route returns the live engine status payload directly', () => {
  assert.match(routesSource, /app\.get\(\"\/api\/trade-copy\/status\/:userId\"/);
  assert.match(routesSource, /const engine = tradeCopyEngines\.get\(userId\);/);
  assert.match(routesSource, /message: \"No active trade copying session\"/);
  assert.match(routesSource, /data: engine\.getStatus\(\),/);
});

test('accounts list route returns only the authenticated user records', () => {
  const accountsRoute = routesSource.slice(
    routesSource.indexOf('app.get("/api/accounts"'),
    routesSource.indexOf('// ── Risk settings per-account'),
  );

  assert.match(accountsRoute, /if \(!req\.session\.userId\) \{/);
  assert.match(accountsRoute, /select\(\)\s*\.from\(accounts\)\s*\.where\(eq\(accounts\.userId, req\.session\.userId\)\)/);
  assert.match(accountsRoute, /accounts: userAccounts/);
  assert.match(accountsRoute, /operationalLogger\.error\("account\.list_failed"/);
  assert.match(accountsRoute, /message: "Failed to load accounts"/);
  assert.doesNotMatch(accountsRoute, /req\.body\.userId/);
});
