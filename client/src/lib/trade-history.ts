import { formatRuleReasonLabel } from "./rule-reason";

export type TradeHistoryLifecycleStatus =
  | "RULE_SKIPPED"
  | "RULE_REJECTED"
  | "INTENT_CREATED"
  | "QUEUED"
  | "SENT"
  | "ACKNOWLEDGED"
  | "PARTIALLY_FILLED"
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
  partialFillCount?: number;
  filledQuantity?: number;
  remainingQuantity?: number;
  averageFillPrice?: number;
  createdAt: string;
  updatedAt: string;
  queuedAt?: string;
  sentAt?: string;
  acknowledgedAt?: string;
  filledAt?: string;
  failedAt?: string;
  lastErrorMessage?: string;
  reviewStatus?: "pending" | "reviewed";
  reviewNote?: string;
  reviewedAt?: string;
  operatorName?: string;
  operatorHistory?: Array<{
    operatorName: string;
    assignedAt: string;
    reason?: string;
  }>;
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
  executionSummary: {
    state: "working" | "partial" | "complete" | "failed";
    attention: "alert" | "watch" | "ok";
    headline: string;
    detail: string;
  };
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
    requestedQuantityLabel: string;
    filledQuantityLabel: string;
    remainingQuantityLabel: string;
    progressLabel: string;
    fillCountLabel: string;
    reviewStatus?: "pending" | "reviewed";
    reviewNote?: string;
    reviewedAt?: string;
    operatorName?: string;
    operatorHistory?: Array<{
      operatorName: string;
      assignedAt: string;
      reason?: string;
    }>;
    stageFlow: Array<{
      key: "created" | "queued" | "sent" | "acknowledged" | "partial" | "filled" | "failed";
      label: string;
      state: "done" | "active" | "pending";
    }>;
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

export interface TradeHistoryLifecycleStageCard {
  label: string;
  value: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface TradeHistoryLifecycleOverview {
  headline: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface TradeHistoryJourneyRow {
  id: string;
  symbol: string;
  accountLabel: string;
  stageLabel: string;
  nextStepLabel: string;
  executionSummary: TradeHistoryRow["executionSummary"];
  updatedAtLabel: string;
  tone: "ok" | "warn" | "danger";
}

export interface DashboardExecutionPathRow extends TradeHistoryRow {
  attentionState: "alert" | "watch" | "ok";
  attentionLabel: string;
}

export interface DashboardExecutionAttentionCard {
  label: string;
  value: string;
  tone: "alert" | "watch" | "ok";
  detail: string;
}

type TradeHistoryStageKey =
  | "created"
  | "queued"
  | "sent"
  | "acknowledged"
  | "partial"
  | "filled"
  | "failed";

const SUCCESS_STATUSES = new Set<TradeHistoryLifecycleStatus>(["FILLED"]);
const FAILED_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "FAILED",
  "CANCELLED",
  "RULE_SKIPPED",
  "RULE_REJECTED",
]);
const IN_FLIGHT_STATUSES = new Set<TradeHistoryLifecycleStatus>([
  "INTENT_CREATED",
  "QUEUED",
  "SENT",
  "ACKNOWLEDGED",
  "PARTIALLY_FILLED",
]);

