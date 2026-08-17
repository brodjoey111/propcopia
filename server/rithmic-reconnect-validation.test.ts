import test from "node:test";
import assert from "node:assert/strict";

import { RithmicReconnectValidationStore } from "./rithmic-reconnect-validation";

test("RithmicReconnectValidationStore records and clears saved reconnect validation", () => {
  const store = new RithmicReconnectValidationStore();

  store.markValidated("acct-1", {
    validatedAt: "2026-08-12T18:00:00.000Z",
    source: "saved_connect",
  });

  assert.deepEqual(store.get("acct-1"), {
    validatedAt: "2026-08-12T18:00:00.000Z",
    source: "saved_connect",
  });

  store.clear("acct-1");
  assert.equal(store.get("acct-1"), undefined);
});
