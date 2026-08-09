export interface AccountLiveSnapshot {
  accountId: string;
  userId: string;
  name: string;
  platform: string;
  accountType: string;
  brokerAccountId?: string;
  status: "LIVE" | "DISCONNECTED" | "UNAVAILABLE" | "ERROR";
  reason?: string;
  balance?: number;
  equity?: number;
  currency?: string;
  capturedAt: string;
}

export interface AccountLiveMetricsResponse {
  success: boolean;
  generatedAt: string;
  summary: {
    totalAccounts: number;
    liveAccounts: number;
    disconnectedAccounts: number;
    unavailableAccounts: number;
    errorAccounts: number;
    liveBalanceAccounts: number;
    totalLiveBalance: number;
  };
  accounts: AccountLiveSnapshot[];
}

export interface AccountBalanceLiveMetrics {
  hasLiveBrokerData: boolean;
  status: "LIVE" | "DISCONNECTED" | "UNAVAILABLE" | "ERROR" | "NONE";
  reason?: string;
  balance?: number;
  equity?: number;
  currency?: string;
}

export function buildAccountBalanceMetricsById(
  accounts: AccountLiveSnapshot[],
): Record<string, AccountBalanceLiveMetrics> {
  return Object.fromEntries(
    accounts.map((account) => [
      account.accountId,
      {
        hasLiveBrokerData: account.status === "LIVE" && account.balance !== undefined,
        status: account.status,
        reason: account.reason,
        balance: account.balance,
        equity: account.equity,
        currency: account.currency,
      } satisfies AccountBalanceLiveMetrics,
    ]),
  );
}
