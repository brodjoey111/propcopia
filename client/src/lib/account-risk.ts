export type AccountRiskStatus = "OK" | "WARN" | "BREACHED" | "UNAVAILABLE";

export interface AccountRiskRuleEvaluation {
  code: "MAX_DAILY_LOSS" | "MAX_DAILY_LOSS_PCT" | "MIN_ACCOUNT_BALANCE" | "MAX_OPEN_POSITIONS";
  label: string;
  status: AccountRiskStatus;
  value: number | null;
  limit: number | null;
  message: string;
}

export interface AccountRiskItem {
  accountId: string;
  userId: string;
  name: string;
  platform: string;
  accountType: string;
  status: AccountRiskStatus;
  action: string;
  breachCount: number;
  warningCount: number;
  rules: AccountRiskRuleEvaluation[];
}

export interface AccountRiskOverviewResponse {
  generatedAt: string;
  summary: {
    totalAccounts: number;
    breachedAccounts: number;
    warningAccounts: number;
    unavailableAccounts: number;
    safeAccounts: number;
  };
  accounts: AccountRiskItem[];
}

export interface AccountRiskBadgeView {
  label: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface GroupRiskSummaryView {
  safeCount: number;
  warningCount: number;
  breachedCount: number;
  pendingCount: number;
  blocked: boolean;
  statusLabel: string;
  tone: "ok" | "warn" | "danger" | "muted";
  topBlockingAccountNames: string[];
}

export interface GroupRiskDetailView {
  headline: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface AccountRiskFollowUpItem {
  accountId: string;
  accountName: string;
  status: AccountRiskStatus;
  headline: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
  recommendedAction: string;
}

export function buildAccountRiskById(
  accounts: AccountRiskItem[],
): Record<string, AccountRiskItem> {
  return Object.fromEntries(accounts.map((account) => [account.accountId, account]));
}

export function toAccountRiskBadgeView(
  risk: AccountRiskItem | undefined,
): AccountRiskBadgeView {
  if (!risk) {
    return {
      label: "Risk pending",
      tone: "muted",
    };
  }

  if (risk.status === "BREACHED") {
    return {
      label: `${risk.breachCount} breach${risk.breachCount === 1 ? "" : "es"}`,
      tone: "danger",
    };
  }

  if (risk.status === "WARN") {
    return {
      label: `${risk.warningCount} warning${risk.warningCount === 1 ? "" : "s"}`,
      tone: "warn",
    };
  }

  if (risk.status === "UNAVAILABLE") {
    return {
      label: "Risk pending",
      tone: "muted",
    };
  }

  return {
    label: "Risk ok",
    tone: "ok",
  };
}

export function summarizeGroupRisk(input: {
  accountIds: string[];
  accountRiskById: Record<string, AccountRiskItem | undefined>;
  disabledAccountIds?: string[];
}): GroupRiskSummaryView {
  const disabledIds = new Set(input.disabledAccountIds ?? []);
  const activeRisks = input.accountIds
    .filter((accountId) => !disabledIds.has(accountId))
    .map((accountId) => input.accountRiskById[accountId])
    .filter((risk): risk is AccountRiskItem => risk !== undefined);

  const breached = activeRisks.filter((risk) => risk.status === "BREACHED");
  const warnings = activeRisks.filter((risk) => risk.status === "WARN");
  const pending = activeRisks.filter((risk) => risk.status === "UNAVAILABLE");
  const safe = activeRisks.filter((risk) => risk.status === "OK");

  if (breached.length > 0) {
    return {
      safeCount: safe.length,
      warningCount: warnings.length,
      breachedCount: breached.length,
      pendingCount: pending.length,
      blocked: true,
      statusLabel: "Blocked from start",
      tone: "danger",
      topBlockingAccountNames: breached.slice(0, 3).map((risk) => risk.name),
    };
  }

  if (warnings.length > 0) {
    return {
      safeCount: safe.length,
      warningCount: warnings.length,
      breachedCount: 0,
      pendingCount: pending.length,
      blocked: false,
      statusLabel: `${warnings.length} warning${warnings.length === 1 ? "" : "s"}`,
      tone: "warn",
      topBlockingAccountNames: [],
    };
  }

  if (activeRisks.length === 0 || pending.length === activeRisks.length) {
    return {
      safeCount: safe.length,
      warningCount: 0,
      breachedCount: 0,
      pendingCount: pending.length,
      blocked: false,
      statusLabel: "Risk pending",
      tone: "muted",
      topBlockingAccountNames: [],
    };
  }

  return {
    safeCount: safe.length,
    warningCount: 0,
    breachedCount: 0,
    pendingCount: pending.length,
    blocked: false,
    statusLabel: "Ready to start",
    tone: "ok",
    topBlockingAccountNames: [],
  };
}

export function describeGroupRiskSummary(
  summary: GroupRiskSummaryView,
  totalActiveFollowers: number,
): GroupRiskDetailView {
  if (summary.blocked) {
    return {
      headline: "Blocked from start",
      detail: summary.topBlockingAccountNames.length > 0
        ? `${summary.topBlockingAccountNames.join(", ")} ${summary.topBlockingAccountNames.length === 1 ? "is" : "are"} over configured limits.`
        : "One or more followers are over configured limits.",
      tone: "danger",
    };
  }

  if (summary.warningCount > 0) {
    return {
      headline: "Review before start",
      detail: `${summary.warningCount} of ${Math.max(totalActiveFollowers, summary.warningCount)} follower${totalActiveFollowers === 1 ? "" : "s"} near configured limits.`,
      tone: "warn",
    };
  }

  if (summary.pendingCount > 0) {
    return {
      headline: "Risk check pending",
      detail: summary.safeCount > 0
        ? `${summary.safeCount} follower${summary.safeCount === 1 ? "" : "s"} look safe, ${summary.pendingCount} still waiting on live data.`
        : `${summary.pendingCount} follower${summary.pendingCount === 1 ? "" : "s"} still waiting on live data.`,
      tone: "muted",
    };
  }

  return {
    headline: "Ready to start",
    detail: `${summary.safeCount} follower${summary.safeCount === 1 ? "" : "s"} within configured limits.`,
    tone: "ok",
  };
}

export function buildAccountRiskFollowUpQueue(
  accounts: AccountRiskItem[],
): AccountRiskFollowUpItem[] {
  return [...accounts]
    .filter((account) => account.status !== "OK")
    .sort((left, right) => {
      const leftPriority =
        left.status === "BREACHED" ? 0 : left.status === "WARN" ? 1 : 2;
      const rightPriority =
        right.status === "BREACHED" ? 0 : right.status === "WARN" ? 1 : 2;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      if (left.breachCount !== right.breachCount) {
        return right.breachCount - left.breachCount;
      }

      if (left.warningCount !== right.warningCount) {
        return right.warningCount - left.warningCount;
      }

      return left.name.localeCompare(right.name);
    })
    .map((account) => {
      if (account.status === "BREACHED") {
        return {
          accountId: account.accountId,
          accountName: account.name,
          status: account.status,
          headline: "Risk hold active",
          detail:
            account.rules.find((rule) => rule.status === "BREACHED")?.message ??
            `${account.name} is over one or more configured limits.`,
          tone: "danger",
          recommendedAction: "Review limits and keep the account out of new copy sessions.",
        } satisfies AccountRiskFollowUpItem;
      }

      if (account.status === "WARN") {
        return {
          accountId: account.accountId,
          accountName: account.name,
          status: account.status,
          headline: "Review before next start",
          detail:
            account.rules.find((rule) => rule.status === "WARN")?.message ??
            `${account.name} is approaching a configured limit.`,
          tone: "warn",
          recommendedAction: "Confirm sizing, limits, and whether this follower should stay active.",
        } satisfies AccountRiskFollowUpItem;
      }

      return {
        accountId: account.accountId,
        accountName: account.name,
        status: account.status,
        headline: "Risk data pending",
        detail: `${account.name} is still waiting on live risk inputs.`,
        tone: "muted",
        recommendedAction: "Refresh live balances and positions before enabling new copy activity.",
      } satisfies AccountRiskFollowUpItem;
    });
}
