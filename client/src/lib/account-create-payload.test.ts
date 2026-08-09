import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccountCreatePayload,
  buildFetchedAccountCreatePayload,
} from './account-create-payload.ts';

test('buildAccountCreatePayload preserves existing Tradovate mapping', () => {
  const payload = buildAccountCreatePayload({
    name: 'Tradovate Account',
    platform: 'Tradovate',
    accountType: 'follower',
    tradovateUsername: 'tv-user',
    tradovateAccountId: 'tv-1',
    tradovateEnvironment: 'demo',
  });

  assert.deepEqual(payload, {
    name: 'Tradovate Account',
    platform: 'Tradovate',
    accountType: 'follower',
    isConnected: false,
    positionScaling: 100,
    tradovateUsername: 'tv-user',
    tradovateAccountId: 'tv-1',
    tradovateEnvironment: 'demo',
  });
});

test('buildAccountCreatePayload maps a fetched Rithmic account into the Accounts page payload', () => {
  const payload = buildAccountCreatePayload({
    name: 'Rithmic Account',
    platform: 'Rithmic',
    accountType: 'follower',
    rithmicUsername: 'rit-user',
    rithmicAccountId: 'rit-1',
    rithmicPassword: 'rit-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: 'CME',
  });

  assert.deepEqual(payload, {
    name: 'Rithmic Account',
    platform: 'Rithmic',
    accountType: 'follower',
    isConnected: false,
    positionScaling: 100,
    rithmicUsername: 'rit-user',
    rithmicAccountId: 'rit-1',
    rithmicPassword: 'rit-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: 'CME',
  });
});

test('buildFetchedAccountCreatePayload maps a selected Rithmic account into the final create payload', () => {
  const payload = buildFetchedAccountCreatePayload({
    account: {
      id: 'rit-1',
      name: 'Rithmic Account',
    },
    platform: 'rithmic',
    accountType: 'follower',
    username: 'rit-user',
    password: 'rit-pass',
    environment: 'test',
    systemName: 'Rithmic Test',
    exchange: 'CME',
  });

  assert.deepEqual(payload, {
    name: 'Rithmic Account',
    platform: 'Rithmic',
    accountType: 'follower',
    isConnected: false,
    positionScaling: 100,
    rithmicUsername: 'rit-user',
    rithmicAccountId: 'rit-1',
    rithmicPassword: 'rit-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: 'CME',
  });
});

test('buildFetchedAccountCreatePayload maps a selected Tradovate account into the final create payload', () => {
  const payload = buildFetchedAccountCreatePayload({
    account: {
      id: 42,
      name: 'Tradovate Account',
    },
    platform: 'tradovate',
    accountType: 'master',
    username: 'tv-user',
    environment: 'live',
  });

  assert.deepEqual(payload, {
    name: 'Tradovate Account',
    platform: 'Tradovate',
    accountType: 'master',
    isConnected: false,
    tradovateUsername: 'tv-user',
    tradovateAccountId: '42',
    tradovateEnvironment: 'live',
  });
});
