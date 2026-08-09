import type { Account } from "@shared/schema";

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

export interface AccountLiveMetricsSummary {
  totalAccounts: number;
  liveAccounts: number;
  disconnectedAccounts: number;
  unavailableAccounts: number;
  errorAccounts: number;
  liveBalanceAccounts: number;
  totalLiveBalance: number;
}

export interface AccountLiveMetricsResult {
  generatedAt: string;
  summary: AccountLiveMetricsSummary;
  accounts: AccountLiveSnapshot[];
}

export interface TradovateAccountMetricsApiLike {
  isTokenValid(): boolean;
  getAccountInfo(): Promise<unknown[]>;
}

export interface TradeifyAccountMetricsApiLike {
  getAccounts(): Promise<unknown[]>;
}

export interface RithmicAccountMetricsApiLike {
  testConnection(): Promise<{
    success: boolean;
    message: string;
    data?: unknown[];
  }>;
}

export interface AccountLiveMetricsDependencies {
  tradovateInstances: Map<string, TradovateAccountMetricsApiLike>;
  tradeifyInstances: Map<string, TradeifyAccountMetricsApiLike>;
  rithmicInstances: Map<string, RithmicAccountMetricsApiLike>;
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

function normalizeId(value: string | undefined): string | undefined {
  return value?.trim().toLowerCase();
}

function matchesSavedAccount(
  record: Record<string, unknown>,
  candidates: Array<string | null | undefined>,
  names: Array<string | null | undefined>,
): boolean {
  const recordIds = [
    toStringValue(record.id),
    toStringValue(record.accountId),
    toStringValue(record.accountNumber),
    toStringValue(record.accountSpec),
  ]
    .map(normalizeId)
    .filter((value): value is string => value !== undefined);

  const candidateIds = candidates
    .map((value) => normalizeId(value ?? undefined))
    .filter((value): value is string => value !== undefined);

  if (candidateIds.some((candidate) => recordIds.includes(candidate))) {
    return true;
  }

  const recordNames = [
    toStringValue(record.name),
    toStringValue(record.accountName),
    toStringValue(record.nickname),
  ]
    .map(normalizeId)
    .filter((value): value is string => value !== undefined);

  const candidateNames = names
    .map((value) => normalizeId(value ?? undefined))
    .filter((value): value is string => value !== undefined);

  return candidateNames.some((candidate) => recordNames.includes(candidate));
}

async function buildTradovateSnapshot(
  account: Account,
  dependencies: AccountLiveMetricsDependencies,
  capturedAt: string,
): Promise<AccountLiveSnapshot> {
  const username = account.tradovateUsername?.trim();
  const brokerAccountId = account.tradovateAccountId?.trim();

  if (!username) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId,
      status: "UNAVAILABLE",
      reason: "Tradovate username is missing.",
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
      brokerAccountId,
      status: "DISCONNECTED",
      reason: "Tradovate session is not active.",
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
      brokerAccountId,
      status: "DISCONNECTED",
      reason: "Tradovate token expired.",
      capturedAt,
    };
  }

  try {
    const rawAccounts = await api.getAccountInfo();
    const matchedAccount = rawAccounts.find((entry) =>
      matchesSavedAccount(entry as Record<string, unknown>, [brokerAccountId], [account.name]),
    );

    if (!matchedAccount) {
      return {
        accountId: account.id,
        userId: account.userId,
        name: account.name,
        platform: account.platform,
        accountType: account.accountType,
        brokerAccountId,
        status: "UNAVAILABLE",
        reason: "Tradovate account was not found in the active broker session.",
        capturedAt,
      };
    }

    const record = matchedAccount as Record<string, unknown>;

    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId:
        toStringValue(record.accountId) ??
        toStringValue(record.id) ??
        toStringValue(record.accountSpec) ??
        brokerAccountId,
      status: "LIVE",
      balance:
        toNumber(record.balance) ??
        toNumber(record.cashBalance) ??
        toNumber(record.netLiq) ??
        toNumber(record.netLiquidation),
      equity: toNumber(record.netLiq) ?? toNumber(record.netLiquidation),
      currency: toStringValue(record.currency) ?? "USD",
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
      reason: error instanceof Error ? error.message : "Failed to load Tradovate account metrics.",
      capturedAt,
    };
  }
}

