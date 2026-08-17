import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("execution follow-up signal summary renders compact and detailed checkpoint cues", () => {
  const source = readFileSync("client/src/components/execution-follow-up-signal-summary.tsx", "utf8");

  assert.match(source, /Lifecycle checkpoint/);
  assert.match(source, /Recovery window/);
  assert.match(source, /variant === "compact"/);
  assert.match(source, /checkpoint/);
  assert.match(source, /recoveryWindow/);
  assert.match(source, /getExecutionFollowUpSignalBadgeClass/);
  assert.match(source, /getExecutionFollowUpSignalPanelClass/);
  assert.match(source, /getExecutionFollowUpSignalDetailClass/);
});
