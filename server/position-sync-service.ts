import type { AccountPositionSnapshot, PositionSnapshotPosition } from "./position-snapshot-service";

export interface PositionSyncFollowerConfig {
  followerAccountId: string;
  enabled?: boolean;
  positionScaling?: number | null;
  copySizingMode?: "MULTIPLIER" | "FIXED" | null;
  fixedQuantity?: number | null;
  reverseCopying?: boolean | null;
  maxContracts?: number | null;
}

export interface PositionSyncAdjustment {
  symbol: string;
  currentQuantity: number;
  targetQuantity: number;
  deltaQuantity: number;
  action: "BUY" | "SELL" | "FLATTEN";
  reason: "OPEN" | "INCREASE" | "REDUCE" | "REVERSE" | "FLATTEN_EXTRA";
}

export interface PositionSyncPlan {
  followerAccountId: string;
  followerName: string;
  status: "IN_SYNC" | "OUT_OF_SYNC" | "UNAVAILABLE" | "DISABLED";
  summary: string;
  adjustments: PositionSyncAdjustment[];
}

function aggregatePositionQuantities(
  positions: PositionSnapshotPosition[],
): Map<string, number> {
  const quantities = new Map<string, number>();

  for (const position of positions) {
    if (!position.symbol || !Number.isFinite(position.quantity) || position.quantity === 0) {
      continue;
    }

    quantities.set(
      position.symbol,
      (quantities.get(position.symbol) ?? 0) + position.quantity,
    );
  }

  return quantities;
}

function scaleMasterQuantity(
  masterQuantity: number,
  config: PositionSyncFollowerConfig,
): number {
  if (masterQuantity === 0) {
    return 0;
  }

  const sign = masterQuantity >= 0 ? 1 : -1;
  const absoluteMasterQuantity = Math.abs(masterQuantity);
  const sizingMode = config.copySizingMode ?? "MULTIPLIER";
  const reversedSign = config.reverseCopying ? sign * -1 : sign;

  let absoluteTargetQuantity =
    sizingMode === "FIXED"
      ? Math.floor(config.fixedQuantity ?? 0)
      : Math.floor(absoluteMasterQuantity * ((config.positionScaling ?? 100) / 100));

  if (config.maxContracts != null && absoluteTargetQuantity > config.maxContracts) {
    absoluteTargetQuantity = config.maxContracts;
  }

  if (absoluteTargetQuantity <= 0) {
    return 0;
  }

  return absoluteTargetQuantity * reversedSign;
}

function buildAdjustment(
  symbol: string,
  currentQuantity: number,
  targetQuantity: number,
): PositionSyncAdjustment | null {
  const deltaQuantity = targetQuantity - currentQuantity;
  if (deltaQuantity === 0) {
    return null;
  }

  let reason: PositionSyncAdjustment["reason"];
  if (targetQuantity === 0 && currentQuantity !== 0) {
    reason = "FLATTEN_EXTRA";
  } else if (currentQuantity === 0) {
    reason = "OPEN";
  } else if (
    (currentQuantity > 0 && targetQuantity < 0) ||
    (currentQuantity < 0 && targetQuantity > 0)
  ) {
    reason = "REVERSE";
  } else if (Math.abs(targetQuantity) > Math.abs(currentQuantity)) {
    reason = "INCREASE";
  } else {
    reason = "REDUCE";
  }

  return {
    symbol,
    currentQuantity,
    targetQuantity,
    deltaQuantity,
    action:
      targetQuantity === 0
        ? "FLATTEN"
        : deltaQuantity > 0
          ? "BUY"
          : "SELL",
    reason,
  };
}

export function buildFollowerPositionSyncPlan(input: {
  master: AccountPositionSnapshot;
  follower: AccountPositionSnapshot;
  config?: PositionSyncFollowerConfig;
}): PositionSyncPlan {
  const config = input.config ?? {
    followerAccountId: input.follower.accountId,
  };

  if (config.enabled === false) {
    return {
      followerAccountId: input.follower.accountId,
      followerName: input.follower.name,
      status: "DISABLED",
      summary: "Follower sync is disabled.",
      adjustments: [],
    };
  }

  if (input.master.status !== "LIVE") {
    return {
      followerAccountId: input.follower.accountId,
      followerName: input.follower.name,
      status: "UNAVAILABLE",
      summary: "Master positions are not available yet.",
      adjustments: [],
    };
  }

  if (input.follower.status !== "LIVE") {
    return {
      followerAccountId: input.follower.accountId,
      followerName: input.follower.name,
      status: "UNAVAILABLE",
      summary: "Follower positions are not available yet.",
      adjustments: [],
    };
  }

  const masterQuantities = aggregatePositionQuantities(input.master.positions);
  const followerQuantities = aggregatePositionQuantities(input.follower.positions);
  const symbols = Array.from(
    new Set([
      ...Array.from(masterQuantities.keys()),
      ...Array.from(followerQuantities.keys()),
    ]),
  );

  const adjustments = symbols
    .sort((left, right) => left.localeCompare(right))
    .map((symbol) => {
      const currentQuantity = followerQuantities.get(symbol) ?? 0;
      const targetQuantity = scaleMasterQuantity(masterQuantities.get(symbol) ?? 0, config);
      return buildAdjustment(symbol, currentQuantity, targetQuantity);
    })
    .filter((adjustment): adjustment is PositionSyncAdjustment => adjustment !== null);

  if (adjustments.length === 0) {
    return {
      followerAccountId: input.follower.accountId,
      followerName: input.follower.name,
      status: "IN_SYNC",
      summary: "Follower is already aligned with the master.",
      adjustments: [],
    };
  }

  return {
    followerAccountId: input.follower.accountId,
    followerName: input.follower.name,
    status: "OUT_OF_SYNC",
    summary: `${adjustments.length} adjustment${adjustments.length === 1 ? "" : "s"} needed to align with the master.`,
    adjustments,
  };
}

export function buildGroupPositionSyncPlans(input: {
  master: AccountPositionSnapshot;
  followers: AccountPositionSnapshot[];
  followerConfigs?: PositionSyncFollowerConfig[];
}): PositionSyncPlan[] {
  const configsById = new Map(
    (input.followerConfigs ?? []).map((config) => [config.followerAccountId, config]),
  );

  return input.followers.map((follower) =>
    buildFollowerPositionSyncPlan({
      master: input.master,
      follower,
      config: configsById.get(follower.accountId),
    }),
  );
}
