import type {
  PositionSyncGroupOverviewItem,
  PositionSyncOverviewResponse,
} from "./runtime-overview";

export interface PositionSyncSummaryCardView {
  label: string;
  value: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface PositionSyncHeadlineView {
  headline: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
}

export interface PositionSyncAdjustmentView {
  symbol: string;
  actionLabel: string;
  detail: string;
}

export interface PositionSyncFollowerReviewView {
  followerAccountId: string;
  followerName: string;
  status: PositionSyncGroupOverviewItem["followers"][number]["status"];
  summary: string;
  adjustmentCount: number;
  adjustments: PositionSyncAdjustmentView[];
}

export interface PositionSyncGroupReviewView {
  groupId: string;
  groupName: string;
  status: PositionSyncGroupOverviewItem["status"];
  summary: string;
  masterAccountName: string;
  followers: PositionSyncFollowerReviewView[];
}

export function describePositionSyncOverview(
  overview: PositionSyncOverviewResponse | null | undefined,
): PositionSyncHeadlineView {
  if (!overview || overview.summary.totalGroups === 0) {
    return {
      headline: "No sync groups yet",
      detail: "Position alignment will appear once copy groups have a master and followers.",
      tone: "muted",
    };
  }

  if (overview.summary.outOfSyncGroups > 0) {
    return {
      headline: `${overview.summary.outOfSyncGroups} group${overview.summary.outOfSyncGroups === 1 ? "" : "s"} need alignment`,
      detail: `${overview.summary.outOfSyncFollowers} follower${overview.summary.outOfSyncFollowers === 1 ? "" : "s"} need position adjustments.`,
      tone: "danger",
    };
  }

  if (overview.summary.unavailableGroups > 0) {
    return {
      headline: `${overview.summary.unavailableGroups} group${overview.summary.unavailableGroups === 1 ? "" : "s"} waiting on live positions`,
      detail: `${overview.summary.unavailableFollowers} follower${overview.summary.unavailableFollowers === 1 ? "" : "s"} still need position snapshots.`,
      tone: "warn",
    };
  }

  return {
    headline: "Groups are aligned",
    detail: `${overview.summary.inSyncGroups} group${overview.summary.inSyncGroups === 1 ? "" : "s"} currently match their masters.`,
    tone: "ok",
  };
}

export function buildPositionSyncSummaryCards(
  overview: PositionSyncOverviewResponse | null | undefined,
): PositionSyncSummaryCardView[] {
  if (!overview) {
    return [
      { label: "Groups", value: "0", tone: "muted" },
      { label: "Aligned", value: "0", tone: "muted" },
      { label: "Adjustments", value: "0", tone: "muted" },
      { label: "Waiting", value: "0", tone: "muted" },
    ];
  }

  return [
    {
      label: "Groups",
      value: String(overview.summary.totalGroups),
      tone: overview.summary.totalGroups > 0 ? "ok" : "muted",
    },
    {
      label: "Aligned",
      value: String(overview.summary.inSyncGroups),
      tone: overview.summary.inSyncGroups > 0 ? "ok" : "muted",
    },
    {
      label: "Adjustments",
      value: String(overview.summary.outOfSyncFollowers),
      tone: overview.summary.outOfSyncFollowers > 0 ? "danger" : "ok",
    },
    {
      label: "Waiting",
      value: String(overview.summary.unavailableFollowers),
      tone: overview.summary.unavailableFollowers > 0 ? "warn" : "ok",
    },
  ];
}

export function sortPositionSyncGroups(
  groups: PositionSyncGroupOverviewItem[],
): PositionSyncGroupOverviewItem[] {
  const priority = new Map<PositionSyncGroupOverviewItem["status"], number>([
    ["OUT_OF_SYNC", 0],
    ["UNAVAILABLE", 1],
    ["IN_SYNC", 2],
  ]);

  return [...groups].sort((left, right) => {
    const priorityDiff =
      (priority.get(left.status) ?? 99) - (priority.get(right.status) ?? 99);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    if (right.outOfSyncFollowers !== left.outOfSyncFollowers) {
      return right.outOfSyncFollowers - left.outOfSyncFollowers;
    }

    return left.groupName.localeCompare(right.groupName);
  });
}

function formatSignedQuantity(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`;
}

function formatAdjustmentAction(input: {
  action: "BUY" | "SELL" | "FLATTEN";
  reason: "OPEN" | "INCREASE" | "REDUCE" | "REVERSE" | "FLATTEN_EXTRA";
  deltaQuantity: number;
  targetQuantity: number;
}): string {
  if (input.action === "FLATTEN") {
    return "Flatten";
  }

  if (input.reason === "REVERSE") {
    return input.deltaQuantity > 0 ? "Reverse to long" : "Reverse to short";
  }

  if (input.reason === "OPEN") {
    return input.deltaQuantity > 0 ? "Open long" : "Open short";
  }

  if (input.reason === "INCREASE") {
    return input.deltaQuantity > 0 ? "Add long" : "Add short";
  }

  if (input.reason === "REDUCE") {
    return "Trim position";
  }

  return input.targetQuantity >= 0 ? "Buy to align" : "Sell to align";
}

export function buildPositionSyncReview(
  groups: PositionSyncGroupOverviewItem[],
): PositionSyncGroupReviewView[] {
  return sortPositionSyncGroups(groups)
    .filter((group) => group.status !== "IN_SYNC")
    .map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
      status: group.status,
      summary: group.summary,
      masterAccountName: group.masterAccountName,
      followers: group.followers
        .filter((follower) => follower.status !== "IN_SYNC")
        .map((follower) => ({
          followerAccountId: follower.followerAccountId,
          followerName: follower.followerName,
          status: follower.status,
          summary: follower.summary,
          adjustmentCount: follower.adjustmentCount,
          adjustments: follower.adjustments.map((adjustment) => ({
            symbol: adjustment.symbol,
            actionLabel: formatAdjustmentAction({
              action: adjustment.action,
              reason: adjustment.reason,
              deltaQuantity: adjustment.deltaQuantity,
              targetQuantity: adjustment.targetQuantity,
            }),
            detail:
              adjustment.action === "FLATTEN"
                ? `${adjustment.symbol}: close ${Math.abs(adjustment.currentQuantity)} contract${Math.abs(adjustment.currentQuantity) === 1 ? "" : "s"}.`
                : `${adjustment.symbol}: ${formatSignedQuantity(adjustment.currentQuantity)} now, target ${formatSignedQuantity(adjustment.targetQuantity)} (${formatSignedQuantity(adjustment.deltaQuantity)} change).`,
          })),
        })),
    }));
}
