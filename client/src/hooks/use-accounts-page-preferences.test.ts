import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("accounts page preferences hook centralizes local persistence and session master selection", () => {
  const source = readFileSync("client/src/hooks/use-accounts-page-preferences.ts", "utf8");

  assert.match(source, /useAccountsPagePreferences/);
  assert.match(source, /accounts-view-mode/);
  assert.match(source, /accounts-roster-filter/);
  assert.match(source, /accounts-roster-sort/);
  assert.match(source, /copy-session-master-account-id/);
  assert.match(source, /global-risk-settings-v1/);
  assert.match(source, /DEFAULT_RISK_SETTINGS/);
  assert.match(source, /localStorage\.getItem/);
  assert.match(source, /localStorage\.setItem/);
  assert.match(source, /localStorage\.removeItem/);
  assert.match(source, /setViewMode/);
  assert.match(source, /normalizeAccountsViewMode/);
  assert.match(source, /value === "list" \|\| value === "table" \|\| value === "groups" \? value : "grid"/);
  assert.match(source, /normalizeAccountRosterFilter/);
  assert.match(source, /normalizeAccountRosterSort/);
  assert.match(source, /setRosterFilter/);
  assert.match(source, /setRosterSort/);
  assert.match(source, /setSessionMasterAccountId/);
  assert.match(source, /activeSessionMasterAccountId: options\.serverMasterAccountId \?\? sessionMasterAccountId/);
  assert.match(source, /options\.connectedAccountIds\.includes\(sessionMasterAccountId\)/);
  assert.match(source, /saveGlobalSettings/);
  assert.match(source, /JSON\.stringify\(settings\)/);
  assert.match(source, /\/api\/risk-settings\/global/);
  assert.match(source, /credentials: "include"/);
  assert.match(source, /globalSettingsServerSynced/);
  assert.match(source, /!payload\.stored && cachedSettings/);
});
