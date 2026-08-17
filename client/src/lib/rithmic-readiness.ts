import type { Account } from "@shared/schema";

export interface RithmicAccountReadiness {
  accountId: string;
  accountName: string;
  status: "ready" | "action_required";
  ready: boolean;
  environment: "test" | "live";
  systemName: string;
  hasExplicitSystemName: boolean;
  exchange: string | null;
  savedBrokerUsername: string | null;
  hasSavedCredentials: boolean;
  hasSavedAccountId: boolean;
  sessionActive: boolean;
  reconnectValidated: boolean;
  reconnectValidation?: {
    validatedAt: string;
    source: "saved_connect";
  };
  loginMetadata?: {
    uniqueUserId: string;
    fcmId: string;
    ibId: string;
    timestamp: string;
    timezone: string;
  };
  blockers: string[];
}

export interface RithmicReadinessResponse {
  success: boolean;
  readiness: RithmicAccountReadiness;
}

export interface RithmicReadinessListResponse {
  success: boolean;
  accounts: RithmicReadinessResponse[];
}

export interface RithmicReadinessSummary {
  total: number;
  readyCount: number;
  actionRequiredCount: number;
  connectedSessionCount: number;
  offlineSessionCount: number;
  missingMetadataCount: number;
  reconnectValidatedCount: number;
  needsReconnectProofCount: number;
}

export interface RithmicReadinessViewItem {
  accountId: string;
  accountName: string;
  environment: "test" | "live";
  environmentLabel: string;
  exchange: string | null;
  exchangeLabel: string;
  systemName: string;
  ready: boolean;
  sessionActive: boolean;
  reconnectValidated: boolean;
  reconnectValidation?: {
    validatedAt: string;
    source: "saved_connect";
  };
  blockers: string[];
  statusLabel: string;
  sessionLabel: string;
  reconnectLabel: string;
  reconnectBadgeLabel: string;
  reconnectBadgeTone: "ok" | "warn";
  blockerPreview: string[];
}

export function getRithmicAccounts(accounts: Account[]): Account[] {
  return accounts.filter((account) => account.platform === "Rithmic");
}

export function summarizeRithmicReadiness(
  readinessItems: RithmicAccountReadiness[],
): RithmicReadinessSummary {
  return readinessItems.reduce<RithmicReadinessSummary>(
    (summary, item) => ({
      total: summary.total + 1,
      readyCount: summary.readyCount + (item.ready ? 1 : 0),
      actionRequiredCount: summary.actionRequiredCount + (item.ready ? 0 : 1),
      connectedSessionCount: summary.connectedSessionCount + (item.sessionActive ? 1 : 0),
      offlineSessionCount: summary.offlineSessionCount + (item.sessionActive ? 0 : 1),
      missingMetadataCount:
        summary.missingMetadataCount + (item.loginMetadata ? 0 : 1),
      reconnectValidatedCount:
        summary.reconnectValidatedCount + (item.reconnectValidated ? 1 : 0),
      needsReconnectProofCount:
        summary.needsReconnectProofCount + (item.reconnectValidated ? 0 : 1),
    }),
    {
      total: 0,
      readyCount: 0,
      actionRequiredCount: 0,
      connectedSessionCount: 0,
      offlineSessionCount: 0,
      missingMetadataCount: 0,
      reconnectValidatedCount: 0,
      needsReconnectProofCount: 0,
    },
  );
}

function formatReconnectValidationLabel(timestamp?: string): string | null {
  if (!timestamp) {
    return null;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleString();
}

export function buildRithmicReadinessViewItems(
  readinessItems: RithmicAccountReadiness[],
): RithmicReadinessViewItem[] {
  return [...readinessItems]
    .sort((left, right) => {
      const leftPriority =
        (!left.ready ? 4 : 0) +
        (!left.reconnectValidated ? 2 : 0) +
        (!left.sessionActive ? 1 : 0);
      const rightPriority =
        (!right.ready ? 4 : 0) +
        (!right.reconnectValidated ? 2 : 0) +
        (!right.sessionActive ? 1 : 0);

      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }

      return left.accountName.localeCompare(right.accountName);
    })
    .map((item) => {
      const reconnectValidatedAt = formatReconnectValidationLabel(
        item.reconnectValidation?.validatedAt,
      );
      const statusLabel = item.ready
        ? "Ready"
        : !item.reconnectValidated
          ? "Reconnect proof needed"
          : "Review";

      return {
        accountId: item.accountId,
        accountName: item.accountName,
        environment: item.environment,
        environmentLabel: item.environment.toUpperCase(),
        exchange: item.exchange,
        exchangeLabel: item.exchange ?? "Exchange missing",
        systemName: item.systemName,
        ready: item.ready,
        sessionActive: item.sessionActive,
        reconnectValidated: item.reconnectValidated,
        reconnectValidation: item.reconnectValidation,
        blockers: item.blockers,
        statusLabel,
        sessionLabel: item.sessionActive
          ? "Session active and available for readiness checks."
          : "Session offline. Reconnect this account to capture fresh login evidence.",
        reconnectLabel: item.reconnectValidated
          ? reconnectValidatedAt
            ? `Reconnect proof captured ${reconnectValidatedAt}.`
            : "Reconnect proof captured on this server run."
          : "Reconnect proof missing on this server run.",
        reconnectBadgeLabel: item.reconnectValidated
          ? "Reconnect proof captured"
          : "Reconnect proof needed",
        reconnectBadgeTone: item.reconnectValidated ? "ok" : "warn",
        blockerPreview: item.blockers.slice(0, 2),
      };
    });
}

export function getRithmicReadinessBannerToneClass(actionRequiredCount: number): string {
  return actionRequiredCount === 0
    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
    : "border-amber-400/30 bg-amber-400/10 text-amber-100";
}

export function getRithmicReadinessBannerLabel(summary: {
  total: number;
  readyCount: number;
  actionRequiredCount: number;
}): string {
  if (summary.total === 0) {
    return "No Rithmic accounts saved";
  }

  if (summary.actionRequiredCount === 0) {
    return "Rithmic accounts are ready";
  }

  return `${summary.readyCount}/${summary.total} Rithmic accounts ready`;
}
