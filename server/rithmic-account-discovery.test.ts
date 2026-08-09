import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Rithmic API testConnection uses real account discovery instead of a placeholder account', () => {
  const source = readFileSync('server/rithmic-api.ts', 'utf8');

  assert.match(source, /private buildAccountListRequest\(/);
  assert.match(source, /private waitForLoginInfoDetails\(/);
  assert.match(source, /private waitForAccountListResponse\(/);
  assert.match(source, /private async fetchAccountList\(/);
  assert.match(source, /const accounts = await this\.fetchAccountList\(\);/);
  assert.doesNotMatch(source, /username\}-primary/);
});

test('Rithmic test-connection route still returns the discovered account id to the client', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /app\.post\(\"\/api\/rithmic\/test-connection\"/);
  assert.match(routesSource, /id: String\(account\.id\)/);
  assert.match(routesSource, /accounts: normalizedAccounts/);
});