function buildExecutionSummary(record: TradeHistoryApiRecord): TradeHistoryRow["executionSummary"] {
  const filledQuantity =
    typeof record.filledQuantity === "number"
      ? record.filledQuantity
      : record.lifecycleStatus === "FILLED" && typeof record.quantity === "number"
        ? record.quantity
        : 0;
  const remainingQuantity =
    typeof record.remainingQuantity === "number"
      ? record.remainingQuantity
      : typeof record.quantity === "number"
        ? Math.max(record.quantity - filledQuantity, 0)
        : 0;

  if (record.lifecycleStatus === "FILLED") {
    return {
      state: "complete",
      attention: "ok",
      headline: "Filled",
      detail:
        typeof record.quantity === "number"
          ? `${filledQuantity}/${record.quantity} contracts complete`
          : "Execution complete",
    };
  }

  if (record.lifecycleStatus === "PARTIALLY_FILLED") {
    return {
      state: "partial",
      attention: "watch",
      headline: "Partial fill",
      detail:
        typeof record.quantity === "number"
          ? `${filledQuantity}/${record.quantity} filled, ${remainingQuantity} remaining`
          : "Waiting on remaining quantity",
    };
  }

  if (record.lifecycleStatus === "ACKNOWLEDGED") {
    return {
      state: "working",
      attention: "watch",
      headline: "Waiting on fill",
      detail: "Broker acknowledged the order",
    };
  }

  if (record.lifecycleStatus === "SENT") {
    return {
      state: "working",
      attention: "watch",
      headline: "Waiting on broker",
      detail: "Order sent and awaiting acknowledgement",
    };
  }

  if (record.lifecycleStatus === "QUEUED" || record.lifecycleStatus === "INTENT_CREATED") {
    return {
      state: "working",
      attention: "watch",
      headline: "Queued",
      detail: "Execution is still moving through the pipeline",
    };
  }

  return {
    state: "failed",
    attention: record.lifecycleStatus === "RULE_SKIPPED" ? "watch" : "alert",
    headline: formatTradeHistoryStatus(record.lifecycleStatus),
    detail:
      record.lastErrorMessage ??
      formatRuleReasonLabel(record.ruleReasonCode) ??
      "Execution needs review",
  };
}

