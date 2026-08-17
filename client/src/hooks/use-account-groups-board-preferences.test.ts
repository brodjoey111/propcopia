import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupsClearedRiskSettings,
  buildAccountGroupsSavedRiskSettings,
  loadStoredBannerDismissed,
  loadStoredGroupRiskSettings,
  loadStoredUngroupedName,
  persistStoredBannerDismissed,
  persistStoredGroupRiskSettings,
  persistStoredUngroupedName,
  resolveAccountGroupsPersistedUngroupedName,
} from "@/hooks/use-account-groups-board-preferences";

test("account groups board preferences hook centralizes board view, banner, ungrouped naming, and group risk persistence", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-board-preferences.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsBoardPreferences/);
  assert.match(source, /ungrouped-name-v1/);
  assert.match(source, /demo-banner-dismissed/);
  assert.match(source, /group-risk-settings-v1/);
  assert.match(source, /const \[ungroupedName, setUngroupedName\] = useState/);
  assert.match(source, /const \[demoUngroupedName, setDemoUngroupedName\] = useState\("Ungrouped"\)/);
  assert.match(source, /const \[bannerDismissed, setBannerDismissed\] = useState/);
  assert.match(source, /const \[boardView, setBoardView\] = useState<AccountGroupsBoardView>\("compact"\)/);
  assert.match(source, /const \[subView, setSubView\] = useState<AccountGroupsSubView>\("kanban"\)/);
  assert.match(source, /resolveAccountGroupsPersistedUngroupedName/);
  assert.match(source, /buildAccountGroupsSavedRiskSettings/);
  assert.match(source, /buildAccountGroupsClearedRiskSettings/);
  assert.match(source, /saveGroupRiskSetting/);
  assert.match(source, /clearGroupRiskSetting/);
  assert.match(source, /dismissBanner/);
  assert.match(source, /persistStoredBannerDismissed/);
  assert.match(source, /serverUngroupedName/);
});

test("board preferences storage helpers load and persist ungrouped names and banner dismissal safely", () => {
  const storageState = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return storageState.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storageState.set(key, value);
    },
  } as Storage;

  assert.equal(loadStoredUngroupedName(storage), "Ungrouped");
  assert.equal(loadStoredBannerDismissed(storage), false);

  persistStoredUngroupedName("Operations Desk", storage);
  persistStoredBannerDismissed(storage);

  assert.equal(loadStoredUngroupedName(storage), "Operations Desk");
  assert.equal(loadStoredBannerDismissed(storage), true);
});

test("board preferences storage helpers load and persist group risk settings safely", () => {
  const storageState = new Map<string, string>();
  const storage = {
    getItem(key: string) {
      return storageState.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      storageState.set(key, value);
    },
  } as Storage;

  assert.deepEqual(loadStoredGroupRiskSettings(storage), {});

  persistStoredGroupRiskSettings(
    {
      "group-1": {
        maxContracts: 3,
        reverseCopying: true,
      },
    },
    storage,
  );

  assert.deepEqual(loadStoredGroupRiskSettings(storage), {
    "group-1": {
      maxContracts: 3,
      reverseCopying: true,
    },
  });
});

test("board preferences helpers normalize server names and risk-setting map updates", () => {
  assert.equal(resolveAccountGroupsPersistedUngroupedName("  Desk Alpha  "), "Desk Alpha");
  assert.equal(resolveAccountGroupsPersistedUngroupedName(""), "Ungrouped");
  assert.equal(resolveAccountGroupsPersistedUngroupedName(null), "Ungrouped");

  const saved = buildAccountGroupsSavedRiskSettings(
    {
      "group-1": { maxContracts: 2 },
    },
    "group-2",
    {
      maxDailyLoss: 500,
      onBreachAction: "pause",
    } as any,
  );

  assert.deepEqual(saved, {
    "group-1": { maxContracts: 2 },
    "group-2": { maxDailyLoss: 500, onBreachAction: "pause" },
  });

  const cleared = buildAccountGroupsClearedRiskSettings(saved, "group-1");
  assert.deepEqual(cleared, {
    "group-2": { maxDailyLoss: 500, onBreachAction: "pause" },
  });
});
