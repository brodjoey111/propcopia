import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME,
  getAccountGroupsBoardLaneRuntime,
  isDefaultAccountGroupsBoardLaneRuntime,
} from "@/components/account-groups-board-types";

test("account groups board types centralize lane runtime defaults and fallback lookup", () => {
  const source = readFileSync(
    "client/src/components/account-groups-board-types.ts",
    "utf8",
  );

  assert.match(source, /DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME/);
  assert.match(source, /isDefaultAccountGroupsBoardLaneRuntime/);
  assert.match(source, /export function getAccountGroupsBoardLaneRuntime/);
});

test("lane runtime lookup returns the registered runtime when present", () => {
  const runtime = {
    runtimeStatus: "PAUSED",
    recentActivityPreview: [],
    operatorSummary: {
      headline: "Group paused",
      detail: "Paused from the board.",
    },
  } as any;

  const result = getAccountGroupsBoardLaneRuntime(
    "group-1",
    new Map([["group-1", runtime]]),
  );

  assert.equal(result, runtime);
  assert.equal(isDefaultAccountGroupsBoardLaneRuntime(result), false);
});

test("lane runtime lookup falls back to the shared default runtime object", () => {
  const result = getAccountGroupsBoardLaneRuntime("missing", new Map());

  assert.equal(result, DEFAULT_ACCOUNT_GROUPS_BOARD_LANE_RUNTIME);
  assert.equal(isDefaultAccountGroupsBoardLaneRuntime(result), true);
  assert.deepEqual(result.recentActivityPreview, []);
  assert.equal(result.operatorSummary, null);
});
