import { useState, type Dispatch, type SetStateAction } from "react";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";

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

interface UseAccountGroupsBoardActionsOptions<TGroup extends TradingGroupLike> {
  isDemo: boolean;
  groups: TGroup[];
  demoGroups: TGroup[];
  assignments: Record<string, string>;
  demoAssignments: Record<string, string>;
  accounts: Account[];
  demoUngroupedName: string;
  ungroupedName: string;
  palette: readonly string[];
  ungroupedId: string;
  persistGroups: (groups: TGroup[]) => void;
  persistAssignments: (assignments: Record<string, string>) => void;
  setDemoGroups: Dispatch<SetStateAction<TGroup[]>>;
  setDemoAssignments: Dispatch<SetStateAction<Record<string, string>>>;
  setDemoUngroupedName: Dispatch<SetStateAction<string>>;
  setUngroupedName: (name: string) => void;
  persistUngroupedLaneName: (name: string) => Promise<void>;
  recordOperatorAction: (groupId: string, label: string, detail: string) => void;
  toast: (input: {
    title: string;
    description: string;
    variant?: "destructive";
  }) => void;
}

export function buildAccountGroupsTransferAudit(
  options: {
    sourceGroupId: string;
    targetGroupId: string;
    ungroupedId: string;
    role: "source" | "target";
  },
) {
  if (options.role === "source") {
    if (options.sourceGroupId === options.ungroupedId) {
      return null;
    }

    return {
      label:
        options.targetGroupId === options.ungroupedId
          ? "Account ungrouped"
          : "Account moved",
      detail:
        options.targetGroupId === options.ungroupedId
          ? "The operator returned an account from this copy group to the ungrouped lane."
          : "The operator moved an account from this copy group to another copy group.",
    };
  }

  if (options.targetGroupId === options.ungroupedId) {
    return null;
  }

  return {
    label:
      options.sourceGroupId === options.ungroupedId
        ? "Account assigned"
        : "Account moved",
    detail:
      options.sourceGroupId === options.ungroupedId
        ? "The operator assigned an account from the ungrouped lane into this copy group."
        : "The operator moved an account into this copy group from another copy group.",
  };
}

