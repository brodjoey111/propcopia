import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildAccountGroupsBoardConnectionActions,
  buildAccountGroupsBoardGroupActions,
  buildAccountGroupsBoardRiskState,
} from "@/hooks/use-account-groups-board-content-state";

test("account groups board content state hook bundles board actions and state into grouped props", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-board-content-state.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsBoardContentState/);
  assert.match(source, /buildAccountGroupsBoardGroupActions/);
  assert.match(source, /buildAccountGroupsBoardConnectionActions/);
  assert.match(source, /buildAccountGroupsBoardRiskState/);
  assert.match(source, /runtimeState: options\.runtimeState/);
  assert.match(source, /ungroupedAccounts: options\.ungroupedAccounts/);
});

test("board content state helpers preserve the provided board action callbacks and flags", () => {
  const renameGroup = () => undefined;
  const deleteGroup = () => undefined;
  const changeColor = () => undefined;
  const toggleGroup = () => undefined;
  const setMaster = () => undefined;
  const toggleAccountEnabled = () => undefined;
  const saveGroupRiskSetting = () => undefined;
  const clearGroupRiskSetting = () => undefined;
  const applyGroupRuntimePreference = () => undefined;
  const onConnect = () => undefined;
  const onDisconnect = () => undefined;

  const groupActions = buildAccountGroupsBoardGroupActions({
    renameGroup,
    deleteGroup,
    changeColor,
    toggleGroup,
    setMaster,
    toggleAccountEnabled,
    saveGroupRiskSetting,
    clearGroupRiskSetting,
    applyGroupRuntimePreference,
  });
  const connectionActions = buildAccountGroupsBoardConnectionActions({
    onConnect,
    onDisconnect,
    accountActionDisabled: true,
    getConnectButtonLabel: (accountId) => `connect:${accountId}`,
    getDisconnectButtonLabel: (accountId) => `disconnect:${accountId}`,
  });

  assert.equal(groupActions.renameGroup, renameGroup);
  assert.equal(groupActions.deleteGroup, deleteGroup);
  assert.equal(groupActions.applyGroupRuntimePreference, applyGroupRuntimePreference);
  assert.equal(connectionActions.onConnect, onConnect);
  assert.equal(connectionActions.onDisconnect, onDisconnect);
  assert.equal(connectionActions.accountActionDisabled, true);
  assert.equal(connectionActions.getConnectButtonLabel?.("acct-1"), "connect:acct-1");
  assert.equal(
    connectionActions.getDisconnectButtonLabel?.("acct-1"),
    "disconnect:acct-1",
  );
});

test("board content state risk helper preserves grouped risk settings and account risk rows", () => {
  const riskState = buildAccountGroupsBoardRiskState({
    groupRiskSettings: {
      "group-1": { maxContracts: 2 },
    },
    accountRiskById: {
      "acct-1": {
        accountId: "acct-1",
        tone: "warn",
        label: "Review needed",
        detail: "Sizing limit reached.",
      },
    },
  });

  assert.deepEqual(riskState.groupRiskSettings, {
    "group-1": { maxContracts: 2 },
  });
  assert.equal(riskState.accountRiskById["acct-1"]?.tone, "warn");
  assert.equal(riskState.accountRiskById["acct-1"]?.detail, "Sizing limit reached.");
});
