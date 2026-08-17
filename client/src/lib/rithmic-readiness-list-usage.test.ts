import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const page of ["../pages/accounts.tsx", "../pages/dashboard.tsx"]) {
  test(`${page} loads Rithmic readiness with one aggregate request`, () => {
    const source = readFileSync(new URL(page, import.meta.url), "utf8");
    assert.match(source, /fetch\(["']\/api\/accounts\/rithmic-readiness["']/);
    assert.doesNotMatch(source, /Promise\.all\([\s\S]*rithmic-readiness/);
    assert.match(source, /rithmicReadinessData\?\.accounts\.map/);
  });
}
