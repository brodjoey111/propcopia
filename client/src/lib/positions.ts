export interface PositionSnapshotPosition {
  symbol: string;
  quantity: number;
  averagePrice?: number;
  side: "LONG" | "SHORT" | "FLAT";
  unrealizedPnl?: number;
}

export interface AccountPositionSnapshot {
  accountId: string;
  userId: string;
  name: string;
  platform: string;
  accountType: string;
  brokerAccountId?: string;
  status: "LIVE" | "DISCONNECTED" | "UNAVAILABLE" | "ERROR";
  reason?: string;
  positions: PositionSnapshotPosition[];
  openPositionCount: number;
  capturedAt: string;
}

export interface PositionSnapshotResponse {
  success: boolean;
  generatedAt: string;
  summary: {
    totalAccounts: number;
    liveAccounts: number;
    disconnectedAccounts: number;
    unavailableAccounts: number;
    errorAccounts: number;
    totalOpenPositions: number;
  };
  accounts: AccountPositionSnapshot[];
}

export interface DashboardPositionRow {
  symbol: string;
  side: "Long" | "Short" | "Flat";
  size: number;
  avg: string;
  account: string;
  pnl: number;
}

export interface AccountLiveMetrics {
  hasLiveBrokerData: boolean;
  status: "LIVE" | "DISCONNECTED" | "UNAVAILABLE" | "ERROR" | "NONE";
  reason?: string;
  openPositions: number;
  unrealizedPnl: number;
}

function formatPrice(value?: number): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "-";
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function toDashboardPositionRows(
  accounts: AccountPositionSnapshot[],
): DashboardPositionRow[] {
  return accounts
    .filter((account) => account.status === "LIVE")
    .flatMap((account) =>
      account.positions
        .filter((position) => position.quantity !== 0)
        .map((position): DashboardPositionRow => {
          const side: DashboardPositionRow["side"] =
            position.side === "LONG"
              ? "Long"
              : position.side === "SHORT"
                ? "Short"
                : "Flat";

          return {
            symbol: position.symbol,
            side,
            size: Math.abs(position.quantity),
            avg: formatPrice(position.averagePrice),
            account: account.name,
            pnl: position.unrealizedPnl ?? 0,
          };
        }),
    )
    .sort((left, right) => Math.abs(right.pnl) - Math.abs(left.pnl));
}

export function buildAccountLiveMetricsById(
  accounts: AccountPositionSnapshot[],
): Record<string, AccountLiveMetrics> {
  return Object.fromEntries(
    accounts.map((account) => [
      account.accountId,
      {
        hasLiveBrokerData: account.status === "LIVE",
        status: account.status,
        reason: account.reason,
        openPositions: account.openPositionCount,
        unrealizedPnl: account.positions.reduce(
          (sum, position) => sum + (position.unrealizedPnl ?? 0),
          0,
        ),
      } satisfies AccountLiveMetrics,
    ]),
  );
}
