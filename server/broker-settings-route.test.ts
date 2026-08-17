import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('routes include the Rithmic broker settings update path', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /app\.patch\(\"\/api\/accounts\/:id\/broker-settings\"/);
  assert.match(routesSource, /rithmicExchange/);
  assert.match(routesSource, /Broker settings updates are currently supported only for Rithmic accounts/);
  assert.match(routesSource, /operationalLogger\.error\("account\.broker_settings_update_failed"/);
  assert.match(routesSource, /message: "Failed to update broker settings"/);
});
