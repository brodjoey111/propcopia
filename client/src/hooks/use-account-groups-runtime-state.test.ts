import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getAccountGroupsRiskResetAuditMessage,
  getAccountGroupsRiskUpdatedAuditMessage,
} from "@/hooks/use-account-groups-runtime-state";

test("account groups runtime state keeps snapshot loading and operator audit wiring centralized", () => {
  const source = readFileSync(
    "client/src/hooks/use-account-groups-runtime-state.ts",
    "utf8",
  );

  assert.match(source, /const \[operatorLogByGroupId, setOperatorLogByGroupId\] = useState/);
  assert.match(source, /useQuery<CopyGroupSnapshotApiResponse>\(\{/);
  assert.match(source, /queryKey: \["\/api\/copy-groups\/snapshot"\]/);
  assert.match(source, /enabled: !options\.isDemo && !!options\.userId/);
  assert.match(source, /recordCopyGroupOperatorLogEntry\(current, \{/);
  assert.match(source, /saveCopyGroupOperatorLog\(next\)/);
  assert.match(source, /getAccountGroupsRiskUpdatedAuditMessage/);
  assert.match(source, /getAccountGroupsRiskResetAuditMessage/);
});

test("risk updated audit helper returns the saved-settings message", () => {
  assert.deepEqual(getAccountGroupsRiskUpdatedAuditMessage(), {
    label: "Risk updated",
    detail: "Custom group risk settings were saved.",
  });
});

test("risk reset audit helper returns the reset-to-defaults message", () => {
  assert.deepEqual(getAccountGroupsRiskResetAuditMessage(), {
    label: "Risk reset",
    detail: "Group risk settings were restored to the global defaults.",
  });
});
