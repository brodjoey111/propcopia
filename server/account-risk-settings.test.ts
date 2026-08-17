import assert from 'node:assert/strict';
import test from 'node:test';

import { parseAccountRiskSettingsPatch } from './account-risk-settings';

test('normalizes ticker lists and removes duplicate trading days', () => {
  const result = parseAccountRiskSettingsPatch({
    riskMode: 'custom',
    blockedTickers: [' es ', 'NQ', 'ES'],
    allowedTickers: [' ym ', 'YM'],
    tradingDays: ['mon', 'tue', 'mon'],
  });

  assert.equal(result.success, true);
  if (!result.success) {
    return;
  }

  assert.deepEqual(result.data.blockedTickers, ['ES', 'NQ']);
  assert.deepEqual(result.data.allowedTickers, ['YM']);
  assert.deepEqual(result.data.tradingDays, ['mon', 'tue']);
});

test('accepts an overnight trading window', () => {
  const result = parseAccountRiskSettingsPatch({
    tradingStartTime: '22:00',
    tradingEndTime: '02:00',
  });

  assert.equal(result.success, true);
});

test('rejects unsafe numeric values and unsupported choices', () => {
  const result = parseAccountRiskSettingsPatch({
    positionScaling: 0,
    maxContracts: -1,
    maxDailyLossPct: 101,
    allowedDirections: 'sometimes',
    cooldownAfterLoss: 1_441,
  });

  assert.equal(result.success, false);
  if (result.success) {
    return;
  }

  assert.ok(result.errors.positionScaling);
  assert.ok(result.errors.maxContracts);
  assert.ok(result.errors.maxDailyLossPct);
  assert.ok(result.errors.allowedDirections);
  assert.ok(result.errors.cooldownAfterLoss);
});

test('rejects malformed and zero-length trading windows', () => {
  const malformed = parseAccountRiskSettingsPatch({ tradingStartTime: '9:30' });
  const zeroLength = parseAccountRiskSettingsPatch({
    tradingStartTime: '14:00',
    tradingEndTime: '14:00',
  });

  assert.equal(malformed.success, false);
  assert.equal(zeroLength.success, false);
});

test('rejects an empty trading-day schedule instead of treating it as every day', () => {
  const result = parseAccountRiskSettingsPatch({ tradingDays: [] });

  assert.equal(result.success, false);
});

test('rejects unknown fields and empty patches', () => {
  const unknown = parseAccountRiskSettingsPatch({ maxOrdersPerMinute: 50 });
  const empty = parseAccountRiskSettingsPatch({});

  assert.equal(unknown.success, false);
  assert.equal(empty.success, false);
});

test('allows null to explicitly disable an optional limit', () => {
  const result = parseAccountRiskSettingsPatch({
    maxDailyLoss: null,
    maxOpenPositions: null,
    cooldownAfterLoss: null,
  });

  assert.equal(result.success, true);
});
