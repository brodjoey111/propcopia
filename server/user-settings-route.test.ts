import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("routes expose the authenticated user settings update path", () => {
  const routesSource = readFileSync("server/routes.ts", "utf8");
  const schemaSource = readFileSync("shared/schema.ts", "utf8");
  const storageSource = readFileSync("server/storage.ts", "utf8");

  assert.match(routesSource, /app\.patch\("\/api\/user\/settings"/);
  assert.match(routesSource, /if \(!req\.session\?\.userId\)/);
  assert.match(routesSource, /updateUserSettingsSchema\.safeParse/);
  assert.match(routesSource, /storage\.updateUserSettings/);
  assert.match(routesSource, /operationalLogger\.error\("user\.settings_update_failed"/);
  assert.match(routesSource, /message: "Failed to update settings"/);
  assert.match(routesSource, /showReviewedNotifications:\s*user\.showReviewedNotifications\s*\?\?\s*true/);
  assert.match(routesSource, /copyGroupsUngroupedName:\s*user\.copyGroupsUngroupedName\s*\?\?\s*"Ungrouped"/);
  assert.match(routesSource, /activityQueueSort:\s*user\.activityQueueSort\s*\?\?\s*"recent"/);
  assert.match(routesSource, /activityQueueAuditFocus:\s*user\.activityQueueAuditFocus\s*\?\?\s*"all"/);
  assert.match(routesSource, /copyGroupHealthReviewFilter:\s*user\.copyGroupHealthReviewFilter\s*\?\?\s*"all"/);
  assert.match(routesSource, /copyGroupHealthReviewsJson:\s*user\.copyGroupHealthReviewsJson\s*\?\?\s*null/);
  assert.match(routesSource, /riskFollowUpReviewsJson:\s*user\.riskFollowUpReviewsJson\s*\?\?\s*null/);
  assert.match(schemaSource, /showReviewedNotifications:\s*boolean\("show_reviewed_notifications"\)\.default\(true\)/);
  assert.match(schemaSource, /copyGroupsUngroupedName:\s*text\("copy_groups_ungrouped_name"\)\.default\("Ungrouped"\)/);
  assert.match(schemaSource, /activityQueueSort:\s*text\("activity_queue_sort"\)\.default\("recent"\)/);
  assert.match(schemaSource, /activityQueueAuditFocus:\s*text\("activity_queue_audit_focus"\)\.default\("all"\)/);
  assert.match(schemaSource, /copyGroupHealthReviewFilter:\s*text\("copy_group_health_review_filter"\)\.default\("all"\)/);
  assert.match(schemaSource, /copyGroupHealthReviewsJson:\s*text\("copy_group_health_reviews_json"\)/);
  assert.match(schemaSource, /riskFollowUpReviewsJson:\s*text\("risk_follow_up_reviews_json"\)/);
  assert.match(schemaSource, /showReviewedNotifications:\s*true,/);
  assert.match(schemaSource, /copyGroupsUngroupedName:\s*true,/);
  assert.match(schemaSource, /activityQueueSort:\s*true,/);
  assert.match(schemaSource, /activityQueueAuditFocus:\s*true,/);
  assert.match(schemaSource, /copyGroupHealthReviewFilter:\s*true,/);
  assert.match(schemaSource, /copyGroupHealthReviewsJson:\s*true,/);
  assert.match(schemaSource, /riskFollowUpReviewsJson:\s*true,/);
  assert.match(storageSource, /showReviewedNotifications:\s*true,/);
  assert.match(storageSource, /copyGroupsUngroupedName:\s*"Ungrouped",/);
  assert.match(storageSource, /activityQueueSort:\s*"recent",/);
  assert.match(storageSource, /activityQueueAuditFocus:\s*"all",/);
  assert.match(storageSource, /copyGroupHealthReviewFilter:\s*"all",/);
  assert.match(storageSource, /copyGroupHealthReviewsJson:\s*null,/);
  assert.match(storageSource, /riskFollowUpReviewsJson:\s*null,/);
  assert.match(
    storageSource,
    /showReviewedNotifications:\s*settings\.showReviewedNotifications\s*\?\?\s*user\.showReviewedNotifications/,
  );
  assert.match(
    storageSource,
    /copyGroupsUngroupedName:\s*settings\.copyGroupsUngroupedName\s*\?\?\s*user\.copyGroupsUngroupedName/,
  );
  assert.match(
    storageSource,
    /activityQueueSort:\s*settings\.activityQueueSort\s*\?\?\s*user\.activityQueueSort/,
  );
  assert.match(
    storageSource,
    /activityQueueAuditFocus:\s*settings\.activityQueueAuditFocus\s*\?\?\s*user\.activityQueueAuditFocus/,
  );
  assert.match(
    storageSource,
    /copyGroupHealthReviewFilter:\s*settings\.copyGroupHealthReviewFilter\s*\?\?\s*user\.copyGroupHealthReviewFilter/,
  );
  assert.match(
    storageSource,
    /copyGroupHealthReviewsJson:\s*settings\.copyGroupHealthReviewsJson\s*\?\?\s*user\.copyGroupHealthReviewsJson/,
  );
  assert.match(
    storageSource,
    /riskFollowUpReviewsJson:\s*settings\.riskFollowUpReviewsJson\s*\?\?\s*user\.riskFollowUpReviewsJson/,
  );
});
