import test from "node:test";
import assert from "node:assert/strict";
import { resolveRithmicSystemName } from "./rithmic-system-name.ts";

test("resolveRithmicSystemName prefers the stored system name", () => {
  assert.equal(
    resolveRithmicSystemName({
      name: "APEX-62683 - apex",
      rithmicSystemName: "Rithmic 01",
    }),
    "Rithmic 01",
  );
});

test("resolveRithmicSystemName falls back to the account name suffix for older saved accounts", () => {
  assert.equal(
    resolveRithmicSystemName({
      name: "brodjoey111@gmail.com — Rithmic Test",
      rithmicSystemName: null,
    }),
    "Rithmic Test",
  );
});

test("resolveRithmicSystemName uses the default when no stored or derived value exists", () => {
  assert.equal(
    resolveRithmicSystemName({
      name: "Primary Rithmic Account",
      rithmicSystemName: null,
    }),
    "Rithmic Test",
  );
});
