import type { Account } from "@shared/schema";

const NULL_FIELDS = {
  userId: "demo",
  tradovateUsername: null,
  tradovateAccountId: null,
  tradovateEnvironment: null,
  tradeifyUsername: null,
  tradeifyAccountId: null,
  tradeifyApiKey: null,
  rithmicUsername: null,
  rithmicAccountId: null,
  rithmicPassword: null,
  rithmicEnvironment: null,
  rithmicSystemName: null,
  rithmicExchange: null,
  apiKey: null,
  apiSecret: null,
  copySizingMode: "MULTIPLIER",
  fixedQuantity: null,
  reverseCopying: false,
  maxContracts: null,
  blockedTickers: null,
  maxOpenPositions: null,
  allowedDirections: null,
  maxDailyLoss: null,
  maxDailyLossPct: null,
  maxWeeklyLoss: null,
  maxWeeklyLossPct: null,
  maxDrawdownPct: null,
  maxConsecutiveLosses: null,
  allowedTickers: null,
  maxTradesPerDay: null,
  minAccountBalance: null,
  tradingStartTime: null,
  tradingEndTime: null,
  tradingDays: null,
  cooldownAfterLoss: null,
  onBreachAction: null,
  lastSync: null,
} as const;

export interface TradingGroup {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  masterId: string | null;
  disabledAccountIds: string[];
  runtimePreference?: "ready" | "paused" | "emergency_stopped";
}

export const DEMO_ACCOUNTS: Account[] = [
  {
    ...NULL_FIELDS,
    id: "demo-1",
    name: "ES Futures Master",
    platform: "Rithmic",
    accountType: "master",
    isConnected: true,
    balance: "125000.00",
    pnl: "2340.00",
    openPositions: 3,
    positionScaling: 100,
    riskMode: "custom",
  },
  {
    ...NULL_FIELDS,
    id: "demo-2",
    name: "NQ Follower Alpha",
    platform: "Tradovate",
    accountType: "follower",
    isConnected: true,
    balance: "52000.00",
    pnl: "890.00",
    openPositions: 2,
    positionScaling: 75,
    riskMode: "custom",
  },
  {
    ...NULL_FIELDS,
    id: "demo-3",
    name: "NQ Follower Beta",
    platform: "Tradovate",
    accountType: "follower",
    isConnected: false,
    balance: "48000.00",
    pnl: "-120.00",
    openPositions: 0,
    positionScaling: 50,
    riskMode: "global",
  },
  {
    ...NULL_FIELDS,
    id: "demo-4",
    name: "CL Swing Master",
    platform: "Tradeify",
    accountType: "master",
    isConnected: true,
    balance: "78500.00",
    pnl: "1650.00",
    openPositions: 1,
    positionScaling: 100,
    riskMode: "custom",
  },
  {
    ...NULL_FIELDS,
    id: "demo-5",
    name: "CL Follower A",
    platform: "Tradovate",
    accountType: "follower",
    isConnected: true,
    balance: "30000.00",
    pnl: "540.00",
    openPositions: 1,
    positionScaling: 50,
    riskMode: "global",
  },
  {
    ...NULL_FIELDS,
    id: "demo-6",
    name: "GC Scalp Follower",
    platform: "Rithmic",
    accountType: "follower",
    isConnected: false,
    balance: "25000.00",
    pnl: "0.00",
    openPositions: 0,
    positionScaling: 25,
    riskMode: "global",
  },
];

export const DEMO_GROUPS: TradingGroup[] = [
  { id: "demo-group-1", name: "Scalping Desk", color: "#3b82f6", isActive: true, masterId: "demo-1", disabledAccountIds: [] },
  { id: "demo-group-2", name: "Swing Trades", color: "#22c55e", isActive: false, masterId: "demo-4", disabledAccountIds: [] },
];

export const DEMO_ASSIGNMENTS: Record<string, string> = {
  "demo-1": "demo-group-1",
  "demo-2": "demo-group-1",
  "demo-3": "demo-group-1",
  "demo-4": "demo-group-2",
  "demo-5": "demo-group-2",
  "demo-6": "demo-group-2",
};

export const UNGROUPED_ID = "__ungrouped__";

export const PALETTE = [
  "#3b82f6",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#ec4899",
  "#14b8a6",
  "#ef4444",
  "#eab308",
];

function isRuntimePreference(
  value: unknown,
): value is "ready" | "paused" | "emergency_stopped" {
  return (
    value === "ready" ||
    value === "paused" ||
    value === "emergency_stopped"
  );
}

export function normalizeTradingGroups(value: unknown): TradingGroup[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((group) => {
    if (!group || typeof group !== "object") {
      return [];
    }

    const candidate = group as Partial<TradingGroup>;
    if (
      typeof candidate.id !== "string" ||
      typeof candidate.name !== "string" ||
      typeof candidate.color !== "string"
    ) {
      return [];
    }

    return [
      {
        id: candidate.id,
        name: candidate.name,
        color: candidate.color,
        isActive: candidate.isActive ?? true,
        masterId:
          typeof candidate.masterId === "string" ? candidate.masterId : null,
        disabledAccountIds: Array.isArray(candidate.disabledAccountIds)
          ? candidate.disabledAccountIds.filter(
              (accountId): accountId is string => typeof accountId === "string",
            )
          : [],
        runtimePreference: isRuntimePreference(candidate.runtimePreference)
          ? candidate.runtimePreference
          : candidate.isActive === false
            ? "paused"
            : "ready",
      },
    ];
  });
}

export function normalizeGroupAssignments(
  value: unknown,
): Record<string, string> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([accountId, groupId]) => {
      if (typeof accountId !== "string" || typeof groupId !== "string") {
        return [];
      }

      return [[accountId, groupId]];
    }),
  );
}

export function loadGroups(): TradingGroup[] {
  try {
    const raw = localStorage.getItem("trading-groups-v1");
    if (!raw) {
      return [];
    }

    return normalizeTradingGroups(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function loadAssignments(): Record<string, string> {
  try {
    const raw = localStorage.getItem("group-assignments-v1");
    return raw ? normalizeGroupAssignments(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

export function saveGroups(groups: TradingGroup[]) {
  localStorage.setItem("trading-groups-v1", JSON.stringify(groups));
}

export function saveAssignments(assignments: Record<string, string>) {
  localStorage.setItem("group-assignments-v1", JSON.stringify(assignments));
}
