import { useEffect, useState } from "react";

import type { RiskSettings } from "@/components/risk-settings-dialog";

export type AccountGroupsBoardView = "compact" | "detailed";
export type AccountGroupsSubView = "kanban" | "ungrouped";
const UNGROUPED_NAME_STORAGE_KEY = "ungrouped-name-v1";
const DEMO_BANNER_DISMISSED_STORAGE_KEY = "demo-banner-dismissed";
const GROUP_RISK_SETTINGS_STORAGE_KEY = "group-risk-settings-v1";

interface UseAccountGroupsBoardPreferencesOptions {
  isDemo: boolean;
  userId?: string | null;
  serverUngroupedName?: string | null;
}

export function resolveAccountGroupsPersistedUngroupedName(
  serverUngroupedName?: string | null,
) {
  return serverUngroupedName?.trim() || "Ungrouped";
}

export function loadStoredUngroupedName(
  storage: Storage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
) {
  try {
    return storage?.getItem(UNGROUPED_NAME_STORAGE_KEY) || "Ungrouped";
  } catch {
    return "Ungrouped";
  }
}

export function loadStoredBannerDismissed(
  storage: Storage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
) {
  try {
    return storage?.getItem(DEMO_BANNER_DISMISSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function loadStoredGroupRiskSettings(
  storage: Storage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
): Record<string, Partial<RiskSettings>> {
  try {
    const raw = storage?.getItem(GROUP_RISK_SETTINGS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<RiskSettings>>) : {};
  } catch {
    return {};
  }
}

export function persistStoredUngroupedName(
  value: string,
  storage: Storage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
) {
  try {
    storage?.setItem(UNGROUPED_NAME_STORAGE_KEY, value);
  } catch {}
}

export function persistStoredBannerDismissed(
  storage: Storage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
) {
  try {
    storage?.setItem(DEMO_BANNER_DISMISSED_STORAGE_KEY, "1");
  } catch {}
}

export function persistStoredGroupRiskSettings(
  settings: Record<string, Partial<RiskSettings>>,
  storage: Storage | undefined = typeof window !== "undefined"
    ? window.localStorage
    : undefined,
) {
  try {
    storage?.setItem(GROUP_RISK_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

export function buildAccountGroupsSavedRiskSettings(
  current: Record<string, Partial<RiskSettings>>,
  groupId: string,
  settings: RiskSettings,
) {
  return {
    ...current,
    [groupId]: settings,
  };
}

export function buildAccountGroupsClearedRiskSettings(
  current: Record<string, Partial<RiskSettings>>,
  groupId: string,
) {
  const next = { ...current };
  delete next[groupId];
  return next;
}

export function useAccountGroupsBoardPreferences(
  options: UseAccountGroupsBoardPreferencesOptions,
) {
  const [ungroupedName, setUngroupedName] = useState(loadStoredUngroupedName);
  const [demoUngroupedName, setDemoUngroupedName] = useState("Ungrouped");
  const [bannerDismissed, setBannerDismissed] = useState(
    loadStoredBannerDismissed,
  );
  const [boardView, setBoardView] = useState<AccountGroupsBoardView>("compact");
  const [subView, setSubView] = useState<AccountGroupsSubView>("kanban");
  const [groupRiskSettings, setGroupRiskSettings] = useState<
    Record<string, Partial<RiskSettings>>
  >(loadStoredGroupRiskSettings);

  useEffect(() => {
    if (options.isDemo || !options.userId) {
      return;
    }

    const persistedName = resolveAccountGroupsPersistedUngroupedName(
      options.serverUngroupedName,
    );
    setUngroupedName((currentName) => {
      if (currentName === persistedName) {
        return currentName;
      }

      persistStoredUngroupedName(persistedName);
      return persistedName;
    });
  }, [options.isDemo, options.serverUngroupedName, options.userId]);

  const saveGroupRiskSetting = (groupId: string, settings: RiskSettings) => {
    setGroupRiskSettings((prev) => {
      const next = buildAccountGroupsSavedRiskSettings(prev, groupId, settings);
      persistStoredGroupRiskSettings(next);
      return next;
    });
  };

  const clearGroupRiskSetting = (groupId: string) => {
    setGroupRiskSettings((prev) => {
      const next = buildAccountGroupsClearedRiskSettings(prev, groupId);
      persistStoredGroupRiskSettings(next);
      return next;
    });
  };

  const replaceGroupRiskSettings = (
    updater: Record<string, Partial<RiskSettings>> | ((current: Record<string, Partial<RiskSettings>>) => Record<string, Partial<RiskSettings>>),
  ) => {
    setGroupRiskSettings((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      return next;
    });
  };

  const dismissBanner = () => {
    setBannerDismissed(true);
    persistStoredBannerDismissed();
  };

  return {
    ungroupedName,
    setUngroupedName,
    demoUngroupedName,
    setDemoUngroupedName,
    bannerDismissed,
    dismissBanner,
    boardView,
    setBoardView,
    subView,
    setSubView,
    groupRiskSettings,
    setGroupRiskSettings: replaceGroupRiskSettings,
    saveGroupRiskSetting,
    clearGroupRiskSetting,
  };
}
