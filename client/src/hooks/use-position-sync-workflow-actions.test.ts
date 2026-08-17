import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("position sync workflow actions use the server-owned simulation endpoint", () => {
  const source = readFileSync(
    "client/src/hooks/use-position-sync-workflow-actions.ts",
    "utf8",
  );

  assert.match(source, /simulatePositionSyncMutation = useMutation/);
  assert.match(source, /apiRequest\("POST", "\/api\/position-sync\/simulations", target\)/);
  assert.match(source, /simulations: results\.map/);
  assert.match(source, /options\.onSimulationSuccess\?\./);
});
