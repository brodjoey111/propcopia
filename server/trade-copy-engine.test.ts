import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFollowerOrder } from './trade-copy-engine';

test('calculateFollowerOrder preserves legacy 100% multiplier behavior', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 4,
    positionScaling: 100,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 4,
    skipped: false,
  });
});

test('calculateFollowerOrder applies 50% multiplier with floor rounding', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 3,
    positionScaling: 50,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 1,
    skipped: false,
  });
});

test('calculateFollowerOrder uses fixed quantity', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 10,
    positionScaling: 25,
    maxContracts: undefined,
    copySizingMode: 'FIXED',
    fixedQuantity: 7,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 7,
    skipped: false,
  });
});

test('calculateFollowerOrder caps fixed quantity by maxContracts', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 10,
    positionScaling: 25,
    maxContracts: 2,
    copySizingMode: 'FIXED',
    fixedQuantity: 7,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 2,
    skipped: false,
  });
});

test('calculateFollowerOrder reverses BUY to SELL', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 2,
    positionScaling: 100,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: true,
  });

  assert.deepEqual(result, {
    action: 'SELL',
    quantity: 2,
    skipped: false,
  });
});

test('calculateFollowerOrder reverses SELL to BUY', () => {
  const result = calculateFollowerOrder({
    masterAction: 'SELL',
    masterQuantity: 2,
    positionScaling: 100,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: true,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 2,
    skipped: false,
  });
});

test('calculateFollowerOrder skips zero quantity', () => {
  const result = calculateFollowerOrder({
    masterAction: 'BUY',
    masterQuantity: 1,
    positionScaling: 50,
    maxContracts: undefined,
    copySizingMode: 'MULTIPLIER',
    fixedQuantity: undefined,
    reverseCopying: false,
  });

  assert.deepEqual(result, {
    action: 'BUY',
    quantity: 0,
    skipped: true,
    skipReason: 'zero_quantity',
  });
});

test('calculateFollowerOrder preserves legacy behavior when new fields are missing', () => {
  const result = calculateFollowerOrder({
    masterAction: 'SELL',
    masterQuantity: 5,
    positionScaling: undefined,
    maxContracts: undefined,
    copySizingMode: undefined,
    fixedQuantity: undefined,
    reverseCopying: undefined,
  });

  assert.deepEqual(result, {
    action: 'SELL',
    quantity: 5,
    skipped: false,
  });
});
