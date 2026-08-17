import assert from "node:assert/strict";
import test from "node:test";

import { parseAccountName } from "./account-name";

test("account names are trimmed and bounded", () => {
  assert.deepEqual(parseAccountName({ name: "  Main Rithmic  " }), {
    success: true,
    name: "Main Rithmic",
  });
  assert.equal(parseAccountName({ name: "" }).success, false);
  assert.equal(parseAccountName({ name: "x".repeat(81) }).success, false);
});

test("account name updates reject unknown fields and non-string names", () => {
  assert.equal(parseAccountName({ name: "Account", platform: "Rithmic" }).success, false);
  assert.equal(parseAccountName({ name: 123 }).success, false);
});
