import type { Account } from "@shared/schema";

import type { AccountBalanceLiveMetrics } from "./account-live-metrics";
import type { AccountLiveMetrics } from "./positions";
import type { AccountSessionStatusView } from "./account-session-status";

export interface AccountRuntimeViewModel {
  account: Account;
  savedBalance: number;
  balance: number;
  pnl: number;
  openPositions: number;
  hasLivePositionData: boolean;
  hasLiveBalance: boolean;
  hasLiveBrokerData: boolean;
  liveBrokerStatus: "LIVE" | "DISCONNECTED" | "UNAVAILABLE" | "ERROR" | "NONE";
  liveBrokerReason?: string;
  sessionStatus: AccountSessionStatusView;
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export function prepareAccountRuntimeViewModels(input: {
  accounts: Account[];
  positionMetricsById: Record<string, AccountLiveMetrics | undefined>;
  balanceMetricsById: Record<string, AccountBalanceLiveMetrics | undefined>;
  getSessionStatus: (account: Account) => AccountSessionStatusView;
}): AccountRuntimeViewModel[] {
  return input.accounts.map((account) => {
    const positionMetrics = input.positionMetricsById[account.id];
    const balanceMetrics = input.balanceMetricsById[account.id];
    const savedBalance = toNumber(account.balance);
    const savedPnl = toNumber(account.pnl);
    const savedOpenPositions = account.openPositions ?? 0;
    const hasLivePositionData = positionMetrics?.hasLiveBrokerData ?? false;
    const hasLiveBalance = balanceMetrics?.hasLiveBrokerData ?? false;
    const hasLiveBrokerData = hasLivePositionData || hasLiveBalance;

    return {
      account,
      savedBalance,
      balance: hasLiveBalance ? (balanceMetrics?.balance ?? savedBalance) : savedBalance,
      pnl: hasLivePositionData ? (positionMetrics?.unrealizedPnl ?? savedPnl) : savedPnl,
      openPositions: hasLivePositionData
        ? (positionMetrics?.openPositions ?? savedOpenPositions)
        : savedOpenPositions,
      hasLivePositionData,
      hasLiveBalance,
      hasLiveBrokerData,
      liveBrokerStatus:
        positionMetrics && positionMetrics.status !== "NONE"
          ? positionMetrics.status
          : balanceMetrics?.status ?? "NONE",
      liveBrokerReason: positionMetrics?.reason ?? balanceMetrics?.reason,
      sessionStatus: input.getSessionStatus(account),
    };
  });
}
