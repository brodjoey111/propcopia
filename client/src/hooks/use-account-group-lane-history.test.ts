import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  fetchCopyGroupLaneHistory,
  shouldLoadAccountGroupLaneHistory,
  shouldResetAccountGroupLaneHistoryPreview,
} from "@/hooks/use-account-group-lane-history";

test("account group lane history hook keeps preview reset and lazy history loading together", () => {
  const source = readFileSync("client/src/hooks/use-account-group-lane-history.ts", "utf8");

  assert.match(source, /const \[historyOpen, setHistoryOpen\] = useState\(false\)/);
  assert.match(source, /export async function fetchCopyGroupLaneHistory/);
  assert.match(source, /shouldResetAccountGroupLaneHistoryPreview/);
  assert.match(source, /shouldLoadAccountGroupLaneHistory/);
  assert.match(source, /setHistoryActivity\(recentActivityPreview\)/);
  assert.match(source, /historyOpen,\s*isUngrouped,\s*isDemo/);
  assert.match(source, /fetchCopyGroupLaneHistory\(groupId\)/);
  assert.match(source, /setHistoryObservability\(payload\.observability \?\? null\)/);
});

test("fetchCopyGroupLaneHistory loads the activity payload and rejects failed responses", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    assert.equal(input.toString(), "/api/copy-groups/group-1/activity");

    return {
      ok: true,
      json: async () => ({
        activity: [
          {
            eventId: "evt-1",
            groupId: "group-1",
            timestamp: "2026-08-11T12:00:00.000Z",
            severity: "INFO",
            category: "LIFECYCLE",
            message: "Copy group started.",
          },
        ],
        observability: {
          groupId: "group-1",
          recentActivity: [],
          totalEvents: 1,
          infoEventCount: 1,
          warningEventCount: 0,
          errorEventCount: 0,
          restartRecoveryCount: 0,
          categoryCounts: {
            lifecycle: 1,
            trade: 0,
            rule: 0,
            intent: 0,
            execution: 0,
            health: 0,
          },
          lifecycleCounts: {
            started: 1,
            paused: 0,
            resumed: 0,
            stopped: 0,
            emergencyStopped: 0,
          },
          lastRestartRecoveryAt: undefined,
          lastRestartRecoveryMessage: undefined,
        },
      }),
    } as Response;
  }) as typeof fetch;

  await assert.doesNotReject(async () => {
    const payload = await fetchCopyGroupLaneHistory("group-1");
    assert.equal(payload.activity?.[0]?.message, "Copy group started.");
    assert.equal(payload.observability?.groupId, "group-1");
  });

  globalThis.fetch = (async () =>
    ({
      ok: false,
      json: async () => ({}),
    }) as Response) as typeof fetch;

  await assert.rejects(
    async () => fetchCopyGroupLaneHistory("group-1"),
    /Failed to load copy-group history/,
  );

  globalThis.fetch = originalFetch;
});

test("lane history visibility helpers preserve preview reset and remote load gating rules", () => {
  assert.equal(shouldResetAccountGroupLaneHistoryPreview(false), true);
  assert.equal(shouldResetAccountGroupLaneHistoryPreview(true), false);

  assert.equal(
    shouldLoadAccountGroupLaneHistory({
      historyOpen: true,
      isUngrouped: false,
      isDemo: false,
    }),
    true,
  );
  assert.equal(
    shouldLoadAccountGroupLaneHistory({
      historyOpen: false,
      isUngrouped: false,
      isDemo: false,
    }),
    false,
  );
  assert.equal(
    shouldLoadAccountGroupLaneHistory({
      historyOpen: true,
      isUngrouped: true,
      isDemo: false,
    }),
    false,
  );
  assert.equal(
    shouldLoadAccountGroupLaneHistory({
      historyOpen: true,
      isUngrouped: false,
      isDemo: true,
    }),
    false,
  );
});
