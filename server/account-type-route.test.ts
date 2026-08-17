import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('routes expose the account type update path with the disconnect guard', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /app\.patch\(\"\/api\/accounts\/:id\/account-type\"/);
  assert.match(routesSource, /Disconnect this account before changing it between master and follower/);
  assert.match(routesSource, /accountType: requestedAccountType/);
  assert.match(routesSource, /operationalLogger\.error\("account\.type_update_failed"/);
  assert.match(routesSource, /message: "Failed to update account type"/);
});
