export type TradeHistoryLifecycleStatus =
  | "RULE_SKIPPED"
  | "RULE_REJECTED"
  | "INTENT_CREATED"
  | "QUEUED"
  | "SENT"
  | "ACKNOWLEDGED"
  | "FILLED"
  | "FAILED"
  | "CANCELLED";

export interface TradeHistoryApiRecord {
  historyId: string;
  intentId?: string;
  masterAccountId?: string;
  masterAccountName?: string | null;
  masterFillId: string;
  followerAccountId: string;
  followerAccountName?: string | null;
  symbol: string;
  side?: string;
  quantity?: number;
  lifecycleStatus: TradeHistoryLifecycleStatus;
  ruleReasonCode?: string;
  brokerOrderId?: string;
  fillId?: string;
  averageFillPrice?: number;
  createdAt: string;
  updatedAt: string;
  queuedAt?: string;
  sentAt?: string;
  acknowledgedAt?: string;
  filledAt?: string;
  failedAt?: string;
  lastErrorMessage?: string;
  events?: Array<{
    type: string;
    timestamp: string;
    message: string;
  }>;
}

export interface TradeHistoryResponse {
  success: boolean;
  records: TradeHistoryApiRecord[];
}

export interface TradeHistoryFilters {
  status?: "all" | "filled" | "pending" | "failed";
  query?: string;
  limit?: number;
}

export interface TradeHistoryRow {
  id: string;
  timestamp: string;
  timestampLabel: string;
  masterAccountLabel: string;
  followerAccountLabel: string;
  symbol: string;
  sideLabel: string;
  quantityLabel: string;
  lifecycleStatus: TradeHistoryLifecycleStatus;
  statusTone: "success" | "failed" | "pending";
  statusLabel: string;
  priceLabel: string;
  errorLabel: string | null;
  events: Array<{
    type: string;
    timestamp: string;
    timestampLabel: string;
    message: string;
  }>;
  detail: {
    intentId?: string;
    masterFillId: string;
    brokerOrderId?: string;
    fillId?: string;
    lifecycleStatus: TradeHistoryLifecycleStatus;
  };
}

export interface TradeHistorySummary {
  total: number;
  filled: number;
  failed: number;
  pending: number;
  skippedOrRejected: number;
}

export interface TradeHistorySymbolSummary {
  symbol: string;
  total: number;
  filled: number;
  pending: number;
  failed: number;
}

export interface TradeHistoryDailySummary {
  label: string;
  dateKey: string;
  total: number;
  filled: number;
  pending: number;
  failed: number;
}

const SUCCESS_STATUSES = new Set<TradeHistoryLifecycleStatus>(["FILLED"]);
const FAILED_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FAILED",
  "CANCELLED",
  "RULE_SKIPPED",
  "RULE_REJECTED",
]);

