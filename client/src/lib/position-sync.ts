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
  repairRecommendation?: {
    label: string;
    tone: "ok" | "warn";
    reason: string;
    complexity: PositionSyncRepairComplexity;
    complexityLabel: string;
    complexityScore: number;
  };
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

export interface PositionSyncRepairRecommendationView {
  groupId: string;
  groupName: string;
  followerAccountId: string;
  followerName: string;
  adjustmentCount: number;
  recommendation: "auto_ready" | "manual_review";
  reason: string;
  complexity: PositionSyncRepairComplexity;
  complexityLabel: string;
  complexityScore: number;
}

export type PositionSyncRepairComplexity = "low" | "medium" | "high";

export interface PositionSyncRepairProfile {
  recommendation: "auto_ready" | "manual_review";
  reason: string;
  complexity: PositionSyncRepairComplexity;
  complexityLabel: string;
  complexityScore: number;
}

export function describePositionSyncSimulationGuidance(
  complexity: PositionSyncRepairComplexity,
): string {
  if (complexity === "high") {
    return "Simulate symbol-by-symbol and confirm the reversal path before handoff.";
  }

  if (complexity === "medium") {
    return "Simulate the full repair plan and verify each open or multi-step adjustment.";
  }

  return "Good candidate for a quick simulation pass before staging.";
}

export interface PositionSyncRepairSummaryView {
  totalCandidates: number;
  autoReadyCount: number;
  manualReviewCount: number;
  waitingCount: number;
  headline: string;
  detail: string;
  tone: "ok" | "warn" | "danger" | "muted";
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

  if (overview.summary.disabledFollowers > 0) {
    return {
      headline: `${overview.summary.disabledFollowers} follower${overview.summary.disabledFollowers === 1 ? "" : "s"} currently excluded from sync`,
      detail: `${overview.summary.inSyncGroups} group${overview.summary.inSyncGroups === 1 ? " is" : "s are"} otherwise aligned with their masters.`,
      tone: "muted",
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
      value:
        overview.summary.disabledFollowers > 0
          ? String(overview.summary.disabledFollowers)
          : String(overview.summary.unavailableFollowers),
      tone:
        overview.summary.unavailableFollowers > 0
          ? "warn"
          : overview.summary.disabledFollowers > 0
            ? "muted"
            : "ok",
    },
  ];
}

export function buildPositionSyncRepairRecommendations(
  groups: PositionSyncGroupOverviewItem[],
): PositionSyncRepairRecommendationView[] {
  return sortPositionSyncGroups(groups).flatMap((group) =>
    group.followers.flatMap((follower) => {
      if (follower.status !== "OUT_OF_SYNC" || follower.adjustmentCount === 0) {
        return [];
      }
      const repairProfile = buildPositionSyncRepairProfile({
        adjustmentCount: follower.adjustmentCount,
        adjustments: follower.adjustments,
      });

      return [{
        groupId: group.groupId,
        groupName: group.groupName,
        followerAccountId: follower.followerAccountId,
        followerName: follower.followerName,
        adjustmentCount: follower.adjustmentCount,
        recommendation: repairProfile.recommendation,
        reason: repairProfile.reason,
        complexity: repairProfile.complexity,
        complexityLabel: repairProfile.complexityLabel,
        complexityScore: repairProfile.complexityScore,
      }];
    }),
  );
}

function getRepairRecommendationView(input: {
  status: PositionSyncGroupOverviewItem["followers"][number]["status"];
  adjustmentCount: number;
  adjustments: PositionSyncGroupOverviewItem["followers"][number]["adjustments"];
}): PositionSyncFollowerReviewView["repairRecommendation"] {
  if (input.status !== "OUT_OF_SYNC" || input.adjustmentCount === 0) {
    return undefined;
  }
  const repairProfile = buildPositionSyncRepairProfile(input);

  return {
    label: repairProfile.recommendation === "auto_ready" ? "Auto-ready next" : "Manual review first",
    tone: repairProfile.recommendation === "auto_ready" ? "ok" : "warn",
    reason: repairProfile.reason,
    complexity: repairProfile.complexity,
    complexityLabel: repairProfile.complexityLabel,
    complexityScore: repairProfile.complexityScore,
  };
}

