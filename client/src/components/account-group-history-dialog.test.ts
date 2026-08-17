import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getAccountGroupHistoryToneBadgeClass,
  getAccountGroupHistoryTonePanelClass,
  getAccountGroupHistoryToneTextClass,
} from "@/components/account-group-history-dialog";

test("account group history dialog summarizes observability and timeline states", () => {
  const source = readFileSync("client/src/components/account-group-history-dialog.tsx", "utf8");

  assert.match(source, /buildCopyGroupActivityTimeline\(historyActivity, 12\)/);
  assert.match(source, /buildCopyGroupHistorySummary\(historyActivity, historyObservability\)/);
  assert.match(source, /getAccountGroupHistoryTonePanelClass/);
  assert.match(source, /getAccountGroupHistoryToneBadgeClass/);
  assert.match(source, /getAccountGroupHistoryToneTextClass/);
  assert.match(source, /Recent lifecycle, health, and execution updates captured for this copy group\./);
  assert.match(source, /Signal freshness/);
  assert.match(source, /Recovery priority/);
  assert.match(source, /Restart recovery/);
  assert.match(source, /Loading recent history\.\.\./);
  assert.match(source, /No recent history yet\. Group registration and runtime changes will appear here\./);
});

test("history dialog tone helpers preserve summary, badge, and timestamp styles", () => {
  assert.equal(
    getAccountGroupHistoryTonePanelClass("danger"),
    "border-red-500/20 bg-red-500/10",
  );
  assert.equal(
    getAccountGroupHistoryTonePanelClass("warn"),
    "border-amber-500/20 bg-amber-500/10",
  );
  assert.equal(
    getAccountGroupHistoryTonePanelClass("ok"),
    "border-emerald-500/20 bg-emerald-500/10",
  );
  assert.equal(
    getAccountGroupHistoryTonePanelClass("muted"),
    "border-white/10 bg-white/[0.03]",
  );

  assert.equal(
    getAccountGroupHistoryToneBadgeClass("danger"),
    "border-red-500/30 text-red-200",
  );
  assert.equal(
    getAccountGroupHistoryToneBadgeClass("warn"),
    "border-amber-500/30 text-amber-100",
  );
  assert.equal(
    getAccountGroupHistoryToneBadgeClass("ok"),
    "border-emerald-500/30 text-emerald-100",
  );
  assert.equal(
    getAccountGroupHistoryToneBadgeClass("muted"),
    "border-white/10 text-zinc-300",
  );

  assert.equal(
    getAccountGroupHistoryToneTextClass("danger"),
    "text-red-200/80",
  );
  assert.equal(
    getAccountGroupHistoryToneTextClass("warn"),
    "text-amber-100/80",
  );
  assert.equal(
    getAccountGroupHistoryToneTextClass("ok"),
    "text-emerald-100/80",
  );
  assert.equal(
    getAccountGroupHistoryToneTextClass("muted"),
    "text-zinc-500",
  );
});
