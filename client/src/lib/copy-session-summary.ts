export type CopySessionFollowerHealth = "ready" | "reconnecting" | "unavailable";

export interface CopySessionFollowerRow {
  accountId: string;
  name: string;
  health: CopySessionFollowerHealth;
}

export interface CopySessionStatusData {
  masterAccountId: string | null;
  masterConnected: boolean;
  followerCount: number;
  connectedFollowerCount: number;
  ready: boolean;
  followers: Array<{
    accountId: string;
    connected: boolean;
    health: CopySessionFollowerHealth;
  }>;
}

export interface CopySessionSummary {
  tone: "ready" | "review" | "attention" | "standby";
  badgeLabel: string;
  headline: string;
  guidance: string;
  helperText: string | null;
  followerHealthRows: CopySessionFollowerRow[];
  unavailableFollowerCount: number;
  reconnectingFollowerCount: number;
}

export function summarizeCopySession(input: {
  tradeCopyStatus: CopySessionStatusData | null | undefined;
  selectedMasterAccountName?: string | null;
  connectedFollowerCount: number;
  followerNamesById?: Record<string, string | undefined>;
}): CopySessionSummary {
  const tradeCopyStatus = input.tradeCopyStatus ?? null;
  const followerHealthRows = tradeCopyStatus?.followers
    .filter((follower) => follower.health !== "ready")
    .map((follower) => ({
      accountId: follower.accountId,
      name: input.followerNamesById?.[follower.accountId] ?? follower.accountId,
      health: follower.health,
    })) ?? [];
  const reconnectingFollowerCount = followerHealthRows.filter(
    (follower) => follower.health === "reconnecting",
  ).length;
  const unavailableFollowerCount = followerHealthRows.filter(
    (follower) => follower.health === "unavailable",
  ).length;

  if (!tradeCopyStatus) {
    if (!input.selectedMasterAccountName) {
      return {
        tone: "standby",
        badgeLabel: "Not started",
        headline: "Pick a session master",
        guidance: "Connect the account you want to lead, then set it as the session master.",
        helperText: null,
        followerHealthRows,
        unavailableFollowerCount,
        reconnectingFollowerCount,
      };
    }

    if (input.connectedFollowerCount === 0) {
      return {
        tone: "review",
        badgeLabel: "Needs review",
        headline: "Add a follower before starting",
        guidance: `${input.selectedMasterAccountName} is selected as master, but no connected followers are ready yet.`,
        helperText: "Connect at least one follower account before starting the session.",
        followerHealthRows,
        unavailableFollowerCount,
        reconnectingFollowerCount,
      };
    }

    return {
      tone: "review",
      badgeLabel: "Needs review",
      headline: "Ready to launch",
      guidance: `${input.selectedMasterAccountName} can start a session with ${input.connectedFollowerCount} follower${input.connectedFollowerCount === 1 ? "" : "s"}.`,
      helperText: "Review the lineup, then start the copy session.",
      followerHealthRows,
      unavailableFollowerCount,
      reconnectingFollowerCount,
    };
  }

  if (unavailableFollowerCount > 0) {
    return {
      tone: "attention",
      badgeLabel: "Needs attention",
      headline: "Some followers need manual recovery",
      guidance: `${tradeCopyStatus.connectedFollowerCount}/${tradeCopyStatus.followerCount} followers are ready. ${unavailableFollowerCount} follower${unavailableFollowerCount === 1 ? "" : "s"} stopped reconnecting.`,
      helperText: "Recover unavailable followers or stop the session before changing the lineup.",
      followerHealthRows,
      unavailableFollowerCount,
      reconnectingFollowerCount,
    };
  }

  if (tradeCopyStatus.ready) {
    return {
      tone: "ready",
      badgeLabel: "Ready",
      headline: "Copy session is fully ready",
      guidance: `${tradeCopyStatus.connectedFollowerCount}/${tradeCopyStatus.followerCount} followers connected and receiving trades.`,
      helperText: "Stop this session before changing the master or follower lineup.",
      followerHealthRows,
      unavailableFollowerCount,
      reconnectingFollowerCount,
    };
  }

  return {
    tone: "review",
    badgeLabel: "Needs review",
    headline: "Session is live but still settling",
    guidance: `${tradeCopyStatus.connectedFollowerCount}/${tradeCopyStatus.followerCount} followers are ready right now.`,
    helperText: reconnectingFollowerCount > 0
      ? `Reconnecting now: ${reconnectingFollowerCount} follower${reconnectingFollowerCount === 1 ? "" : "s"}.`
      : "Wait for remaining followers to reconnect before treating the session as fully ready.",
    followerHealthRows,
    unavailableFollowerCount,
    reconnectingFollowerCount,
  };
}
