import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGlobalRiskAccountUpdate,
  DEFAULT_GLOBAL_RISK_SETTINGS,
  parseGlobalRiskSettings,
  readStoredGlobalRiskSettings,
} from './global-risk-settings-service';

test('global risk settings merge a validated patch with safe defaults', () => {
  const result = parseGlobalRiskSettings({
    maxDailyLoss: 1200,
    blockedTickers: [' nq ', 'ES'],
  });

  assert.equal(result.success, true);
  if (!result.success) {
    return;
  }

  assert.equal(result.data.positionScaling, 100);
  assert.equal(result.data.maxDailyLoss, 1200);
  assert.deepEqual(result.data.blockedTickers, ['ES', 'NQ']);
  assert.deepEqual(result.data.tradingDays, ['mon', 'tue', 'wed', 'thu', 'fri']);
});

test('stored global settings fall back safely when JSON is invalid', () => {
  assert.deepEqual(readStoredGlobalRiskSettings('{broken'), DEFAULT_GLOBAL_RISK_SETTINGS);
  assert.deepEqual(readStoredGlobalRiskSettings(null), DEFAULT_GLOBAL_RISK_SETTINGS);
});

test('stored global settings preserve legacy server defaults before the first full save', () => {
  const settings = readStoredGlobalRiskSettings(null, {
    positionScaling: 75,
    maxContracts: 4,
    blockedTickers: [' nq '],
  });

  assert.equal(settings.positionScaling, 75);
  assert.equal(settings.maxContracts, 4);
  assert.deepEqual(settings.blockedTickers, ['NQ']);
});

test('global settings convert decimal values to the account database representation', () => {
  const result = parseGlobalRiskSettings({
    maxDailyLoss: 750.5,
    minAccountBalance: 25000,
  });
  assert.equal(result.success, true);
  if (!result.success) {
    return;
  }

  const update = buildGlobalRiskAccountUpdate(result.data);
  assert.equal(update.maxDailyLoss, '750.5');
  assert.equal(update.minAccountBalance, '25000');
  assert.equal(update.maxWeeklyLoss, null);
});
