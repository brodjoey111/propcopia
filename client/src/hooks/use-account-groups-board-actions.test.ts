import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildAccountGroupsTransferAudit } from "@/hooks/use-account-groups-board-actions";

test("account groups board actions keep drag routing and transfer audits centralized", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-board-actions.ts",
    "utf8",
  );

  assert.match(source, /useAccountGroupsBoardActions/);
  assert.match(source, /const \[activeId, setActiveId\] = useState<string \| null>\(null\)/);
  assert.match(source, /const getGroupAccounts = \(groupId: string\): Account\[] => \{/);
  assert.match(source, /const addGroup = \(\) => \{/);
  assert.match(source, /const renameGroup = \(id: string, name: string\) => \{/);
  assert.match(source, /const deleteGroup = \(id: string\) => \{/);
  assert.match(source, /const changeColor = \(id: string, color: string\) => \{/);
  assert.match(source, /const toggleGroup = \(id: string\) => \{/);
  assert.match(source, /const setMaster = \(groupId: string, masterId: string \| null\) => \{/);
  assert.match(source, /const toggleAccountEnabled = \(groupId: string, accountId: string\) => \{/);
  assert.match(source, /const handleDragStart = \(event: DragStartEvent\) => \{/);
  assert.match(source, /const handleDragEnd = \(event: DragEndEvent\) => \{/);
  assert.match(source, /persistUngroupedLaneName\(name\)\.catch/);
  assert.match(source, /activeItemId\.startsWith\("master-token:"\)/);
  assert.match(source, /activeItemId\.startsWith\("master-card-token:"\)/);
  assert.match(source, /overId\.startsWith\("master-clear:"\)/);
  assert.match(source, /buildAccountGroupsTransferAudit/);
});

test("transfer audit helper describes moving an account out of a group", () => {
  assert.deepEqual(
    buildAccountGroupsTransferAudit({
      sourceGroupId: "group-a",
      targetGroupId: "group-b",
      ungroupedId: "ungrouped",
      role: "source",
    }),
    {
      label: "Account moved",
      detail: "The operator moved an account from this copy group to another copy group.",
    },
  );
});

test("transfer audit helper describes returning an account to ungrouped", () => {
  assert.deepEqual(
    buildAccountGroupsTransferAudit({
      sourceGroupId: "group-a",
      targetGroupId: "ungrouped",
      ungroupedId: "ungrouped",
      role: "source",
    }),
    {
      label: "Account ungrouped",
      detail: "The operator returned an account from this copy group to the ungrouped lane.",
    },
  );
});

test("transfer audit helper describes assigning an account into a group", () => {
  assert.deepEqual(
    buildAccountGroupsTransferAudit({
      sourceGroupId: "ungrouped",
      targetGroupId: "group-b",
      ungroupedId: "ungrouped",
      role: "target",
    }),
    {
      label: "Account assigned",
      detail: "The operator assigned an account from the ungrouped lane into this copy group.",
    },
  );
});

test("transfer audit helper skips source and target logs when the lane should stay silent", () => {
  assert.equal(
    buildAccountGroupsTransferAudit({
      sourceGroupId: "ungrouped",
      targetGroupId: "group-b",
      ungroupedId: "ungrouped",
      role: "source",
    }),
    null,
  );

  assert.equal(
    buildAccountGroupsTransferAudit({
      sourceGroupId: "group-a",
      targetGroupId: "ungrouped",
      ungroupedId: "ungrouped",
      role: "target",
    }),
    null,
  );
});
