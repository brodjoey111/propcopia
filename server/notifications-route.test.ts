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
  assert.match(routesSource, /storage\.getUser\(req\.session\.userId\)/);
  assert.match(routesSource, /buildNotificationDeliveryPreview\(notifications\.notifications/);
  assert.match(routesSource, /notifyTrades: user\.notifyTrades \?\? true/);
  assert.match(routesSource, /notifyErrors: user\.notifyErrors \?\? true/);
  assert.match(routesSource, /notifyConnection: user\.notifyConnection \?\? true/);
  assert.match(routesSource, /unreadEstimate: delivery\.notifications\.length/);
  assert.match(routesSource, /delivery: delivery\.summary/);
  assert.match(routesSource, /operationalLogger\.error\("operations\.notifications_load_failed"/);
  assert.match(routesSource, /message: "Failed to load notifications"/);
});
