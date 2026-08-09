import test from 'node:test';
import assert from 'node:assert/strict';
import type { Account } from '@shared/schema';
import {
  resolveTradeCopyFollowerConnection,
  resolveTradeCopyFollowerConnections,
  resolveTradeCopyMasterConnection,
} from './trade-copy-account-resolver';

function createAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'account-1',
    userId: 'user-1',
    name: 'Primary Account',
    platform: 'Tradovate',
    accountType: 'master',
    tradovateUsername: 'tradovate-user',
    tradovateAccountId: 'tv-1',
    tradovateEnvironment: 'demo',
    tradeifyUsername: null,
    tradeifyAccountId: null,
    tradeifyApiKey: null,
    rithmicUsername: null,
    rithmicAccountId: null,
    rithmicPassword: null,
    rithmicEnvironment: null,
    rithmicSystemName: null,
    rithmicExchange: null,
    apiKey: null,
    apiSecret: null,
    isConnected: true,
    balance: null,
    openPositions: 0,
    pnl: '0',
    riskMode: 'global',
    positionScaling: 100,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: null,
    reverseCopying: false,
    maxContracts: null,
    maxOpenPositions: null,
    allowedDirections: 'both',
    maxDailyLoss: null,
    maxDailyLossPct: null,
    maxWeeklyLoss: null,
    maxWeeklyLossPct: null,
    maxDrawdownPct: null,
    maxConsecutiveLosses: null,
    blockedTickers: [],
    allowedTickers: [],
    maxTradesPerDay: null,
    minAccountBalance: null,
    tradingStartTime: null,
    tradingEndTime: null,
    tradingDays: [],
    cooldownAfterLoss: null,
    onBreachAction: 'pause',
    lastSync: null,
    ...overrides,
  };
}

function createTradovateSession(accessToken = 'token-1') {
  return {
    isTokenValid() {
      return true;
    },
    getAccessToken() {
      return accessToken;
    },
  };
}

test('resolveTradeCopyMasterConnection returns Tradovate access token from saved account', () => {
  const account = createAccount();
  const tradovateInstances = new Map([[account.tradovateUsername!, createTradovateSession('master-token')]]);

  const resolved = resolveTradeCopyMasterConnection({
    account,
    tradovateInstances,
  });

  assert.deepEqual(resolved, {
    platform: 'Tradovate',
    masterUsername: 'tradovate-user',
    accessToken: 'master-token',
  });
});

test('resolveTradeCopyMasterConnection returns Rithmic credentials for saved Rithmic masters', () => {
  const account = createAccount({
    platform: 'Rithmic',
    tradovateUsername: null,
    tradovateAccountId: null,
    tradovateEnvironment: null,
    rithmicUsername: 'r-user',
    rithmicPassword: 'r-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: null,
  });

  const resolved = resolveTradeCopyMasterConnection({
    account,
    tradovateInstances: new Map(),
  });

  assert.deepEqual(resolved, {
    platform: 'Rithmic',
    rithmicCredentials: {
      username: 'r-user',
      password: 'r-pass',
      environment: 'test',
      systemName: 'Rithmic Test',
    },
  });
});

test('resolveTradeCopyFollowerConnection returns legacy websocket config for Tradovate followers', () => {
  const account = createAccount({
    accountType: 'follower',
    blockedTickers: ['NQ'],
  });
  const tradovateInstances = new Map([[account.tradovateUsername!, createTradovateSession('follower-token')]]);

  const resolved = resolveTradeCopyFollowerConnection({
    account,
    overrides: {
      positionScaling: 75,
      maxContracts: 2,
      blockedTickers: ['ES'],
    },
    tradovateInstances,
  });

  assert.equal(resolved.brokerConfig.kind, 'legacy_websocket');
  assert.equal(resolved.brokerConfig.accessToken, 'follower-token');
  assert.equal(resolved.account.positionScaling, 75);
  assert.equal(resolved.account.maxContracts, 2);
  assert.deepEqual(resolved.account.blockedTickers, ['ES']);
});

test('resolveTradeCopyFollowerConnection returns Rithmic config for saved Rithmic followers', () => {
  const account = createAccount({
    platform: 'Rithmic',
    accountType: 'follower',
    tradovateUsername: null,
    tradovateAccountId: null,
    tradovateEnvironment: null,
    rithmicUsername: 'r-user',
    rithmicPassword: 'r-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: null,
  });

  const resolved = resolveTradeCopyFollowerConnection({
    account,
    overrides: {
      exchange: 'CME',
    },
    tradovateInstances: new Map(),
  });

  assert.deepEqual(resolved.brokerConfig, {
    kind: 'rithmic',
    environment: 'test',
    username: 'r-user',
    password: 'r-pass',
    exchange: 'CME',
    systemName: 'Rithmic Test',
  });
});

