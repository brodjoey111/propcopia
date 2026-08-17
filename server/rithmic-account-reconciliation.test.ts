import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findBestMatchingRithmicAccount } from './rithmic-account-reconciliation';

test('findBestMatchingRithmicAccount prefers an exact saved broker account id match', () => {
  const matched = findBestMatchingRithmicAccount({
    savedAccountId: 'APEX-62683',
    savedAccountName: 'Apex Main',
    discoveredAccounts: [
      { id: 'APEX-11111', name: 'Apex Alt' },
      { id: 'APEX-62683', name: 'Apex Main' },
    ],
  });

  assert.deepEqual(matched, { id: 'APEX-62683', name: 'Apex Main' });
});

test('findBestMatchingRithmicAccount falls back to the saved account name when the id is stale', () => {
  const matched = findBestMatchingRithmicAccount({
    savedAccountId: 'brodjoey111-primary',
    savedAccountName: 'APEX-62683 - apex',
    discoveredAccounts: [
      { id: 'APEX-62683', name: 'APEX-62683 — apex' },
      { id: 'APEX-90000', name: 'APEX-90000 — sim' },
    ],
  });

  assert.deepEqual(matched, { id: 'APEX-62683', name: 'APEX-62683 — apex' });
});

test('findBestMatchingRithmicAccount uses the only discovered account for placeholder ids', () => {
  const matched = findBestMatchingRithmicAccount({
    savedAccountId: 'shared-user-primary',
    savedAccountName: 'Old placeholder',
    discoveredAccounts: [{ id: 'APEX-62683', name: 'APEX-62683 — apex' }],
  });

  assert.deepEqual(matched, { id: 'APEX-62683', name: 'APEX-62683 — apex' });
});

test('routes refresh saved Rithmic identities during connect and trade-copy start', () => {
  const routesSource = readFileSync(new URL('./routes.ts', import.meta.url), 'utf8');

  assert.match(routesSource, /async function refreshRithmicAccountIdentity\(/);
  assert.match(
    routesSource,
    /existing = await refreshRithmicAccountIdentity\(existing, req\.session\.userId, rithmicAPI, \{\s*allowDiscoveryFailure: true,\s*\}\);/,
  );
  assert.match(routesSource, /const refreshedMasterAccount = await refreshRithmicAccountIdentity\(masterAccount, userId\)/);
  assert.match(routesSource, /followerAccounts\.map\(\(account\) => refreshRithmicAccountIdentity\(account, userId\)\)/);
  assert.match(routesSource, /engine\.setRithmicMasterBrokerAccountId\(refreshedMasterAccount\.rithmicAccountId\)/);
});
