import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("account groups demo banner keeps the onboarding copy and dismiss action together", () => {
  const source = readFileSync("client/src/components/account-groups-demo-banner.tsx", "utf8");

  assert.match(source, /Interactive demo — try it now/);
  assert.match(source, /Drag the example cards between groups using the ⠿ handle/);
  assert.match(source, /onClick=\{onDismiss\}/);
});
