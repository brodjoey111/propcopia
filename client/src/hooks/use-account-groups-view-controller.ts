import { useEffect } from "react";
import {
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { Account } from "@shared/schema";
import type { TradingGroup } from "@/components/account-groups-model";

interface UseAccountGroupsViewControllerOptions {
  isDemo: boolean;
  accounts: Account[];
  demoAccounts: Account[];
  groups: TradingGroup[];
  demoGroups: TradingGroup[];
  assignments: Record<string, string>;
  demoAssignments: Record<string, string>;
  setGroups: React.Dispatch<React.SetStateAction<TradingGroup[]>>;
  setAssignments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  persistSavedGroups: (groups: TradingGroup[]) => void;
  persistSavedAssignments: (assignments: Record<string, string>) => void;
}

export function selectAccountGroupsViewData(
  options: Pick<
    UseAccountGroupsViewControllerOptions,
    | "isDemo"
    | "accounts"
    | "demoAccounts"
    | "groups"
    | "demoGroups"
    | "assignments"
    | "demoAssignments"
  >,
) {
  return {
    displayAccounts: options.isDemo ? options.demoAccounts : options.accounts,
    displayGroups: options.isDemo ? options.demoGroups : options.groups,
    displayAssign: options.isDemo
      ? options.demoAssignments
      : options.assignments,
  };
}

export function buildAccountGroupsPersistenceAdapters(
  options: Pick<
    UseAccountGroupsViewControllerOptions,
    | "setGroups"
    | "setAssignments"
    | "persistSavedGroups"
    | "persistSavedAssignments"
  >,
) {
  return {
    persistGroups: (next: TradingGroup[]) => {
      options.setGroups(next);
      options.persistSavedGroups(next);
    },
    persistAssignments: (next: Record<string, string>) => {
      options.setAssignments(next);
      options.persistSavedAssignments(next);
    },
  };
}

export function useAccountGroupsViewController(
  options: UseAccountGroupsViewControllerOptions,
) {
  const { displayAccounts, displayGroups, displayAssign } =
    selectAccountGroupsViewData(options);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 },
    }),
  );

  const { persistGroups, persistAssignments } =
    buildAccountGroupsPersistenceAdapters(options);

  return {
    displayAccounts,
    displayGroups,
    displayAssign,
    sensors,
    persistGroups,
    persistAssignments,
  };
}

interface UseAccountGroupsAddGroupTriggerOptions {
  addGroupTrigger?: number;
  addGroup: () => void;
}

export function useAccountGroupsAddGroupTrigger(
  options: UseAccountGroupsAddGroupTriggerOptions,
) {
  useEffect(() => {
    if (!options.addGroupTrigger) {
      return;
    }

    options.addGroup();
  }, [options.addGroup, options.addGroupTrigger]);
}
