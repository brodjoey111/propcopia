import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./operations-overview-service.ts", import.meta.url), "utf8");

test("operations overview accepts a precomputed position snapshot with standalone fallback", () => {
  assert.match(source, /positionSnapshot\?: PositionSnapshotResult/);
  assert.match(source, /input\.positionSnapshot \?\? await buildPositionSnapshots\(/);
});
