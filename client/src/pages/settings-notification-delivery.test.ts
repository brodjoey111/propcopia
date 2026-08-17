import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./settings.tsx", import.meta.url), "utf8");

test("settings accurately reports available notification delivery channels", () => {
  assert.match(source, /In-app/);
  assert.match(source, /Active while PropCopia is open/);
  assert.match(source, /Email/);
  assert.match(source, /Push/);
  assert.equal((source.match(/Not connected yet/g) ?? []).length, 2);
});
