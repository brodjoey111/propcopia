import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('routes expose the trade copy status endpoint', () => {
  const routesSource = readFileSync('server/routes.ts', 'utf8');

  assert.match(routesSource, /app\.get\(\"\/api\/trade-copy\/status\/:userId\"/);
  assert.match(routesSource, /engine\.getStatus\(\)/);
});
