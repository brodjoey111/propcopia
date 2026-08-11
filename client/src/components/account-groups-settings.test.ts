import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("account groups persist the ungrouped lane name through user settings", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");

  assert.match(source, /user\.copyGroupsUngroupedName\?\.trim\(\)\s*\|\|\s*"Ungrouped"/);
  assert.match(source, /apiRequest\("PATCH", "\/api\/user\/settings", \{\s*copyGroupsUngroupedName: trimmedName,/);
  assert.match(source, /queryClient\.setQueryData\(\["\/api\/auth\/me"\], payload\)/);
});

test("account groups hydrate persisted group risk settings from the server snapshot", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");

  assert.match(source, /setGroupRiskSettings\(\(currentSettings\) => \{/);
  assert.match(source, /const nextSettings = nextBoardState\.groupRiskSettings/);
  assert.match(source, /localStorage\.setItem\("group-risk-settings-v1", nextSettingsSignature\)/);
});

test("account groups load full history only when the history dialog opens", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");

  assert.match(source, /const \[historyOpen, setHistoryOpen\] = useState\(false\)/);
  assert.match(source, /fetch\(`\/api\/copy-groups\/\$\{group\.id\}\/activity`/);
  assert.match(source, /registeredGroup\.activityPreview/);
});

test("account groups highlight copy groups restored safely after reload", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");

  assert.match(source, /runtimeSummary\?\.label === "Restored offline"/);
  assert.match(source, /Reload recovery/);
  assert.match(source, /Review recent group history before restarting this copy group\./);
});

test("account groups show a compact recovery snapshot from preview activity", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");

  assert.match(source, /recentWarningCount/);
  assert.match(source, /recentErrorCount/);
  assert.match(source, /recentLifecycleCount/);
  assert.match(source, /recentHealthCount/);
  assert.match(source, /latestPreviewMessage/);
  assert.match(source, /Recovery Snapshot/);
  assert.match(source, /recent error/);
  assert.match(source, /lifecycle update/);
  assert.match(source, /health signal/);
  assert.match(source, /Latest: /);
});

test("account groups surface last operator action and hold reason summaries", () => {
  const source = readFileSync("client/src/components/account-groups.tsx", "utf8");

  assert.match(source, /describeLatestOperatorAction/);
  assert.match(source, /describeHoldReason/);
  assert.match(source, /latestOperatorAction/);
  assert.match(source, /holdReason/);
  assert.match(source, /Last operator action/);
  assert.match(source, /Hold reason/);
  assert.match(source, /Emergency stop applied/);
  assert.match(source, /Paused by operator/);
  assert.match(source, /Recovered into ready state after reload/);
});