function pickTimestamp(record: TradeHistoryApiRecord): string {
  return (
    record.filledAt ??
    record.acknowledgedAt ??
    record.sentAt ??
    record.failedAt ??
    record.queuedAt ??
    record.updatedAt ??
    record.createdAt
  );
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(value?: number): string {
  if (value == null) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function getTradeHistoryStatusTone(
  status: TradeHistoryLifecycleStatus,
): "success" | "failed" | "pending" {
  if (SUCCESS_STATUSES.has(status)) {
    return "success";
  }

  if (FAILED_STATUSES.has(status)) {
    return "failed";
  }

  return "pending";
}

export function formatTradeHistoryStatus(
  status: TradeHistoryLifecycleStatus,
): string {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function toTradeHistoryRows(records: TradeHistoryApiRecord[]): TradeHistoryRow[] {
  return records.map((record) => {
    const timestamp = pickTimestamp(record);
    const sideLabel = record.side ?? "N/A";
    const quantityLabel =
      typeof record.quantity === "number" ? String(record.quantity) : "N/A";

    return {
      id: record.historyId,
      timestamp,
      timestampLabel: formatDateTime(timestamp),
      masterAccountLabel:
        record.masterAccountName ?? record.masterAccountId ?? "Rule Event",
      followerAccountLabel:
        record.followerAccountName ?? record.followerAccountId,
      symbol: record.symbol,
      sideLabel,
      quantityLabel,
      lifecycleStatus: record.lifecycleStatus,
      statusTone: getTradeHistoryStatusTone(record.lifecycleStatus),
      statusLabel: formatTradeHistoryStatus(record.lifecycleStatus),
      priceLabel: formatPrice(record.averageFillPrice),
      errorLabel: record.lastErrorMessage ?? record.ruleReasonCode ?? null,
      events: (record.events ?? []).map((event) => ({
        type: event.type,
        timestamp: event.timestamp,
        timestampLabel: formatDateTime(event.timestamp),
        message: event.message,
      })),
      detail: {
        intentId: record.intentId,
        masterFillId: record.masterFillId,
        brokerOrderId: record.brokerOrderId,
        fillId: record.fillId,
        lifecycleStatus: record.lifecycleStatus,
      },
    };
  });
}

export function summarizeTradeHistory(
  records: TradeHistoryApiRecord[],
): TradeHistorySummary {
  return records.reduce<TradeHistorySummary>(
    (summary, record) => {
      summary.total += 1;

      if (record.lifecycleStatus === "FILLED") {
        summary.filled += 1;
      } else if (
        record.lifecycleStatus === "RULE_SKIPPED" ||
        record.lifecycleStatus === "RULE_REJECTED"
      ) {
        summary.skippedOrRejected += 1;
      } else if (FAILED_STATUSES.has(record.lifecycleStatus)) {
        summary.failed += 1;
      } else {
        summary.pending += 1;
      }

      return summary;
    },
    {
      total: 0,
      filled: 0,
      failed: 0,
      pending: 0,
      skippedOrRejected: 0,
    },
  );
}

export function buildTradeHistoryQueryString(filters: TradeHistoryFilters): string {
  const params = new URLSearchParams();

  if (typeof filters.limit === "number" && Number.isFinite(filters.limit)) {
    params.set("limit", String(Math.max(1, Math.floor(filters.limit))));
  }

  if (filters.status && filters.status !== "all") {
    const mappedStatus =
      filters.status === "filled"
        ? "FILLED"
        : filters.status === "pending"
          ? "QUEUED,SENT,ACKNOWLEDGED,INTENT_CREATED"
          : "FAILED,CANCELLED,RULE_SKIPPED,RULE_REJECTED";
    params.set("status", mappedStatus);
  }

  if (filters.query && filters.query.trim().length > 0) {
    params.set("q", filters.query.trim());
  }

  const queryString = params.toString();
  return queryString.length > 0 ? `?${queryString}` : "";
}

export function summarizeTradeHistoryBySymbol(
  records: TradeHistoryApiRecord[],
  limit = 5,
): TradeHistorySymbolSummary[] {
  const bySymbol = new Map<string, TradeHistorySymbolSummary>();

  for (const record of records) {
    const symbol = record.symbol || "Unknown";
    const existing = bySymbol.get(symbol) ?? {
      symbol,
      total: 0,
      filled: 0,
      pending: 0,
      failed: 0,
    };

    existing.total += 1;
    if (record.lifecycleStatus === "FILLED") {
      existing.filled += 1;
    } else if (
      record.lifecycleStatus === "RULE_SKIPPED" ||
      record.lifecycleStatus === "RULE_REJECTED" ||
      FAILED_STATUSES.has(record.lifecycleStatus)
    ) {
      existing.failed += 1;
    } else {
      existing.pending += 1;
    }

    bySymbol.set(symbol, existing);
  }

  return Array.from(bySymbol.values())
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total;
      }
      return left.symbol.localeCompare(right.symbol);
    })
    .slice(0, limit);
}

export function summarizeTradeHistoryByDay(
  records: TradeHistoryApiRecord[],
  days = 5,
): TradeHistoryDailySummary[] {
  const normalizedDays = Math.max(1, Math.floor(days));
  const byDay = new Map<string, TradeHistoryDailySummary>();

  for (let index = normalizedDays - 1; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    const dateKey = date.toISOString().slice(0, 10);
    byDay.set(dateKey, {
      dateKey,
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date),
      total: 0,
      filled: 0,
      pending: 0,
      failed: 0,
    });
  }

  for (const record of records) {
    const timestamp = pickTimestamp(record);
    const dateKey = new Date(timestamp).toISOString().slice(0, 10);
    const day = byDay.get(dateKey);

    if (!day) {
      continue;
    }

    day.total += 1;

    if (record.lifecycleStatus === "FILLED") {
      day.filled += 1;
    } else if (FAILED_STATUSES.has(record.lifecycleStatus)) {
      day.failed += 1;
    } else {
      day.pending += 1;
    }
  }

  return Array.from(byDay.values());
}
