import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RiskSettings } from "@/components/risk-settings-dialog";
import {
  loadCopyGroupOperatorLog,
  recordCopyGroupOperatorLogEntry,
  saveCopyGroupOperatorLog,
} from "@/lib/copy-group-operator-log";
import type { CopyGroupSnapshotApiResponse } from "@/lib/copy-groups";

interface UseAccountGroupsRuntimeStateOptions {
  isDemo: boolean;
  userId?: string;
  persistGroupRiskSetting: (groupId: string, settings: RiskSettings) => void;
  removeGroupRiskSetting: (groupId: string) => void;
}

export function getAccountGroupsRiskUpdatedAuditMessage() {
  return {
    label: "Risk updated",
    detail: "Custom group risk settings were saved.",
  };
}

export function getAccountGroupsRiskResetAuditMessage() {
  return {
    label: "Risk reset",
    detail: "Group risk settings were restored to the global defaults.",
  };
}

export function useAccountGroupsRuntimeState(
  options: UseAccountGroupsRuntimeStateOptions,
) {
  const [operatorLogByGroupId, setOperatorLogByGroupId] = useState(() =>
    loadCopyGroupOperatorLog(),
  );

  const {
    data: registeredGroupsData,
    isLoading: isCopyGroupSnapshotLoading,
    isError: isCopyGroupSnapshotError,
  } = useQuery<CopyGroupSnapshotApiResponse>({
    queryKey: ["/api/copy-groups/snapshot"],
    queryFn: async () => {
      const response = await fetch("/api/copy-groups/snapshot", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to load copy-group snapshot");
      }

      return response.json();
    },
    enabled: !options.isDemo && !!options.userId,
    refetchOnWindowFocus: false,
  });

  const recordOperatorAction = (
    groupId: string,
    label: string,
    detail: string,
  ) => {
    setOperatorLogByGroupId((current) => {
      const next = recordCopyGroupOperatorLogEntry(current, {
        groupId,
        label,
        detail,
      });
      saveCopyGroupOperatorLog(next);
      return next;
    });
  };

  const saveGroupRiskSetting = (groupId: string, settings: RiskSettings) => {
    const auditMessage = getAccountGroupsRiskUpdatedAuditMessage();
    options.persistGroupRiskSetting(groupId, settings);
    recordOperatorAction(groupId, auditMessage.label, auditMessage.detail);
  };

  const clearGroupRiskSetting = (groupId: string) => {
    const auditMessage = getAccountGroupsRiskResetAuditMessage();
    options.removeGroupRiskSetting(groupId);
    recordOperatorAction(groupId, auditMessage.label, auditMessage.detail);
  };

  return {
    operatorLogByGroupId,
    registeredGroupsData,
    isCopyGroupSnapshotLoading,
    isCopyGroupSnapshotError,
    recordOperatorAction,
    saveGroupRiskSetting,
    clearGroupRiskSetting,
  };
}
