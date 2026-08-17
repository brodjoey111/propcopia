import { useState } from "react";

import type { RiskSettings } from "@/components/risk-settings-dialog";
import { buildCopyGroupSyncPlan } from "@/lib/copy-group-persistence";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Account } from "@shared/schema";

type RuntimePreference = "ready" | "paused" | "emergency_stopped";

interface TradingGroupLike {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
  masterId: string | null;
  disabledAccountIds: string[];
  runtimePreference?: RuntimePreference;
}

interface UseAccountGroupsLifecycleActionsOptions<TGroup extends TradingGroupLike> {
  isDemo: boolean;
  userId?: string | null;
  groups: TGroup[];
  assignments: Record<string, string>;
  accounts: Account[];
  groupRiskSettings: Record<string, Partial<RiskSettings>>;
  persistGroups: (groups: TGroup[]) => void;
  setUngroupedName: (name: string) => void;
  toast: (input: {
    title: string;
    description: string;
    variant?: "destructive";
  }) => void;
  recordOperatorAction: (groupId: string, label: string, detail: string) => void;
}

export function getAccountGroupsLifecycleStatusMessage(
  runtimePreference: RuntimePreference,
) {
  if (runtimePreference === "ready") {
    return {
      title: "Group ready",
      description: "This group is saved in a safe ready state.",
      auditLabel: "Group ready",
      auditDetail: "The operator saved this copy group in a ready state.",
    };
  }

  if (runtimePreference === "paused") {
    return {
      title: "Group paused",
      description: "This group will stay paused until you change it.",
      auditLabel: "Group paused",
      auditDetail: "The operator paused this copy group from the board.",
    };
  }

  return {
    title: "Emergency stop applied",
    description: "This group is locked until you clear the stop.",
    auditLabel: "Emergency stop applied",
    auditDetail: "The operator applied an emergency stop to this copy group.",
  };
}

export function useAccountGroupsLifecycleActions<TGroup extends TradingGroupLike>(
  options: UseAccountGroupsLifecycleActionsOptions<TGroup>,
) {
  const [pendingLifecycleGroupId, setPendingLifecycleGroupId] = useState<string | null>(null);

  const setGroupRuntimePreference = (
    groupId: string,
    runtimePreference: RuntimePreference,
  ) => {
    options.persistGroups(
      options.groups.map((group) =>
        group.id === groupId
          ? {
              ...group,
              isActive: runtimePreference === "ready",
              runtimePreference,
            }
          : group,
      ),
    );
  };

  const syncSingleGroupRegistration = async (
    groupId: string,
    runtimePreference: RuntimePreference,
  ) => {
    if (!options.userId) {
      return;
    }

    const targetGroup = options.groups.find((group) => group.id === groupId);
    if (!targetGroup) {
      return;
    }

    const plan = buildCopyGroupSyncPlan({
      userId: options.userId,
      groups: [
        {
          ...targetGroup,
          isActive: runtimePreference === "ready",
          runtimePreference,
        },
      ],
      assignments: options.assignments,
      accounts: options.accounts,
      groupRiskSettings: options.groupRiskSettings,
      registeredGroupIds: [groupId],
    });

    const payload = plan.payloads[0];
    if (!payload) {
      return;
    }

    await apiRequest("POST", "/api/copy-groups/register", payload);
  };

  const invalidateCopyGroupQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/copy-groups/snapshot"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/accounts-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] }),
    ]);
  };

  const persistUngroupedLaneName = async (name: string) => {
    const trimmedName = name.trim() || "Ungrouped";

    options.setUngroupedName(trimmedName);
    try {
      localStorage.setItem("ungrouped-name-v1", trimmedName);
    } catch {}

    if (options.isDemo || !options.userId) {
      return;
    }

    const response = await apiRequest("PATCH", "/api/user/settings", {
      copyGroupsUngroupedName: trimmedName,
    });
    const payload = await response.json();

    queryClient.setQueryData(["/api/auth/me"], payload);
  };

  const applyGroupRuntimePreference = async (
    groupId: string,
    runtimePreference: RuntimePreference,
  ) => {
    const previousGroup = options.groups.find((group) => group.id === groupId);
    const statusMessage = getAccountGroupsLifecycleStatusMessage(runtimePreference);
    setPendingLifecycleGroupId(groupId);
    setGroupRuntimePreference(groupId, runtimePreference);

    try {
      await syncSingleGroupRegistration(groupId, runtimePreference);
      await invalidateCopyGroupQueries();
      options.toast({
        title: statusMessage.title,
        description: statusMessage.description,
      });
      options.recordOperatorAction(
        groupId,
        statusMessage.auditLabel,
        statusMessage.auditDetail,
      );
    } catch (error) {
      if (previousGroup) {
        options.persistGroups(
          options.groups.map((group) => (group.id === groupId ? previousGroup : group)),
        );
      }

      console.error("Failed to apply copy-group runtime preference:", error);
      options.toast({
        title: "Group update failed",
        description:
          error instanceof Error
            ? error.message
            : "Unable to save the group state right now.",
        variant: "destructive",
      });
    } finally {
      setPendingLifecycleGroupId(null);
    }
  };

  return {
    pendingLifecycleGroupId,
    persistUngroupedLaneName,
    applyGroupRuntimePreference,
  };
}