export function buildPositionSyncRepairProfile(input: {
  adjustmentCount: number;
  adjustments: PositionSyncGroupOverviewItem["followers"][number]["adjustments"];
}): PositionSyncRepairProfile {
  const symbolCount = new Set(input.adjustments.map((adjustment) => adjustment.symbol)).size;
  const hasReverse = input.adjustments.some((adjustment) => adjustment.reason === "REVERSE");
  const hasOpen = input.adjustments.some((adjustment) => adjustment.reason === "OPEN");
  const hasFlatten = input.adjustments.some((adjustment) => adjustment.reason === "FLATTEN_EXTRA");
  const hasLargeDelta = input.adjustments.some((adjustment) => Math.abs(adjustment.deltaQuantity) >= 3);

  let complexityScore = input.adjustmentCount;
  if (hasReverse) {
    complexityScore += 3;
  }
  if (hasOpen) {
    complexityScore += 2;
  }
  if (hasFlatten) {
    complexityScore += 1;
  }
  if (symbolCount >= 2) {
    complexityScore += 1;
  }
  if (hasLargeDelta) {
    complexityScore += 1;
  }

  const complexity: PositionSyncRepairComplexity =
    hasReverse || complexityScore >= 6
      ? "high"
      : hasOpen || complexityScore >= 4
        ? "medium"
        : "low";

  return {
    recommendation: complexity === "low" ? "auto_ready" : "manual_review",
    reason:
      hasReverse
        ? "Contains a direction reversal."
        : hasOpen
          ? "Includes a fresh open from flat."
          : symbolCount >= 2
            ? "Touches multiple symbols in one repair pass."
            : hasFlatten
              ? "Includes extra follower exposure that needs flattening."
              : input.adjustmentCount >= 3 || hasLargeDelta
                ? "Touches several planned size changes."
                : "Low-complexity trim or sizing change.",
    complexity,
    complexityLabel:
      complexity === "high"
        ? "High complexity"
        : complexity === "medium"
          ? "Medium complexity"
          : "Low complexity",
    complexityScore,
  };
}

export function summarizePositionSyncRepairOpportunities(
  overview: PositionSyncOverviewResponse | null | undefined,
): PositionSyncRepairSummaryView {
  if (!overview || overview.summary.totalGroups === 0) {
    return {
      totalCandidates: 0,
      autoReadyCount: 0,
      manualReviewCount: 0,
      waitingCount: 0,
      headline: "No repair plan yet",
      detail: "Repair recommendations appear after copy groups and live position snapshots are available.",
      tone: "muted",
    };
  }

  const recommendations = buildPositionSyncRepairRecommendations(overview.groups);
  const autoReadyCount = recommendations.filter(
    (item) => item.recommendation === "auto_ready",
  ).length;
  const manualReviewCount = recommendations.length - autoReadyCount;
  const waitingCount = overview.summary.unavailableFollowers;

  if (manualReviewCount > 0) {
    return {
      totalCandidates: recommendations.length,
      autoReadyCount,
      manualReviewCount,
      waitingCount,
      headline: `${manualReviewCount} sync item${manualReviewCount === 1 ? "" : "s"} still need manual review`,
      detail: `${autoReadyCount} low-complexity repair candidate${autoReadyCount === 1 ? "" : "s"} can be staged next without changing broker automation.`,
      tone: "danger",
    };
  }

  if (autoReadyCount > 0) {
    return {
      totalCandidates: recommendations.length,
      autoReadyCount,
      manualReviewCount: 0,
      waitingCount,
      headline: `${autoReadyCount} low-complexity repair candidate${autoReadyCount === 1 ? "" : "s"} ready to stage`,
      detail: waitingCount > 0
        ? `${waitingCount} follower${waitingCount === 1 ? "" : "s"} are still waiting on live positions.`
        : overview.summary.disabledFollowers > 0
          ? `${overview.summary.disabledFollowers} follower${overview.summary.disabledFollowers === 1 ? "" : "s"} are intentionally disabled from sync.`
        : "All remaining out-of-sync followers fit a low-complexity repair profile.",
      tone: "warn",
    };
  }

  if (waitingCount > 0) {
    return {
      totalCandidates: 0,
      autoReadyCount: 0,
      manualReviewCount: 0,
      waitingCount,
      headline: `${waitingCount} follower${waitingCount === 1 ? "" : "s"} still waiting on live positions`,
      detail: "Repair recommendations will fill in after the next live snapshot.",
      tone: "warn",
    };
  }

  if (overview.summary.disabledFollowers > 0) {
    return {
      totalCandidates: 0,
      autoReadyCount: 0,
      manualReviewCount: 0,
      waitingCount: 0,
      headline: `${overview.summary.disabledFollowers} follower${overview.summary.disabledFollowers === 1 ? "" : "s"} intentionally excluded`,
      detail: "Disabled followers are not included in sync repair recommendations.",
      tone: "muted",
    };
  }

  return {
    totalCandidates: 0,
    autoReadyCount: 0,
    manualReviewCount: 0,
    waitingCount: 0,
    headline: "No repair work pending",
    detail: "Current sync plans do not need staged repair recommendations.",
    tone: "ok",
  };
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
          repairRecommendation: getRepairRecommendationView({
            status: follower.status,
            adjustmentCount: follower.adjustmentCount,
            adjustments: follower.adjustments,
          }),
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
