import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./settings.tsx", import.meta.url), "utf8");

test("settings provides an authenticated password-change flow", () => {
  assert.match(source, /Account Security/);
  assert.match(source, /\/api\/auth\/change-password/);
  assert.match(source, /input-current-password/);
  assert.match(source, /input-new-password/);
  assert.match(source, /input-confirm-new-password/);
  assert.match(source, /PASSWORD_MIN_LENGTH/);
  assert.match(source, /setCurrentPassword\(""\)/);
});
