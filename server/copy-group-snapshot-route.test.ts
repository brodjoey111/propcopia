import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("copy-group snapshot route returns preview activity instead of full history payloads", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/copy-groups\/snapshot"/);
  assert.match(routesSource, /runtimeSummary:\s*buildCopyGroupRuntimeSummary\(/);
  assert.match(routesSource, /activityPreview:\s*\(activityByGroupId\[registeredGroup\.group\.groupId\] \?\? \[\]\)\.slice\(0,\s*6\)/);
  assert.doesNotMatch(routesSource, /activity:\s*activityByGroupId\[registeredGroup\.group\.groupId\]/);
  assert.doesNotMatch(routesSource, /statistics:\s*runtime\.statistics/);
  assert.doesNotMatch(routesSource, /health:\s*runtime\.health/);
});
