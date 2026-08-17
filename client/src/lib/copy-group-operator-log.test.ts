import test from "node:test";
import assert from "node:assert/strict";
import {
  appendCopyGroupOperatorLogEntry,
  buildCopyGroupOperatorSummary,
  createCopyGroupOperatorLogEntry,
  loadCopyGroupOperatorLog,
  normalizeCopyGroupOperatorLog,
  recordCopyGroupOperatorLogEntry,
} from "@/lib/copy-group-operator-log";

test("copy group operator log keeps newest entries first by group", () => {
  const firstEntry = {
    entryId: "first",
    groupId: "group-1",
    timestamp: "2026-08-10T12:00:00.000Z",
    label: "Group paused",
    detail: "Paused from the copy-groups lane.",
  };
  const secondEntry = {
    entryId: "second",
    groupId: "group-1",
    timestamp: "2026-08-10T12:05:00.000Z",
    label: "Emergency stop applied",
    detail: "Manual emergency stop was saved.",
  };

  const once = appendCopyGroupOperatorLogEntry({}, firstEntry);
  const twice = appendCopyGroupOperatorLogEntry(once, secondEntry);

  assert.deepEqual(twice["group-1"]?.map((entry) => entry.entryId), ["second", "first"]);
});

test("copy group operator log builds a summary from the newest entry", () => {
  const summary = buildCopyGroupOperatorSummary([
    {
      entryId: "latest",
      groupId: "group-2",
      timestamp: "2026-08-10T14:30:00.000Z",
      label: "Master reassigned",
      detail: "Operator moved the master role to Apex 302.",
    },
  ]);

  assert.equal(summary?.headline, "Master reassigned");
  assert.equal(summary?.detail, "Operator moved the master role to Apex 302.");
  assert.match(summary?.updatedLabel ?? "", /Aug/);
});

test("copy group operator log entry factory creates a timestamped entry", () => {
  const entry = createCopyGroupOperatorLogEntry("group-3", "Risk updated", "Custom group risk settings were saved.");

  assert.equal(entry.groupId, "group-3");
  assert.equal(entry.label, "Risk updated");
  assert.equal(entry.detail, "Custom group risk settings were saved.");
  assert.ok(entry.entryId.startsWith("group-3-"));
});

test("copy group operator log record helper creates and prepends a new entry", () => {
  const next = recordCopyGroupOperatorLogEntry(
    {
      "group-1": [
        {
          entryId: "older",
          groupId: "group-1",
          timestamp: "2026-08-11T12:00:00.000Z",
          label: "Group paused",
          detail: "Paused from the board.",
        },
      ],
    },
    {
      groupId: "group-1",
      label: "Risk updated",
      detail: "Custom group risk settings were saved.",
    },
  );

  assert.equal(next["group-1"]?.[0]?.label, "Risk updated");
  assert.equal(next["group-1"]?.[0]?.detail, "Custom group risk settings were saved.");
  assert.equal(next["group-1"]?.[1]?.entryId, "older");
});

test("copy group operator log normalization drops malformed entries and keeps group ownership aligned", () => {
  const normalized = normalizeCopyGroupOperatorLog({
    "group-1": [
      {
        entryId: "valid",
        groupId: "group-1",
        timestamp: "2026-08-11T12:00:00.000Z",
        label: "Paused",
        detail: "Paused from the lane.",
      },
      {
        entryId: "wrong-group",
        groupId: "group-2",
        timestamp: "2026-08-11T12:01:00.000Z",
        label: "Ignored",
        detail: "This should be filtered out.",
      },
      {
        entryId: "missing-detail",
        groupId: "group-1",
        timestamp: "2026-08-11T12:02:00.000Z",
        label: "Broken",
      },
    ],
    "group-2": "not-an-array",
  });

  assert.deepEqual(Object.keys(normalized), ["group-1"]);
  assert.deepEqual(normalized["group-1"]?.map((entry) => entry.entryId), ["valid"]);
});

test("copy group operator log loader normalizes saved storage payloads", () => {
  const storage = {
    getItem(key: string) {
      assert.equal(key, "copy-group-operator-log-v1");

      return JSON.stringify({
        "group-1": [
          {
            entryId: "valid",
            groupId: "group-1",
            timestamp: "2026-08-11T12:00:00.000Z",
            label: "Risk updated",
            detail: "Custom settings saved.",
          },
          {
            entryId: "invalid",
            groupId: "group-9",
            timestamp: "2026-08-11T12:01:00.000Z",
            label: "Bad",
            detail: "Wrong group ownership.",
          },
        ],
      });
    },
  } as Storage;

  const loaded = loadCopyGroupOperatorLog(storage);

  assert.deepEqual(loaded["group-1"]?.map((entry) => entry.entryId), ["valid"]);
});
