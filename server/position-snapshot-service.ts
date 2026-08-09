import type { Account } from "@shared/schema";

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

export interface PositionSnapshotSummary {
  totalAccounts: number;
  liveAccounts: number;
  disconnectedAccounts: number;
  unavailableAccounts: number;
  errorAccounts: number;
  totalOpenPositions: number;
}

export interface PositionSnapshotResult {
  generatedAt: string;
  summary: PositionSnapshotSummary;
  accounts: AccountPositionSnapshot[];
}

export interface TradovatePositionsApiLike {
  isTokenValid(): boolean;
  getPositions(): Promise<unknown[]>;
}

export interface TradeifyPositionsApiLike {
  getPositions(accountId: string): Promise<unknown[]>;
}

export interface PositionSnapshotDependencies {
  tradovateInstances: Map<string, TradovatePositionsApiLike>;
  tradeifyInstances: Map<string, TradeifyPositionsApiLike>;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function deriveSide(quantity: number, explicitSide?: unknown): "LONG" | "SHORT" | "FLAT" {
  const normalizedExplicit = toStringValue(explicitSide)?.toUpperCase();
  if (
    normalizedExplicit === "LONG" ||
    normalizedExplicit === "SHORT" ||
    normalizedExplicit === "FLAT"
  ) {
    return normalizedExplicit;
  }

  if (quantity > 0) {
    return "LONG";
  }

  if (quantity < 0) {
    return "SHORT";
  }

  return "FLAT";
}

function normalizeTradovatePositions(positions: unknown[]): PositionSnapshotPosition[] {
  return positions
    .map((position): PositionSnapshotPosition | undefined => {
      const record = position as Record<string, unknown>;
      const symbol = toStringValue(record.symbol);
      const quantity = toNumber(record.quantity) ?? toNumber(record.netPos) ?? 0;

      if (!symbol) {
        return undefined;
      }

      return {
        symbol,
        quantity,
        averagePrice: toNumber(record.averagePrice) ?? toNumber(record.avgPrice),
        side: deriveSide(quantity, record.side),
        unrealizedPnl: toNumber(record.unrealizedPnl) ?? toNumber(record.openPnl),
      };
    })
    .filter((position): position is PositionSnapshotPosition => position !== undefined);
}

function normalizeTradeifyPositions(positions: unknown[]): PositionSnapshotPosition[] {
  return positions
    .map((position): PositionSnapshotPosition | undefined => {
      const record = position as Record<string, unknown>;
      const symbol = toStringValue(record.symbol);
      const quantity = toNumber(record.quantity) ?? 0;

      if (!symbol) {
        return undefined;
      }

      return {
        symbol,
        quantity,
        averagePrice: toNumber(record.entryPrice),
        side: deriveSide(quantity),
        unrealizedPnl: toNumber(record.unrealizedPnL),
      };
    })
    .filter((position): position is PositionSnapshotPosition => position !== undefined);
}

async function buildTradovateSnapshot(
  account: Account,
  dependencies: PositionSnapshotDependencies,
  capturedAt: string,
): Promise<AccountPositionSnapshot> {
  const username = account.tradovateUsername?.trim();
  if (!username) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId: account.tradovateAccountId ?? undefined,
      status: "UNAVAILABLE",
      reason: "Tradovate username is missing.",
      positions: [],
      openPositionCount: 0,
      capturedAt,
    };
  }

  const api = dependencies.tradovateInstances.get(username);
  if (!api) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId: account.tradovateAccountId ?? undefined,
      status: "DISCONNECTED",
      reason: "Tradovate session is not active.",
      positions: [],
      openPositionCount: 0,
      capturedAt,
    };
  }

  if (!api.isTokenValid()) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId: account.tradovateAccountId ?? undefined,
      status: "DISCONNECTED",
      reason: "Tradovate token expired.",
      positions: [],
      openPositionCount: 0,
      capturedAt,
    };
  }

  try {
    const rawPositions = await api.getPositions();
    const scopedRawPositions = account.tradovateAccountId
      ? rawPositions.filter((position) => {
          const record = position as Record<string, unknown>;
          return toStringValue(record.accountId) === account.tradovateAccountId;
        })
      : rawPositions;
    const positions = normalizeTradovatePositions(scopedRawPositions);

    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId: account.tradovateAccountId ?? undefined,
      status: "LIVE",
      positions,
      openPositionCount: positions.filter((position) => position.quantity !== 0).length,
      capturedAt,
    };
  } catch (error) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId: account.tradovateAccountId ?? undefined,
      status: "ERROR",
      reason: error instanceof Error ? error.message : "Failed to load Tradovate positions.",
      positions: [],
      openPositionCount: 0,
      capturedAt,
    };
  }
}