export function useAccountGroupsBoardActions<TGroup extends TradingGroupLike>(
  options: UseAccountGroupsBoardActionsOptions<TGroup>,
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const createNewGroup = (input: {
    id: string;
    name: string;
    color: string;
  }): TGroup =>
    ({
      id: input.id,
      name: input.name,
      color: input.color,
      isActive: true,
      masterId: null,
      disabledAccountIds: [],
      runtimePreference: "ready",
    }) as unknown as TGroup;

  const getDisplayAccounts = () => options.accounts;
  const getDisplayGroups = () => (options.isDemo ? options.demoGroups : options.groups);
  const getDisplayAssignments = () =>
    (options.isDemo ? options.demoAssignments : options.assignments);

  const getGroupAccounts = (groupId: string): Account[] => {
    const displayAccounts = getDisplayAccounts();
    const displayGroups = getDisplayGroups();
    const displayAssignments = getDisplayAssignments();

    if (groupId === options.ungroupedId) {
      return displayAccounts.filter((account) => {
        const assignedGroupId = displayAssignments[account.id];
        return !assignedGroupId || !displayGroups.find((group) => group.id === assignedGroupId);
      });
    }

    return displayAccounts.filter((account) => displayAssignments[account.id] === groupId);
  };

  const addGroup = () => {
    const id = `group-${Date.now()}`;

    if (options.isDemo) {
      const color = options.palette[options.demoGroups.length % options.palette.length];
      options.setDemoGroups((prev) => [
        ...prev,
        createNewGroup({
          id,
          name: `Group ${prev.length + 1}`,
          color,
        }),
      ]);
      options.recordOperatorAction(
        id,
        "Group added",
        "A new demo copy group was created from the board.",
      );
      return;
    }

    const color = options.palette[options.groups.length % options.palette.length];
    options.persistGroups([
      ...options.groups,
      createNewGroup({
        id,
        name: `Group ${options.groups.length + 1}`,
        color,
      }),
    ]);
    options.recordOperatorAction(id, "Group added", "A new copy group was created from the board.");
  };

  const renameGroup = (id: string, name: string) => {
    if (id === options.ungroupedId) {
      if (options.isDemo) {
        options.setDemoUngroupedName(name);
        return;
      }

      const previousName = options.ungroupedName;
      void options.persistUngroupedLaneName(name).catch((error) => {
        options.setUngroupedName(previousName);
        try {
          localStorage.setItem("ungrouped-name-v1", previousName);
        } catch {}
        console.error("Failed to save ungrouped lane name:", error);
        options.toast({
          title: "Lane rename failed",
          description:
            error instanceof Error
              ? error.message
              : "Unable to save the ungrouped lane name right now.",
          variant: "destructive",
        });
      });
      return;
    }

    if (options.isDemo) {
      options.setDemoGroups((prev) => prev.map((group) => (group.id === id ? { ...group, name } : group)));
      return;
    }

    options.persistGroups(options.groups.map((group) => (group.id === id ? { ...group, name } : group)));
    options.recordOperatorAction(id, "Group renamed", `The group name was updated to ${name}.`);
  };

  const deleteGroup = (id: string) => {
    if (options.isDemo) {
      return;
    }

    const group = options.groups.find((entry) => entry.id === id);
    const nextAssignments = { ...options.assignments };
    Object.keys(nextAssignments).forEach((accountId) => {
      if (nextAssignments[accountId] === id) {
        delete nextAssignments[accountId];
      }
    });
    options.persistAssignments(nextAssignments);
    options.persistGroups(options.groups.filter((groupEntry) => groupEntry.id !== id));
    options.recordOperatorAction(
      id,
      "Group deleted",
      group
        ? `The copy group ${group.name} was removed and its accounts were returned to the ungrouped lane.`
        : "A copy group was removed and its accounts were returned to the ungrouped lane.",
    );
  };

  const changeColor = (id: string, color: string) => {
    if (options.isDemo) {
      options.setDemoGroups((prev) => prev.map((group) => (group.id === id ? { ...group, color } : group)));
      return;
    }

    options.persistGroups(options.groups.map((group) => (group.id === id ? { ...group, color } : group)));
    options.recordOperatorAction(id, "Color updated", `The copy group color was changed to ${color}.`);
  };

  const toggleGroup = (id: string) => {
    if (options.isDemo) {
      options.setDemoGroups((prev) =>
        prev.map((group) =>
          group.id === id
            ? {
                ...group,
                isActive: !group.isActive,
                runtimePreference: group.isActive ? "paused" : "ready",
              }
            : group,
        ),
      );
      return;
    }

    const targetGroup = options.groups.find((group) => group.id === id);
    const nextIsActive = !(targetGroup?.isActive ?? true);
    options.persistGroups(
      options.groups.map((group) =>
        group.id === id
          ? {
              ...group,
              isActive: !group.isActive,
              runtimePreference: group.isActive ? "paused" : "ready",
            }
          : group,
      ),
    );
    options.recordOperatorAction(
      id,
      nextIsActive ? "Group resumed" : "Group paused",
      nextIsActive
        ? "The operator resumed this copy group from the board."
        : "The operator paused this copy group from the board.",
    );
  };

  const setMaster = (groupId: string, masterId: string | null) => {
    if (options.isDemo) {
      options.setDemoGroups((prev) =>
        prev.map((group) => (group.id === groupId ? { ...group, masterId } : group)),
      );
      return;
    }

    options.persistGroups(
      options.groups.map((group) => (group.id === groupId ? { ...group, masterId } : group)),
    );
    options.recordOperatorAction(
      groupId,
      masterId ? "Master reassigned" : "Master cleared",
      masterId
        ? "The operator assigned a new master account for this copy group."
        : "The operator cleared the current master assignment.",
    );
  };

  const toggleAccountEnabled = (groupId: string, accountId: string) => {
    const updateGroup = (group: TGroup): TGroup => {
      if (group.id !== groupId) {
        return group;
      }

      const isCurrentlyDisabled = (group.disabledAccountIds ?? []).includes(accountId);
      if (isCurrentlyDisabled) {
        return {
          ...group,
          disabledAccountIds: (group.disabledAccountIds ?? []).filter((id) => id !== accountId),
        };
      }

      const newDisabledAccountIds = [...(group.disabledAccountIds ?? []), accountId];
      let newMasterId = group.masterId;
      if (group.masterId === accountId) {
        const nextMaster = getGroupAccounts(groupId).find(
          (account) =>
            account.accountType === "master" &&
            account.id !== accountId &&
            !newDisabledAccountIds.includes(account.id),
        );
        newMasterId = nextMaster ? nextMaster.id : null;
      }

      return {
        ...group,
        disabledAccountIds: newDisabledAccountIds,
        masterId: newMasterId,
      };
    };

    if (options.isDemo) {
      options.setDemoGroups((prev) => prev.map(updateGroup));
      return;
    }

    const targetGroup = options.groups.find((group) => group.id === groupId);
    const isCurrentlyDisabled = targetGroup?.disabledAccountIds?.includes(accountId) ?? false;
    options.persistGroups(options.groups.map(updateGroup));
    options.recordOperatorAction(
      groupId,
      isCurrentlyDisabled ? "Follower resumed" : "Follower paused",
      isCurrentlyDisabled
        ? "The operator re-enabled a follower account in this copy group."
        : "The operator paused a follower account in this copy group.",
    );
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over) {
      return;
    }

    const activeItemId = active.id as string;
    const overId = over.id as string;

    if (activeItemId.startsWith("master-token:")) {
      if (overId.startsWith("master-drop:")) {
        const groupId = activeItemId.slice("master-token:".length);
        const accountId = overId.slice("master-drop:".length);
        setMaster(groupId, accountId);
      }
      return;
    }

    if (activeItemId.startsWith("master-card-token:")) {
      const rest = activeItemId.slice("master-card-token:".length);
      const colonIndex = rest.indexOf(":");
      const groupId = rest.slice(0, colonIndex);
      if (overId.startsWith("master-drop:")) {
        const targetAccountId = overId.slice("master-drop:".length);
        setMaster(groupId, targetAccountId);
      }
      return;
    }

    if (overId.startsWith("master-clear:")) {
      const groupId = overId.slice("master-clear:".length);
      setMaster(groupId, null);
      return;
    }

    const accountId = activeItemId;
    const currentAssignments = options.isDemo ? options.demoAssignments : options.assignments;
    const currentGroups = options.isDemo ? options.demoGroups : options.groups;
    const sourceGroupId = currentAssignments[accountId] ?? options.ungroupedId;

    let targetGroupId = overId;
    if (overId.startsWith("master-drop:")) {
      const targetAccountId = overId.slice("master-drop:".length);
      targetGroupId = currentAssignments[targetAccountId] ?? options.ungroupedId;
    }

    if (sourceGroupId === targetGroupId) {
      return;
    }

    const clearOldMaster = (
      groups: TGroup[],
      assignments: Record<string, string>,
    ): TGroup[] => {
      const oldGroupId = assignments[accountId];
      if (!oldGroupId || oldGroupId === targetGroupId) {
        return groups;
      }

      return groups.map((group) =>
        group.id === oldGroupId && group.masterId === accountId
          ? { ...group, masterId: null }
          : group,
      );
    };

    if (options.isDemo) {
      options.setDemoAssignments((prev) => {
        const nextAssignments = { ...prev };
        if (targetGroupId === options.ungroupedId) {
          delete nextAssignments[accountId];
        } else {
          nextAssignments[accountId] = targetGroupId;
        }
        return nextAssignments;
      });
      options.setDemoGroups((prev) => clearOldMaster(prev, options.demoAssignments));
      return;
    }

    const nextAssignments = { ...options.assignments };
    if (targetGroupId === options.ungroupedId) {
      delete nextAssignments[accountId];
    } else {
      nextAssignments[accountId] = targetGroupId;
    }
    options.persistAssignments(nextAssignments);
    options.persistGroups(clearOldMaster(currentGroups, options.assignments));

    const sourceAudit = buildAccountGroupsTransferAudit({
      sourceGroupId,
      targetGroupId,
      ungroupedId: options.ungroupedId,
      role: "source",
    });
    if (sourceAudit) {
      options.recordOperatorAction(
        sourceGroupId,
        sourceAudit.label,
        sourceAudit.detail,
      );
    }

    const targetAudit = buildAccountGroupsTransferAudit({
      sourceGroupId,
      targetGroupId,
      ungroupedId: options.ungroupedId,
      role: "target",
    });
    if (targetAudit) {
      options.recordOperatorAction(
        targetGroupId,
        targetAudit.label,
        targetAudit.detail,
      );
    }
  };

  return {
    activeId,
    getGroupAccounts,
    addGroup,
    renameGroup,
    deleteGroup,
    changeColor,
    toggleGroup,
    setMaster,
    toggleAccountEnabled,
    handleDragStart,
    handleDragEnd,
  };
}
