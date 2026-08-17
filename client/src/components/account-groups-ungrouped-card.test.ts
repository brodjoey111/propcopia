import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildAccountGroupsUngroupedCardButtonLabels } from "@/components/account-groups-ungrouped-card";

test("account groups ungrouped card keeps connection bindings and button label mapping together", () => {
  const source = readFileSync(
    "client/src/components/account-groups-ungrouped-card.tsx",
    "utf8",
  );

  assert.match(source, /buildAccountGroupCardConnectionBindings/);
  assert.match(source, /buildAccountGroupsUngroupedCardButtonLabels/);
  assert.match(source, /<AccountGroupsDraggableCard/);
  assert.match(source, /compactView=\{compactView\}/);
});

test("ungrouped card button label helper resolves optional connect and disconnect labels", () => {
  assert.deepEqual(
    buildAccountGroupsUngroupedCardButtonLabels({
      accountId: "acct-1",
      getConnectButtonLabel: (accountId) => `connect:${accountId}`,
      getDisconnectButtonLabel: (accountId) => `disconnect:${accountId}`,
    }),
    {
      connectButtonLabel: "connect:acct-1",
      disconnectButtonLabel: "disconnect:acct-1",
    },
  );

  assert.deepEqual(
    buildAccountGroupsUngroupedCardButtonLabels({
      accountId: "acct-2",
    }),
    {
      connectButtonLabel: undefined,
      disconnectButtonLabel: undefined,
    },
  );
});
