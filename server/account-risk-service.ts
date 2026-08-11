import type { Account } from "@shared/schema";

import type { AccountLiveSnapshot } from "./account-live-metrics-service";
import type { AccountPositionSnapshot } from "./position-snapshot-service";

export type AccountRiskSeverity = "OK" | "WARN" | "BREACHED" | "UNAVAILABLE";

export type AccountRiskRuleCode =
  | "MAX_DAILY_LOSS"
  | "MAX_DAILY_LOSS_PCT"
  | "MIN_ACCOUNT_BALANCE"
  | "MAX_OPEN_POSITIONS";

export interface AccountRiskRuleEvaluation {
  code: AccountRiskRuleCode;
  label: string;
  status: AccountRiskSeverity;
  value: number | null;
  limit: number | null;
  message: string;
}

export interface AccountRiskEvaluation {
  accountId: string;
  userId: string;
  name: string;
  platform: string;
  accountType: string;
  status: AccountRiskSeverity;
  action: string;
  breachCount: number;
  warningCount: number;
  rules: AccountRiskRuleEvaluation[];
}

export interface AccountRiskOverviewSummary {
  totalAccounts: number;
  breachedAccounts: number;
  warningAccounts: number;
  unavailableAccounts: number;
  safeAccounts: number;
}

export interface AccountRiskOverviewResult {
  generatedAt: string;
  summary: AccountRiskOverviewSummary;
  accounts: AccountRiskEvaluation[];
}

function toNumber(value: string | number | null | undefined): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function createUnavailableRule(
  code: AccountRiskRuleCode,
  label: string,
  limit: number | null,
): AccountRiskRuleEvaluation {
  return {
    code,
    label,
    status: "UNAVAILABLE",
    value: null,
    limit,
    message: "Waiting for enough runtime data to evaluate this rule.",
  };
}

function evaluateThresholdRule(input: {
  code: AccountRiskRuleCode;
  label: string;
  value: number | null;
  limit: number | null;
  comparator?: "max" | "min";
  warningThresholdRatio?: number;
  valueLabel: string;
}): AccountRiskRuleEvaluation | null {
  const comparator = input.comparator ?? "max";
  const warningThresholdRatio = input.warningThresholdRatio ?? 0.8;

  if (input.limit == null) {
    return null;
  }

  if (input.value == null) {
    return createUnavailableRule(input.code, input.label, input.limit);
  }

  const breached =
    comparator === "max" ? input.value >= input.limit : input.value <= input.limit;
  const warning =
    !breached &&
    (comparator === "max"
      ? input.value >= input.limit * warningThresholdRatio
      : input.value <= input.limit / warningThresholdRatio);

  return {
    code: input.code,
    label: input.label,
    status: breached ? "BREACHED" : warning ? "WARN" : "OK",
    value: input.value,
    limit: input.limit,
    message: breached
      ? `${input.valueLabel} ${input.value} breached the limit of ${input.limit}.`
      : warning
        ? `${input.valueLabel} ${input.value} is approaching the limit of ${input.limit}.`
        : `${input.valueLabel} ${input.value} is within the limit of ${input.limit}.`,
  };
}

export function evaluateAccountRisk(input: {
  account: Account;
  liveAccount?: AccountLiveSnapshot;
  positionSnapshot?: AccountPositionSnapshot;
}): AccountRiskEvaluation {
  const balance =
    toNumber(input.liveAccount?.balance) ??
    toNumber(input.account.balance);
  const pnl = toNumber(input.account.pnl);
  const openPositions =
    input.positionSnapshot?.openPositionCount ??
    input.account.openPositions ??
    0;

  const dailyLossValue = pnl != null && pnl < 0 ? Math.abs(pnl) : 0;
  const dailyLossPctValue =
    dailyLossValue > 0 && balance != null && balance > 0
      ? (dailyLossValue / balance) * 100
      : 0;

  const rules = [
    evaluateThresholdRule({
      code: "MAX_DAILY_LOSS",
      label: "Daily loss",
      value: dailyLossValue,
      limit: toNumber(input.account.maxDailyLoss),
      valueLabel: "Daily loss",
    }),
    evaluateThresholdRule({
      code: "MAX_DAILY_LOSS_PCT",
      label: "Daily loss %",
      value: dailyLossPctValue,
      limit: toNumber(input.account.maxDailyLossPct),
      valueLabel: "Daily loss %",
    }),
    evaluateThresholdRule({
      code: "MIN_ACCOUNT_BALANCE",
      label: "Minimum account balance",
      value: balance,
      limit: toNumber(input.account.minAccountBalance),
      comparator: "min",
      valueLabel: "Balance",
    }),
    evaluateThresholdRule({
      code: "MAX_OPEN_POSITIONS",
      label: "Open positions",
      value: openPositions,
      limit: toNumber(input.account.maxOpenPositions),
      valueLabel: "Open positions",
    }),
  ].filter((rule): rule is AccountRiskRuleEvaluation => rule !== null);

  const breachCount = rules.filter((rule) => rule.status === "BREACHED").length;
  const warningCount = rules.filter((rule) => rule.status === "WARN").length;
  const unavailableCount = rules.filter((rule) => rule.status === "UNAVAILABLE").length;

  const status: AccountRiskSeverity =
    breachCount > 0
      ? "BREACHED"
      : warningCount > 0
        ? "WARN"
        : rules.length > 0 && unavailableCount === rules.length
          ? "UNAVAILABLE"
          : "OK";

  return {
    accountId: input.account.id,
    userId: input.account.userId,
    name: input.account.name,
    platform: input.account.platform,
    accountType: input.account.accountType,
    status,
    action: input.account.onBreachAction ?? "pause",
    breachCount,
    warningCount,
    rules,
  };
}

export function buildAccountRiskOverview(input: {
  accounts: Account[];
  liveAccounts: AccountLiveSnapshot[];
  positionSnapshots: AccountPositionSnapshot[];
}): AccountRiskOverviewResult {
  const liveAccountsById = new Map(
    input.liveAccounts.map((account) => [account.accountId, account]),
  );
  const positionSnapshotsById = new Map(
    input.positionSnapshots.map((account) => [account.accountId, account]),
  );

  const accounts = input.accounts.map((account) =>
    evaluateAccountRisk({
      account,
      liveAccount: liveAccountsById.get(account.id),
      positionSnapshot: positionSnapshotsById.get(account.id),
    }),
  );

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalAccounts: accounts.length,
      breachedAccounts: accounts.filter((account) => account.status === "BREACHED").length,
      warningAccounts: accounts.filter((account) => account.status === "WARN").length,
      unavailableAccounts: accounts.filter((account) => account.status === "UNAVAILABLE").length,
      safeAccounts: accounts.filter((account) => account.status === "OK").length,
    },
    accounts,
  };
}
