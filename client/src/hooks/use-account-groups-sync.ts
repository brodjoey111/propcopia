import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";

import type { RiskSettings } from "@/components/risk-settings-dialog";
import {
  buildCopyGroupSyncPlan,
  hydrateBoardStateFromSnapshot,
  type PersistedTradingGroup,
} from "@/lib/copy-group-persistence";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CopyGroupSnapshotApiResponse } from "@/lib/copy-groups";
import type { Account } from "@shared/schema";

interface UseAccountGroupsSyncOptions {
  isDemo: boolean;
  userId?: string | null;
  accounts: Account[];
  groups: PersistedTradingGroup[];
  assignments: Record<string, string>;
  groupRiskSettings: Record<string, Partial<RiskSettings>>;
  registeredGroupsData?: CopyGroupSnapshotApiResponse;
  setGroups: Dispatch<SetStateAction<PersistedTradingGroup[]>>;
  setAssignments: Dispatch<SetStateAction<Record<string, string>>>;
  setGroupRiskSettings: Dispatch<SetStateAction<Record<string, Partial<RiskSettings>>>>;
  persistGroups: (groups: PersistedTradingGroup[]) => void;
  persistAssignments: (assignments: Record<string, string>) => void;
}

export function selectAccountGroupsSyncInputs(
  registeredGroupsData: CopyGroupSnapshotApiResponse | undefined,
  groups: PersistedTradingGroup[],
) {
  const runningGroupIds = new Set(registeredGroupsData?.runningGroups ?? []);
  const syncableGroups = groups.filter((group) => !runningGroupIds.has(group.id));
  const registeredGroupIds = (registeredGroupsData?.groups ?? []).map(
    (registeredGroup) => registeredGroup.group.group.groupId,
  );

  return {
    runningGroupIds,
    syncableGroups,
    registeredGroupIds: registeredGroupIds.filter(
      (groupId) => !runningGroupIds.has(groupId),
    ),
  };
}

export function buildAccountGroupsSyncSignature(input: {
  payloads: unknown[];
  removedGroupIds: string[];
  runningGroupIds: Set<string>;
}) {
  return JSON.stringify({
    payloads: input.payloads,
    removedGroupIds: input.removedGroupIds,
    runningGroupIds: Array.from(input.runningGroupIds).sort(),
  });
}

export function useAccountGroupsSync(options: UseAccountGroupsSyncOptions) {
  const syncSignatureRef = useRef<string | null>(null);
  const hydratedBoardSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    if (options.isDemo || !options.userId || !options.registeredGroupsData) {
      return;
    }

    if (options.registeredGroupsData.groups.length === 0 && options.groups.length > 0) {
      return;
    }

    const nextBoardState = hydrateBoardStateFromSnapshot(
      options.registeredGroupsData,
      options.groups,
    );
    const nextSignature = JSON.stringify(nextBoardState);
    const currentSignature = JSON.stringify({
      groups: options.groups,
      assignments: options.assignments,
    });

    if (
      nextSignature === currentSignature ||
      nextSignature === hydratedBoardSignatureRef.current
    ) {
      hydratedBoardSignatureRef.current = nextSignature;
      return;
    }

    hydratedBoardSignatureRef.current = nextSignature;
    options.setGroups(nextBoardState.groups);
    options.setAssignments(nextBoardState.assignments);
    options.setGroupRiskSettings((currentSettings) => {
      const nextSettings = nextBoardState.groupRiskSettings;
      const currentSettingsSignature = JSON.stringify(currentSettings);
      const nextSettingsSignature = JSON.stringify(nextSettings);

      if (currentSettingsSignature === nextSettingsSignature) {
        return currentSettings;
      }

      try {
        localStorage.setItem("group-risk-settings-v1", nextSettingsSignature);
      } catch {}

      return nextSettings;
    });
    options.persistGroups(nextBoardState.groups);
    options.persistAssignments(nextBoardState.assignments);
  }, [
    options.assignments,
    options.groups,
    options.isDemo,
    options.persistAssignments,
    options.persistGroups,
    options.registeredGroupsData,
    options.setAssignments,
    options.setGroupRiskSettings,
    options.setGroups,
    options.userId,
  ]);

  useEffect(() => {
    if (options.isDemo || !options.userId || !options.registeredGroupsData) {
      return;
    }

    const { runningGroupIds, syncableGroups, registeredGroupIds } =
      selectAccountGroupsSyncInputs(options.registeredGroupsData, options.groups);
    const syncPlan = buildCopyGroupSyncPlan({
      userId: options.userId,
      groups: syncableGroups,
      assignments: options.assignments,
      accounts: options.accounts,
      groupRiskSettings: options.groupRiskSettings,
      registeredGroupIds,
    });
    const syncSignature = buildAccountGroupsSyncSignature({
      payloads: syncPlan.payloads,
      removedGroupIds: syncPlan.removedGroupIds,
      runningGroupIds,
    });

    if (syncSignatureRef.current === syncSignature) {
      return;
    }

    let cancelled = false;

    void (async () => {
      for (const groupId of syncPlan.removedGroupIds) {
        await apiRequest("DELETE", `/api/copy-groups/${groupId}`);
      }

      for (const payload of syncPlan.payloads) {
        await apiRequest("POST", "/api/copy-groups/register", payload);
      }

      if (cancelled) {
        return;
      }

      syncSignatureRef.current = syncSignature;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/copy-groups/snapshot"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/runtime/accounts-overview"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/runtime/dashboard-overview"] }),
      ]);
    })().catch((error) => {
      if (cancelled) {
        return;
      }

      console.error("Failed to sync copy group board state:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [
    options.accounts,
    options.assignments,
    options.groupRiskSettings,
    options.groups,
    options.isDemo,
    options.registeredGroupsData,
    options.userId,
  ]);
}
