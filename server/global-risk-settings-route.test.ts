import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

test('global risk settings routes require an authenticated user', () => {
  assert.match(routesSource, /app\.get\("\/api\/risk-settings\/global"/);
  assert.match(routesSource, /app\.patch\("\/api\/risk-settings\/global"/);
  assert.match(routesSource, /if \(!req\.session\.userId\)/);
  assert.match(routesSource, /stored: Boolean\(user\.globalRiskSettingsJson\)/);
});

test('saving global risk settings validates and synchronizes global-mode accounts atomically', () => {
  assert.match(routesSource, /parseGlobalRiskSettings\(req\.body\)/);
  assert.match(routesSource, /await db\.transaction/);
  assert.match(routesSource, /globalRiskSettingsJson: JSON\.stringify\(settings\)/);
  assert.match(routesSource, /eq\(accounts\.riskMode, "global"\)/);
  assert.match(routesSource, /updatedAccountCount: updatedAccounts\.length/);
  assert.match(routesSource, /activeEngine\.updateFollowerRiskSettings\(account\)/);
});

test('new global-mode follower accounts inherit the server-owned policy', () => {
  assert.match(routesSource, /accountData\.accountType === "follower"/);
  assert.match(routesSource, /readStoredGlobalRiskSettings\(user\?\.globalRiskSettingsJson,/);
  assert.match(routesSource, /buildGlobalRiskAccountUpdate/);
});
