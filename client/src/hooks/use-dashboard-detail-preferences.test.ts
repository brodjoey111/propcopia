import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("dashboard detail preferences hook centralizes delayed loading and detail toggles", () => {
  const source = readFileSync("client/src/hooks/use-dashboard-detail-preferences.ts", "utf8");

  assert.match(source, /useDashboardDetailPreferences/);
  assert.match(source, /const \[loadDetailSections, setLoadDetailSections\] = useState\(false\)/);
  assert.match(source, /const \[showAccountRoster, setShowAccountRoster\] = useState\(false\)/);
  assert.match(source, /const \[showOpenPositions, setShowOpenPositions\] = useState\(false\)/);
  assert.match(source, /const \[showCopyGroupDetail, setShowCopyGroupDetail\] = useState\(false\)/);
  assert.match(source, /const \[showPositionSyncDetail, setShowPositionSyncDetail\] = useState\(false\)/);
  assert.match(source, /selectedPositionSyncGroupId/);
  assert.match(source, /window\.setTimeout\(\(\) => \{\s*setLoadDetailSections\(true\);/);
  assert.match(source, /if \(options\.usingMockData\) \{/);
  assert.match(source, /setShowAccountRoster\(true\)/);
  assert.match(source, /setShowOpenPositions\(true\)/);
  assert.match(source, /setShowCopyGroupDetail\(true\)/);
  assert.match(source, /setShowPositionSyncDetail\(true\)/);
  assert.match(source, /if \(!showPositionSyncDetail\) \{/);
  assert.match(source, /setSelectedPositionSyncGroupId\(null\)/);
});
