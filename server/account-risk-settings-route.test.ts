import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

test('risk settings route validates input before writing account settings', () => {
  assert.match(routesSource, /parseAccountRiskSettingsPatch\(req\.body\)/);
  assert.match(routesSource, /return res\.status\(400\)\.json\(\{/);
  assert.match(routesSource, /errors: parsedSettings\.errors/);
});

test('risk settings route keeps account lookup and update scoped to the signed-in owner', () => {
  assert.match(
    routesSource,
    /where\(and\(eq\(accounts\.id, id\), eq\(accounts\.userId, req\.session\.userId\)\)\)/,
  );
  assert.match(routesSource, /operationalLogger\.error\("risk\.account_settings_save_failed"/);
  assert.match(routesSource, /message: "Failed to save risk settings"/);
});

test('risk settings PATCH preserves omitted fields and supports explicit null limits', () => {
  assert.match(routesSource, /b\.maxContracts !== undefined/);
  assert.match(routesSource, /b\.maxDailyLoss === null \? null : String\(b\.maxDailyLoss\)/);
  assert.doesNotMatch(routesSource, /maxContracts:\s+b\.maxContracts\s+\?\?\s+null/);
});

test('risk settings refresh an active follower session without reconnecting the broker', () => {
  assert.match(routesSource, /updateFollowerRiskSettings\(updated\)/);
  assert.match(routesSource, /activeSessionUpdated/);
});

test('switching an account to Global mode applies the server-owned global policy', () => {
  assert.match(routesSource, /effectiveRiskMode === "global"/);
  assert.match(routesSource, /accountSettingsUpdate = \{\s*riskMode: "global"/);
  assert.match(routesSource, /readStoredGlobalRiskSettings\(user\?\.globalRiskSettingsJson,/);
});
