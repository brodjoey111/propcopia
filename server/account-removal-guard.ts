export interface AccountRemovalCopyGroup {
  name: string;
  masterAccountId: string;
  followerAccountIds: string[];
}

export interface AccountRemovalTradeCopyStatus {
  masterAccountId: string | null;
  followers: Array<{ accountId: string }>;
}

export type AccountRemovalDecision =
  | { allowed: true }
  | {
      allowed: false;
      reason: "CONNECTED" | "COPY_GROUP_ASSIGNED" | "ACTIVE_COPY_SESSION";
      message: string;
    };

export function evaluateAccountRemoval(input: {
  accountId: string;
  isConnected: boolean;
  copyGroups: AccountRemovalCopyGroup[];
  tradeCopyStatus?: AccountRemovalTradeCopyStatus | null;
}): AccountRemovalDecision {
  if (input.isConnected) {
    return {
      allowed: false,
      reason: "CONNECTED",
      message: "Disconnect this account before removing it.",
    };
  }

  const assignedGroup = input.copyGroups.find(
    (group) =>
      group.masterAccountId === input.accountId ||
      group.followerAccountIds.includes(input.accountId),
  );
  if (assignedGroup) {
    return {
      allowed: false,
      reason: "COPY_GROUP_ASSIGNED",
      message: `Remove this account from copy group ${assignedGroup.name} before deleting it.`,
    };
  }

  const activeSessionUsesAccount =
    input.tradeCopyStatus?.masterAccountId === input.accountId ||
    input.tradeCopyStatus?.followers.some(
      (follower) => follower.accountId === input.accountId,
    );
  if (activeSessionUsesAccount) {
    return {
      allowed: false,
      reason: "ACTIVE_COPY_SESSION",
      message: "Stop the active copy session before removing this account.",
    };
  }

  return { allowed: true };
}
