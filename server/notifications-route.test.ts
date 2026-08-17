import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose the authenticated notifications endpoint", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");

  assert.match(routesSource, /app\.get\("\/api\/notifications"/);
  assert.match(routesSource, /req\.session\?\.userId/);
  assert.match(routesSource, /buildNotifications/);
  assert.match(routesSource, /copyGroupManager\s*\.\s*getAllGroups\(\)/);
  assert.match(routesSource, /getObservability:\s*\(groupId\)\s*=>\s*copyGroupManager\.getRuntime\(groupId\)\?\.observability/);
  assert.match(routesSource, /copyGroupAlertStore\.listActiveStories/);
  assert.match(routesSource, /tradovateInstances/);
  assert.match(routesSource, /tradeifyInstances/);
  assert.match(routesSource, /rithmicInstances/);
  assert.match(routesSource, /rithmicReconnectValidationStore/);
  assert.match(routesSource, /rithmicReadinessReviewStore/);
});
