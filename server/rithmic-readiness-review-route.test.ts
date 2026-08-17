import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routesSource = readFileSync(new URL("./routes.ts", import.meta.url), "utf8");

test("routes expose authenticated Rithmic readiness review read and write endpoints", () => {
  assert.match(routesSource, /app\.get\("\/api\/rithmic-readiness\/reviews"/);
  assert.match(routesSource, /app\.post\("\/api\/rithmic-readiness\/reviews"/);
  assert.match(routesSource, /Invalid Rithmic readiness review payload/);
  assert.match(routesSource, /clearRuntimeSnapshotCache\(req\.session\.userId\)/);
});