async function buildTradeifySnapshot(
  account: Account,
  dependencies: PositionSnapshotDependencies,
  capturedAt: string,
): Promise<AccountPositionSnapshot> {
  const username = account.tradeifyUsername?.trim();
  const brokerAccountId = account.tradeifyAccountId?.trim();

  if (!username || !brokerAccountId) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId: brokerAccountId || undefined,
      status: "UNAVAILABLE",
      reason: "Tradeify account details are incomplete.",
      positions: [],
      openPositionCount: 0,
      capturedAt,
    };
  }

  const api = dependencies.tradeifyInstances.get(username);
  if (!api) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId,
      status: "DISCONNECTED",
      reason: "Tradeify session is not active.",
      positions: [],
      openPositionCount: 0,
      capturedAt,
    };
  }

  try {
    const positions = normalizeTradeifyPositions(await api.getPositions(brokerAccountId));
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId,
      status: "LIVE",
      positions,
      openPositionCount: positions.filter((position) => position.quantity !== 0).length,
      capturedAt,
    };
  } catch (error) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId,
      status: "ERROR",
      reason: error instanceof Error ? error.message : "Failed to load Tradeify positions.",
      positions: [],
      openPositionCount: 0,
      capturedAt,
    };
  }
}

function buildUnavailableSnapshot(
  account: Account,
  capturedAt: string,
  reason: string,
): AccountPositionSnapshot {
  return {
    accountId: account.id,
    userId: account.userId,
    name: account.name,
    platform: account.platform,
    accountType: account.accountType,
    brokerAccountId:
      account.rithmicAccountId ??
      account.tradovateAccountId ??
      account.tradeifyAccountId ??
      undefined,
    status: "UNAVAILABLE",
    reason,
    positions: [],
    openPositionCount: 0,
    capturedAt,
  };
}

async function buildSnapshotForAccount(
  account: Account,
  dependencies: PositionSnapshotDependencies,
  capturedAt: string,
): Promise<AccountPositionSnapshot> {
  if (account.platform === "Tradovate") {
    return buildTradovateSnapshot(account, dependencies, capturedAt);
  }

  if (account.platform === "Tradeify") {
    return buildTradeifySnapshot(account, dependencies, capturedAt);
  }

  if (account.platform === "Rithmic") {
    return buildUnavailableSnapshot(
      account,
      capturedAt,
      "Rithmic position snapshots are not implemented yet.",
    );
  }

  return buildUnavailableSnapshot(
    account,
    capturedAt,
    `Position snapshots are not supported for platform ${account.platform}.`,
  );
}

export async function buildPositionSnapshots(
  accounts: Account[],
  dependencies: PositionSnapshotDependencies,
): Promise<PositionSnapshotResult> {
  const generatedAt = new Date().toISOString();
  const accountSnapshots = await Promise.all(
    accounts.map((account) => buildSnapshotForAccount(account, dependencies, generatedAt)),
  );

  return {
    generatedAt,
    summary: {
      totalAccounts: accountSnapshots.length,
      liveAccounts: accountSnapshots.filter((account) => account.status === "LIVE").length,
      disconnectedAccounts: accountSnapshots.filter((account) => account.status === "DISCONNECTED").length,
      unavailableAccounts: accountSnapshots.filter((account) => account.status === "UNAVAILABLE").length,
      errorAccounts: accountSnapshots.filter((account) => account.status === "ERROR").length,
      totalOpenPositions: accountSnapshots.reduce(
        (sum, account) => sum + account.openPositionCount,
        0,
      ),
    },
    accounts: accountSnapshots,
  };
}