function pickTimestamp(record: TradeHistoryApiRecord): string {
  switch (record.lifecycleStatus) {
    case "FILLED":
      return record.filledAt ?? record.updatedAt ?? record.acknowledgedAt ?? record.sentAt ?? record.createdAt;
    case "PARTIALLY_FILLED":
      return record.updatedAt ?? record.acknowledgedAt ?? record.sentAt ?? record.queuedAt ?? record.createdAt;
    case "ACKNOWLEDGED":
      return record.acknowledgedAt ?? record.sentAt ?? record.queuedAt ?? record.updatedAt ?? record.createdAt;
    case "SENT":
      return record.sentAt ?? record.queuedAt ?? record.updatedAt ?? record.createdAt;
    case "FAILED":
    case "CANCELLED":
      return record.failedAt ?? record.updatedAt ?? record.sentAt ?? record.createdAt;
    case "QUEUED":
      return record.queuedAt ?? record.updatedAt ?? record.createdAt;
    case "INTENT_CREATED":
      return record.updatedAt ?? record.createdAt;
    default:
      return record.updatedAt ?? record.createdAt;
  }
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

function buildTradeStageFlow(
  record: TradeHistoryApiRecord,
): TradeHistoryRow["detail"]["stageFlow"] {
  const stages: Array<{ key: TradeHistoryStageKey; label: string }> = [
    { key: "created", label: "Created" },
    { key: "queued", label: "Queued" },
    { key: "sent", label: "Sent" },
    { key: "acknowledged", label: "Acknowledged" },
    { key: "partial", label: "Partial" },
    { key: "filled", label: "Filled" },
  ];

  const statusToStage = new Map<TradeHistoryLifecycleStatus, TradeHistoryStageKey>([
    ["INTENT_CREATED", "created"],
    ["QUEUED", "queued"],
    ["SENT", "sent"],
    ["ACKNOWLEDGED", "acknowledged"],
    ["PARTIALLY_FILLED", "partial"],
    ["FILLED", "filled"],
  ]);

  if (FAILED_STATUSES.has(record.lifecycleStatus)) {
    return [
      ...stages.map((stage) => ({
        ...stage,
        state:
          stage.key === "created"
            ? ("done" as const)
            : stage.key === "queued" && record.lifecycleStatus !== "RULE_SKIPPED" && record.lifecycleStatus !== "RULE_REJECTED"
              ? ("done" as const)
              : stage.key === "sent" &&
                  record.lifecycleStatus !== "RULE_SKIPPED" &&
                  record.lifecycleStatus !== "RULE_REJECTED" &&
                  !!record.sentAt
                ? ("done" as const)
                : ("pending" as const),
      })),
      {
        key: "failed",
        label:
          record.lifecycleStatus === "RULE_REJECTED"
            ? "Rejected"
            : record.lifecycleStatus === "RULE_SKIPPED"
              ? "Skipped"
              : record.lifecycleStatus === "CANCELLED"
                ? "Cancelled"
                : "Failed",
        state: "active" as const,
      },
    ];
  }

  const activeStage = statusToStage.get(record.lifecycleStatus) ?? "created";
  const order: TradeHistoryStageKey[] = stages.map((stage) => stage.key);
  const activeIndex = order.indexOf(activeStage);

  return stages.map((stage, index) => ({
    ...stage,
    state:
      index < activeIndex
        ? ("done" as const)
        : index === activeIndex
          ? ("active" as const)
          : ("pending" as const),
  }));
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
    const filledQuantity =
      typeof record.filledQuantity === "number"
        ? record.filledQuantity
        : record.lifecycleStatus === "FILLED" && typeof record.quantity === "number"
          ? record.quantity
          : 0;
    const remainingQuantity =
      typeof record.remainingQuantity === "number"
        ? record.remainingQuantity
        : typeof record.quantity === "number"
          ? Math.max(record.quantity - filledQuantity, 0)
          : undefined;
    const requestedQuantityLabel = quantityLabel;
    const filledQuantityLabel = String(filledQuantity);
    const remainingQuantityLabel =
      typeof remainingQuantity === "number" ? String(remainingQuantity) : "N/A";
    const progressLabel =
      typeof record.quantity === "number" && record.quantity > 0
        ? `${filledQuantity}/${record.quantity} filled`
        : record.lifecycleStatus === "FILLED"
          ? "Complete"
          : "Pending";
    const fillCountLabel =
      typeof record.partialFillCount === "number" && record.partialFillCount > 0
        ? `${record.partialFillCount} partial fill${record.partialFillCount === 1 ? "" : "s"}`
        : record.lifecycleStatus === "FILLED"
          ? "1 final fill"
          : "No fills yet";
    const stageFlow = buildTradeStageFlow(record);
    const executionSummary = buildExecutionSummary(record);

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
      errorLabel:
        record.lastErrorMessage ?? formatRuleReasonLabel(record.ruleReasonCode),
      executionSummary,
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
        requestedQuantityLabel,
        filledQuantityLabel,
        remainingQuantityLabel,
        progressLabel,
        fillCountLabel,
        reviewStatus: record.reviewStatus,
        reviewNote: record.reviewNote,
        reviewedAt: record.reviewedAt,
        operatorName: record.operatorName,
        operatorHistory: record.operatorHistory,
        stageFlow,
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

export function describeTradeLifecycleOverview(
  records: TradeHistoryApiRecord[],
): TradeHistoryLifecycleOverview {
  if (records.length === 0) {
    return {
      headline: "No execution history yet",
      detail: "Execution journey details will appear after follower orders begin moving through the pipeline.",
      tone: "muted",
    };
  }

  const acknowledgedCount = records.filter(
    (record) => record.lifecycleStatus === "ACKNOWLEDGED",
  ).length;
  const partialCount = records.filter(
    (record) => record.lifecycleStatus === "PARTIALLY_FILLED",
  ).length;
  const inFlightCount = records.filter((record) =>
    IN_FLIGHT_STATUSES.has(record.lifecycleStatus),
  ).length;
  const issueCount = records.filter((record) =>
    FAILED_STATUSES.has(record.lifecycleStatus),
  ).length;
  const filledCount = records.filter(
    (record) => record.lifecycleStatus === "FILLED",
  ).length;

  if (issueCount > 0) {
    return {
      headline: `${issueCount} execution${issueCount === 1 ? " needs" : "s need"} attention`,
      detail:
        acknowledgedCount > 0
          ? `${acknowledgedCount} acknowledged order${acknowledgedCount === 1 ? " is" : "s are"} still waiting on fills.`
          : `${Math.max(inFlightCount, 0)} order${inFlightCount === 1 ? "" : "s"} are still moving through the pipeline.`,
      tone: "danger",
    };
  }

  if (inFlightCount > 0) {
    return {
      headline:
        partialCount > 0
          ? `${partialCount} execution${partialCount === 1 ? "" : "s"} partially filled`
          : `${inFlightCount} execution${inFlightCount === 1 ? " is" : "s are"} in flight`,
      detail:
        partialCount > 0
          ? `${partialCount} order${partialCount === 1 ? " still needs" : " orders still need"} remaining fills before they are complete.`
          : acknowledgedCount > 0
          ? `${acknowledgedCount} broker acknowledgement${acknowledgedCount === 1 ? "" : "s"} received so far.`
          : "Orders are moving from intent creation into broker handoff.",
      tone: "warn",
    };
  }

  return {
    headline: "Execution flow is clearing",
    detail: `${filledCount} follower execution${filledCount === 1 ? "" : "s"} reached a fill state in the current history window.`,
    tone: "ok",
  };
}

export function buildTradeLifecycleStageCards(
  records: TradeHistoryApiRecord[],
): TradeHistoryLifecycleStageCard[] {
  const count = (statuses: TradeHistoryLifecycleStatus[]) =>
    records.filter((record) => statuses.includes(record.lifecycleStatus)).length;

  const intents = count(["INTENT_CREATED"]);
  const queued = count(["QUEUED"]);
  const working = count(["SENT", "ACKNOWLEDGED"]);
  const partial = count(["PARTIALLY_FILLED"]);
  const filled = count(["FILLED"]);
  const exceptions = count([
    "FAILED",
    "CANCELLED",
    "RULE_SKIPPED",
    "RULE_REJECTED",
  ]);

  return [
    {
      label: "Intent",
      value: String(intents),
      tone: intents > 0 ? "warn" : "muted",
    },
    {
      label: "Queued",
      value: String(queued),
      tone: queued > 0 ? "warn" : "muted",
    },
    {
      label: "Working",
      value: String(working),
      tone: working > 0 ? "warn" : "muted",
    },
    {
      label: "Partial",
      value: String(partial),
      tone: partial > 0 ? "warn" : "muted",
    },
    {
      label: "Filled",
      value: String(filled),
      tone: filled > 0 ? "ok" : "muted",
    },
    {
      label: "Exceptions",
      value: String(exceptions),
      tone: exceptions > 0 ? "danger" : "ok",
    },
  ];
}

function describeJourneyStage(
  record: TradeHistoryApiRecord,
): Pick<TradeHistoryJourneyRow, "stageLabel" | "nextStepLabel" | "tone"> {
  switch (record.lifecycleStatus) {
    case "INTENT_CREATED":
      return {
        stageLabel: "Intent created",
        nextStepLabel: "Waiting to queue",
        tone: "warn",
      };
    case "QUEUED":
      return {
        stageLabel: "Queued",
        nextStepLabel: "Waiting to send",
        tone: "warn",
      };
    case "SENT":
      return {
        stageLabel: "Sent",
        nextStepLabel: "Waiting for broker acknowledgement",
        tone: "warn",
      };
    case "ACKNOWLEDGED":
      return {
        stageLabel: "Acknowledged",
        nextStepLabel: "Waiting for fill",
        tone: "warn",
      };
    case "PARTIALLY_FILLED":
      return {
        stageLabel: "Partial fill",
        nextStepLabel:
          typeof record.remainingQuantity === "number"
            ? `Waiting on ${record.remainingQuantity} more contract${record.remainingQuantity === 1 ? "" : "s"}`
            : "Waiting for remaining quantity",
        tone: "warn",
      };
    case "FILLED":
      return {
        stageLabel: "Filled",
        nextStepLabel: "Complete",
        tone: "ok",
      };
    case "FAILED":
      return {
        stageLabel: "Failed",
        nextStepLabel: record.lastErrorMessage ?? "Needs review",
        tone: "danger",
      };
    case "CANCELLED":
      return {
        stageLabel: "Cancelled",
        nextStepLabel: record.lastErrorMessage ?? "Stopped before fill",
        tone: "danger",
      };
    case "RULE_SKIPPED":
      return {
        stageLabel: "Skipped by rule",
        nextStepLabel: record.lastErrorMessage ?? formatRuleReasonLabel(record.ruleReasonCode) ?? "Rule hold",
        tone: "danger",
      };
    case "RULE_REJECTED":
      return {
        stageLabel: "Rejected by rule",
        nextStepLabel: record.lastErrorMessage ?? formatRuleReasonLabel(record.ruleReasonCode) ?? "Risk review",
        tone: "danger",
      };
  }
}

export function buildTradeJourneyRows(
  records: TradeHistoryApiRecord[],
  limit = 6,
): TradeHistoryJourneyRow[] {
  return [...records]
    .sort((left, right) => pickTimestamp(right).localeCompare(pickTimestamp(left)))
    .slice(0, limit)
    .map((record) => {
      const journey = describeJourneyStage(record);
      const executionSummary = buildExecutionSummary(record);
      return {
        id: record.historyId,
        symbol: record.symbol,
        accountLabel: record.followerAccountName ?? record.followerAccountId,
        stageLabel: journey.stageLabel,
        nextStepLabel: journey.nextStepLabel,
        executionSummary,
        updatedAtLabel: formatDateTime(pickTimestamp(record)),
        tone: journey.tone,
      };
    });
}

function getDashboardAttentionMeta(
  row: TradeHistoryRow,
): Pick<DashboardExecutionPathRow, "attentionState" | "attentionLabel"> {
  if (row.statusTone === "failed") {
    return {
      attentionState: "alert",
      attentionLabel: "Needs attention",
    };
  }

  if (
    row.lifecycleStatus === "PARTIALLY_FILLED" ||
    row.lifecycleStatus === "ACKNOWLEDGED" ||
    row.lifecycleStatus === "SENT" ||
    row.lifecycleStatus === "QUEUED"
  ) {
    return {
      attentionState: "watch",
      attentionLabel:
        row.lifecycleStatus === "PARTIALLY_FILLED"
          ? "Partial fill"
          : row.lifecycleStatus === "ACKNOWLEDGED"
            ? "Waiting on fill"
            : row.lifecycleStatus === "SENT"
              ? "Waiting on broker"
              : "Queued",
    };
  }

  return {
    attentionState: "ok",
    attentionLabel: "Cleared",
  };
}

export function buildDashboardExecutionPathRows(
  records: TradeHistoryApiRecord[],
  limit = 3,
): DashboardExecutionPathRow[] {
  const priority = new Map<DashboardExecutionPathRow["attentionState"], number>([
    ["alert", 0],
    ["watch", 1],
    ["ok", 2],
  ]);

  return toTradeHistoryRows(records)
    .map((row) => ({
      ...row,
      ...getDashboardAttentionMeta(row),
    }))
    .sort((left, right) => {
      const priorityDiff =
        (priority.get(left.attentionState) ?? 99) -
        (priority.get(right.attentionState) ?? 99);
      if (priorityDiff !== 0) {
        return priorityDiff;
      }

      return right.timestamp.localeCompare(left.timestamp);
    })
    .slice(0, limit);
}

export function buildDashboardExecutionAttentionCards(
  records: TradeHistoryApiRecord[],
): DashboardExecutionAttentionCard[] {
  const failedCount = records.filter((record) =>
    FAILED_STATUSES.has(record.lifecycleStatus),
  ).length;
  const partialCount = records.filter(
    (record) => record.lifecycleStatus === "PARTIALLY_FILLED",
  ).length;
  const acknowledgedCount = records.filter(
    (record) => record.lifecycleStatus === "ACKNOWLEDGED",
  ).length;

  return [
    {
      label: "Failed",
      value: String(failedCount),
      tone: failedCount > 0 ? "alert" : "ok",
      detail:
        failedCount > 0
          ? `${failedCount} execution${failedCount === 1 ? "" : "s"} need review`
          : "No failed executions",
    },
    {
      label: "Partial",
      value: String(partialCount),
      tone: partialCount > 0 ? "watch" : "ok",
      detail:
        partialCount > 0
          ? `${partialCount} order${partialCount === 1 ? "" : "s"} still need remaining fills`
          : "No partial fills waiting",
    },
    {
      label: "Acknowledged",
      value: String(acknowledgedCount),
      tone: acknowledgedCount > 0 ? "watch" : "ok",
      detail:
        acknowledgedCount > 0
          ? `${acknowledgedCount} broker acknowledgement${acknowledgedCount === 1 ? "" : "s"} still waiting on fills`
          : "No acknowledged orders waiting",
    },
  ];
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
          ? "QUEUED,SENT,ACKNOWLEDGED,INTENT_CREATED,PARTIALLY_FILLED"
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
