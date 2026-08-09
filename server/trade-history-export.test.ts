import test from 'node:test';
import assert from 'node:assert/strict';
import { serializeTradeHistoryCsv } from './trade-history-export';
import type { TradeHistoryRecord } from './trade-history-store';

function createRecord(overrides: Partial<TradeHistoryRecord> = {}): TradeHistoryRecord {
  return {
    historyId: 'intent-1',
    intentId: 'intent-1',
    masterAccountId: 'master-1',
    masterFillId: 'fill-1',
    followerAccountId: 'follower-1',
    symbol: 'ES',
    side: 'BUY',
    quantity: 2,
    lifecycleStatus: 'FILLED',
    brokerKey: 'rithmic:follower-1',
    brokerOrderId: 'order-1',
    fillId: 'fill-follow-1',
    filledQuantity: 2,
    averageFillPrice: 6400.25,
    createdAt: '2026-08-04T12:00:00.000Z',
    updatedAt: '2026-08-04T12:00:04.000Z',
    filledAt: '2026-08-04T12:00:04.000Z',
    events: [],
    ...overrides,
  };
}

test('serializeTradeHistoryCsv emits headers and data rows', () => {
  const csv = serializeTradeHistoryCsv([createRecord()]);

  assert.match(csv, /^historyId,intentId,masterAccountId,/);
  assert.match(csv, /intent-1,intent-1,master-1,fill-1,follower-1,ES,BUY,2,FILLED/);
});

test('serializeTradeHistoryCsv escapes commas and quotes', () => {
  const csv = serializeTradeHistoryCsv([
    createRecord({
      lastErrorMessage: 'Broker said "no, retry later"',
      ruleReasonCode: 'RISK,GUARD',
    }),
  ]);

  assert.match(csv, /"RISK,GUARD"/);
  assert.match(csv, /"Broker said ""no, retry later"""/);
});
