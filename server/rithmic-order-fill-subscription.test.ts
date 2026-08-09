import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('Rithmic order fill subscription logs when fills arrive for a different broker account', () => {
  const source = readFileSync(new URL('./rithmic-api.ts', import.meta.url), 'utf8');

  assert.match(source, /Ignoring fill for account=\$\{fillEvent\.accountId\}; subscribed account=\$\{accountId\}/);
});
