import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateFollowerTradeRule,
  type FollowerTradeRuleInput,
} from './follower-trade-rule-engine';

const BASE_NOW = '2026-08-03T14:00:00.000Z'; // Monday
const BASE_TRADE_TIMESTAMP = '2026-08-03T13:59:00.000Z';

function makeInput(
  overrides: Partial<FollowerTradeRuleInput> & {
    follower?: Partial<FollowerTradeRuleInput['follower']>;
    runtime?: Partial<FollowerTradeRuleInput['runtime']>;
    trade?: Partial<FollowerTradeRuleInput['trade']>;
  } = {}
): FollowerTradeRuleInput {
  return {
    trade: {
      symbol: 'ES',
      side: 'BUY',
      quantity: 4,
      timestamp: BASE_TRADE_TIMESTAMP,
      ...overrides.trade,
    },
    follower: {
      enabled: true,
      allowedDirections: 'both',
      sizingMode: 'MULTIPLIER',
      multiplier: 1,
      reverseCopy: false,
      ...overrides.follower,
    },
    runtime: {
      tradesToday: 0,
      currentBalance: 10000,
      currentOpenPositions: 0,
      lastLossAt: null,
      now: BASE_NOW,
      ...overrides.runtime,
    },
  };
}

test('Enabled follower with valid rules is ALLOWED', () => {
  const result = evaluateFollowerTradeRule(makeInput());
  assert.deepEqual(result, {
    decision: 'ALLOWED',
    reasonCode: null,
    side: 'BUY',
    quantity: 4,
  });
});

test('Disabled follower is SKIPPED with FOLLOWER_DISABLED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({ follower: { enabled: false } })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'FOLLOWER_DISABLED',
  });
});

test('Symbol outside allowed list is SKIPPED with SYMBOL_NOT_ALLOWED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({ follower: { allowedSymbols: ['NQ', 'CL'] } })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'SYMBOL_NOT_ALLOWED',
  });
});

test('Blocked symbol is SKIPPED with SYMBOL_BLOCKED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({ follower: { blockedSymbols: ['ES'] } })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'SYMBOL_BLOCKED',
  });
});

test('Long-only follower skips SELL', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      trade: { side: 'SELL' },
      follower: { allowedDirections: 'long_only' },
    })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'DIRECTION_NOT_ALLOWED',
  });
});

test('Short-only follower skips BUY', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      trade: { side: 'BUY' },
      follower: { allowedDirections: 'short_only' },
    })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'DIRECTION_NOT_ALLOWED',
  });
});

test('Disallowed trading day is SKIPPED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({ follower: { tradingDays: ['tue', 'wed'] } })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'TRADING_DAY_NOT_ALLOWED',
  });
});

test('Before trading start is SKIPPED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { tradingStartTime: '15:00' },
      runtime: { now: '2026-08-03T14:00:00.000Z' },
    })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'BEFORE_TRADING_START',
  });
});

test('After trading end is SKIPPED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { tradingEndTime: '13:00' },
      runtime: { now: '2026-08-03T14:00:00.000Z' },
    })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'AFTER_TRADING_END',
  });
});

test('Active cooldown after loss is SKIPPED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { cooldownAfterLoss: 30 },
      runtime: {
        lastLossAt: '2026-08-03T13:45:00.000Z',
        now: '2026-08-03T14:00:00.000Z',
      },
    })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'COOLDOWN_AFTER_LOSS_ACTIVE',
  });
});

test('Max trades per day is REJECTED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { maxTradesPerDay: 3 },
      runtime: { tradesToday: 3 },
    })
  );
  assert.deepEqual(result, {
    decision: 'REJECTED',
    reasonCode: 'MAX_TRADES_PER_DAY_REACHED',
  });
});

test('Minimum balance breach is REJECTED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { minAccountBalance: 20000 },
      runtime: { currentBalance: 10000 },
    })
  );
  assert.deepEqual(result, {
    decision: 'REJECTED',
    reasonCode: 'MIN_ACCOUNT_BALANCE_NOT_MET',
  });
});

test('Max open positions breach is REJECTED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { maxOpenPositions: 2 },
      runtime: { currentOpenPositions: 2 },
    })
  );
  assert.deepEqual(result, {
    decision: 'REJECTED',
    reasonCode: 'MAX_OPEN_POSITIONS_REACHED',
  });
});

test('Invalid fixed quantity is REJECTED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { sizingMode: 'FIXED', fixedQuantity: 0 },
    })
  );
  assert.deepEqual(result, {
    decision: 'REJECTED',
    reasonCode: 'INVALID_FIXED_QUANTITY',
  });
});

test('Invalid multiplier is REJECTED', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      follower: { sizingMode: 'MULTIPLIER', multiplier: 0 },
    })
  );
  assert.deepEqual(result, {
    decision: 'REJECTED',
    reasonCode: 'INVALID_MULTIPLIER',
  });
});

test('Fixed sizing returns correct quantity', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      trade: { quantity: 10 },
      follower: { sizingMode: 'FIXED', fixedQuantity: 7 },
    })
  );
  assert.deepEqual(result, {
    decision: 'ALLOWED',
    reasonCode: null,
    side: 'BUY',
    quantity: 7,
  });
});

test('Multiplier sizing preserves floor rounding', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      trade: { quantity: 3 },
      follower: { sizingMode: 'MULTIPLIER', multiplier: 0.5 },
    })
  );
  assert.deepEqual(result, {
    decision: 'ALLOWED',
    reasonCode: null,
    side: 'BUY',
    quantity: 1,
  });
});

test('Reverse copying flips BUY to SELL', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      trade: { side: 'BUY', quantity: 2 },
      follower: { reverseCopy: true },
    })
  );
  assert.deepEqual(result, {
    decision: 'ALLOWED',
    reasonCode: null,
    side: 'SELL',
    quantity: 2,
  });
});

test('Max contracts cap is respected', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      trade: { quantity: 10 },
      follower: { multiplier: 1, maxContracts: 3 },
    })
  );
  assert.deepEqual(result, {
    decision: 'ALLOWED',
    reasonCode: null,
    side: 'BUY',
    quantity: 3,
  });
});

test('Zero quantity is SKIPPED with ZERO_QUANTITY', () => {
  const result = evaluateFollowerTradeRule(
    makeInput({
      trade: { quantity: 1 },
      follower: { sizingMode: 'MULTIPLIER', multiplier: 0.5 },
    })
  );
  assert.deepEqual(result, {
    decision: 'SKIPPED',
    reasonCode: 'ZERO_QUANTITY',
    side: 'BUY',
    quantity: 0,
  });
});
