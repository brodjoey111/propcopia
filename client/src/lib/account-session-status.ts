export interface AccountSessionStatusView {
  label?: string;
  tone: "neutral" | "ok" | "warn";
}

export interface AccountSessionStatusInput {
  accountId: string;
  isConnected: boolean;
  activeSessionMasterAccountId: string | null;
  tradeCopyStatus:
    | {
        masterAccountId: string | null;
        masterConnected: boolean;
        ready: boolean;
        followers: Array<{
          accountId: string;
          connected: boolean;
          health: "ready" | "reconnecting" | "unavailable";
        }>;
      }
    | null
    | undefined;
}

export function getAccountSessionStatusView(
  input: AccountSessionStatusInput,
): AccountSessionStatusView {
  const tradeCopyStatus = input.tradeCopyStatus ?? null;

  if (!tradeCopyStatus) {
    if (input.isConnected && input.activeSessionMasterAccountId === input.accountId) {
      return {
        label: "selected master",
        tone: "warn",
      };
    }

    return {
      label: input.isConnected ? "connected" : undefined,
      tone: "neutral",
    };
  }

  if (tradeCopyStatus.masterAccountId === input.accountId) {
    if (tradeCopyStatus.ready) {
      return { label: "session ready", tone: "ok" };
    }

    if (tradeCopyStatus.masterConnected) {
      return { label: "session live", tone: "warn" };
    }

    return {
      label: input.isConnected ? "connected" : undefined,
      tone: "neutral",
    };
  }

  const followerStatus = tradeCopyStatus.followers.find(
    (follower) => follower.accountId === input.accountId,
  );
  if (!followerStatus) {
    return {
      label: input.isConnected ? "not in session" : undefined,
      tone: input.isConnected ? "warn" : "neutral",
    };
  }

  if (followerStatus.connected) {
    return { label: "ready", tone: "ok" };
  }

  return followerStatus.health === "reconnecting"
    ? { label: "reconnecting", tone: "warn" }
    : { label: "needs recovery", tone: "warn" };
}