test('resolveTradeCopyFollowerConnection requires exchange for Rithmic followers', () => {
  const account = createAccount({
    platform: 'Rithmic',
    accountType: 'follower',
    tradovateUsername: null,
    tradovateAccountId: null,
    tradovateEnvironment: null,
    rithmicUsername: 'r-user',
    rithmicPassword: 'r-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: null,
  });

  assert.throws(
    () =>
      resolveTradeCopyFollowerConnection({
        account,
        tradovateInstances: new Map(),
      }),
    /require an exchange/,
  );
});

test('resolveTradeCopyFollowerConnections preserves requested order and applies default exchange', () => {
  const tradovateFollower = createAccount({
    id: 'tradovate-follower',
    accountType: 'follower',
  });
  const rithmicFollower = createAccount({
    id: 'rithmic-follower',
    platform: 'Rithmic',
    accountType: 'follower',
    tradovateUsername: null,
    tradovateAccountId: null,
    tradovateEnvironment: null,
    rithmicUsername: 'r-user',
    rithmicPassword: 'r-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: null,
  });

  const resolved = resolveTradeCopyFollowerConnections({
    accounts: [rithmicFollower, tradovateFollower],
    followerAccountIds: ['tradovate-follower', 'rithmic-follower'],
    defaultOverrides: {
      exchange: 'CME',
    },
    tradovateInstances: new Map([
      [tradovateFollower.tradovateUsername!, createTradovateSession('follower-token')],
    ]),
  });

  assert.equal(resolved[0]?.account.id, 'tradovate-follower');
  assert.equal(resolved[0]?.brokerConfig.kind, 'legacy_websocket');
  assert.equal(resolved[1]?.account.id, 'rithmic-follower');
  assert.deepEqual(resolved[1]?.brokerConfig, {
    kind: 'rithmic',
    environment: 'test',
    username: 'r-user',
    password: 'r-pass',
    exchange: 'CME',
    systemName: 'Rithmic Test',
  });
});

test('resolveTradeCopyFollowerConnections merges per-account overrides', () => {
  const account = createAccount({
    id: 'rithmic-follower',
    platform: 'Rithmic',
    accountType: 'follower',
    tradovateUsername: null,
    tradovateAccountId: null,
    tradovateEnvironment: null,
    rithmicUsername: 'r-user',
    rithmicPassword: 'r-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: null,
    positionScaling: 100,
    blockedTickers: ['NQ'],
  });

  const [resolved] = resolveTradeCopyFollowerConnections({
    accounts: [account],
    followerAccountIds: ['rithmic-follower'],
    defaultOverrides: {
      exchange: 'CME',
      positionScaling: 80,
      blockedTickers: ['ES'],
    },
    overridesByAccountId: {
      'rithmic-follower': {
        exchange: 'COMEX',
        positionScaling: 55,
      },
    },
    tradovateInstances: new Map(),
  });

  assert.equal(resolved.account.positionScaling, 55);
  assert.deepEqual(resolved.account.blockedTickers, ['ES']);
  assert.deepEqual(resolved.brokerConfig, {
    kind: 'rithmic',
    environment: 'test',
    username: 'r-user',
    password: 'r-pass',
    exchange: 'COMEX',
    systemName: 'Rithmic Test',
  });
});

test('resolveTradeCopyFollowerConnections throws when a requested follower is missing', () => {
  assert.throws(
    () =>
      resolveTradeCopyFollowerConnections({
        accounts: [],
        followerAccountIds: ['missing-follower'],
        tradovateInstances: new Map(),
      }),
    /Follower account not found: missing-follower/,
  );
});

test('resolveTradeCopyFollowerConnection falls back to the saved Rithmic exchange', () => {
  const account = createAccount({
    platform: 'Rithmic',
    accountType: 'follower',
    tradovateUsername: null,
    tradovateAccountId: null,
    tradovateEnvironment: null,
    rithmicUsername: 'r-user',
    rithmicPassword: 'r-pass',
    rithmicEnvironment: 'test',
    rithmicSystemName: 'Rithmic Test',
    rithmicExchange: 'CBOT',
  });

  const resolved = resolveTradeCopyFollowerConnection({
    account,
    tradovateInstances: new Map(),
  });

  assert.deepEqual(resolved.brokerConfig, {
    kind: 'rithmic',
    environment: 'test',
    username: 'r-user',
    password: 'r-pass',
    exchange: 'CBOT',
    systemName: 'Rithmic Test',
  });
});