async function buildTradeifySnapshot(
  account: Account,
  dependencies: AccountLiveMetricsDependencies,
  capturedAt: string,
): Promise<AccountLiveSnapshot> {
  const username = account.tradeifyUsername?.trim();
  const brokerAccountId = account.tradeifyAccountId?.trim();

  if (!username || !brokerAccountId) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId,
      status: "UNAVAILABLE",
      reason: "Tradeify username or account id is missing.",
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
      capturedAt,
    };
  }

  try {
    const rawAccounts = await api.getAccounts();
    const matchedAccount = rawAccounts.find((entry) =>
      matchesSavedAccount(entry as Record<string, unknown>, [brokerAccountId], [account.name]),
    );

    if (!matchedAccount) {
      return {
        accountId: account.id,
        userId: account.userId,
        name: account.name,
        platform: account.platform,
        accountType: account.accountType,
        brokerAccountId,
        status: "UNAVAILABLE",
        reason: "Tradeify account was not found in the active broker session.",
        capturedAt,
      };
    }

    const record = matchedAccount as Record<string, unknown>;

    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId:
        toStringValue(record.accountId) ??
        toStringValue(record.accountNumber) ??
        toStringValue(record.id) ??
        brokerAccountId,
      status: "LIVE",
      balance: toNumber(record.balance) ?? toNumber(record.netLiquidation),
      equity: toNumber(record.equity) ?? toNumber(record.netLiquidation),
      currency: toStringValue(record.currency) ?? "USD",
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
      reason: error instanceof Error ? error.message : "Failed to load Tradeify account metrics.",
      capturedAt,
    };
  }
}

async function buildRithmicSnapshot(
  account: Account,
  dependencies: AccountLiveMetricsDependencies,
  capturedAt: string,
): Promise<AccountLiveSnapshot> {
  const username = account.rithmicUsername?.trim();
  const brokerAccountId = account.rithmicAccountId?.trim();

  if (!username || !brokerAccountId) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId,
      status: "UNAVAILABLE",
      reason: "Rithmic username or account id is missing.",
      capturedAt,
    };
  }

  const api = dependencies.rithmicInstances.get(username);
  if (!api) {
    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId,
      status: "DISCONNECTED",
      reason: "Rithmic session is not active.",
      capturedAt,
    };
  }

  try {
    const connectionTest = await api.testConnection();

    if (!connectionTest.success) {
      return {
        accountId: account.id,
        userId: account.userId,
        name: account.name,
        platform: account.platform,
        accountType: account.accountType,
        brokerAccountId,
        status: "ERROR",
        reason: connectionTest.message || "Failed to verify Rithmic session.",
        capturedAt,
      };
    }

    const matchedAccount = (connectionTest.data ?? []).find((entry) =>
      matchesSavedAccount(entry as Record<string, unknown>, [brokerAccountId], [account.name]),
    );

    if (!matchedAccount) {
      return {
        accountId: account.id,
        userId: account.userId,
        name: account.name,
        platform: account.platform,
        accountType: account.accountType,
        brokerAccountId,
        status: "UNAVAILABLE",
        reason: "Rithmic account was not found in the active broker session.",
        capturedAt,
      };
    }

    const record = matchedAccount as Record<string, unknown>;

    return {
      accountId: account.id,
      userId: account.userId,
      name: account.name,
      platform: account.platform,
      accountType: account.accountType,
      brokerAccountId:
        toStringValue(record.id) ??
        toStringValue(record.accountId) ??
        brokerAccountId,
      status: "LIVE",
      balance: toNumber(record.balance),
      equity: toNumber(record.balance),
      currency: toStringValue(record.currency) ?? "USD",
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
      reason: error instanceof Error ? error.message : "Failed to load Rithmic account metrics.",
      capturedAt,
    };
  }
}

async function buildSnapshotForAccount(
  account: Account,
  dependencies: AccountLiveMetricsDependencies,
  capturedAt: string,
): Promise<AccountLiveSnapshot> {
  if (account.platform === "Tradovate") {
    return buildTradovateSnapshot(account, dependencies, capturedAt);
  }

  if (account.platform === "Tradeify") {
    return buildTradeifySnapshot(account, dependencies, capturedAt);
  }

  if (account.platform === "Rithmic") {
    return buildRithmicSnapshot(account, dependencies, capturedAt);
  }

  return {
    accountId: account.id,
    userId: account.userId,
    name: account.name,
    platform: account.platform,
    accountType: account.accountType,
    status: "UNAVAILABLE",
    reason: `Live account metrics are not supported for platform ${account.platform}.`,
    capturedAt,
  };
}

export async function buildAccountLiveMetrics(
  userAccounts: Account[],
  dependencies: AccountLiveMetricsDependencies,
): Promise<AccountLiveMetricsResult> {
  const capturedAt = new Date().toISOString();
  const accounts = await Promise.all(
    userAccounts.map((account) => buildSnapshotForAccount(account, dependencies, capturedAt)),
  );

  return {
    generatedAt: capturedAt,
    summary: {
      totalAccounts: accounts.length,
      liveAccounts: accounts.filter((account) => account.status === "LIVE").length,
      disconnectedAccounts: accounts.filter((account) => account.status === "DISCONNECTED").length,
      unavailableAccounts: accounts.filter((account) => account.status === "UNAVAILABLE").length,
      errorAccounts: accounts.filter((account) => account.status === "ERROR").length,
      liveBalanceAccounts: accounts.filter((account) => account.balance !== undefined).length,
      totalLiveBalance: accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0),
    },
    accounts,
  };
}
