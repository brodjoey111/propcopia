import type { TradeHistoryRecord } from './trade-history-store';

function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) {
    return '';
  }

  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function serializeTradeHistoryCsv(records: TradeHistoryRecord[]): string {
  const headers = [
    'historyId',
    'intentId',
    'masterAccountId',
    'masterFillId',
    'followerAccountId',
    'symbol',
    'side',
    'quantity',
    'lifecycleStatus',
    'ruleReasonCode',
    'brokerKey',
    'brokerOrderId',
    'fillId',
    'filledQuantity',
    'averageFillPrice',
    'createdAt',
    'updatedAt',
    'queuedAt',
    'sentAt',
    'acknowledgedAt',
    'filledAt',
    'failedAt',
    'lastErrorMessage',
  ];

  const rows = records.map((record) =>
    [
      record.historyId,
      record.intentId,
      record.masterAccountId,
      record.masterFillId,
      record.followerAccountId,
      record.symbol,
      record.side,
      record.quantity,
      record.lifecycleStatus,
      record.ruleReasonCode,
      record.brokerKey,
      record.brokerOrderId,
      record.fillId,
      record.filledQuantity,
      record.averageFillPrice,
      record.createdAt,
      record.updatedAt,
      record.queuedAt,
      record.sentAt,
      record.acknowledgedAt,
      record.filledAt,
      record.failedAt,
      record.lastErrorMessage,
    ]
      .map((value) => escapeCsv(value))
      .join(','),
  );

  return [headers.join(','), ...rows].join('\n');
}
