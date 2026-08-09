import assert from "node:assert/strict";
import test from "node:test";

import {
  clearRuntimeSnapshotCache,
  getOrCreateRuntimeSnapshot,
} from "./runtime-snapshot-cache";

test("getOrCreateRuntimeSnapshot reuses cached values within the ttl window", async () => {
  clearRuntimeSnapshotCache();

  let loadCount = 0;

  const first = await getOrCreateRuntimeSnapshot({
    scope: "positions",
    userId: "user-1",
    ttlMs: 10_000,
    loader: async () => {
      loadCount += 1;
      return { value: loadCount };
    },
  });

  const second = await getOrCreateRuntimeSnapshot({
    scope: "positions",
    userId: "user-1",
    ttlMs: 10_000,
    loader: async () => {
      loadCount += 1;
      return { value: loadCount };
    },
  });

  assert.equal(loadCount, 1);
  assert.deepEqual(first, { value: 1 });
  assert.deepEqual(second, { value: 1 });
});

test("getOrCreateRuntimeSnapshot shares an in-flight loader for concurrent calls", async () => {
  clearRuntimeSnapshotCache();

  let loadCount = 0;

  const [first, second] = await Promise.all([
    getOrCreateRuntimeSnapshot({
      scope: "overview",
      userId: "user-2",
      ttlMs: 10_000,
      loader: async () => {
        loadCount += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return loadCount;
      },
    }),
    getOrCreateRuntimeSnapshot({
      scope: "overview",
      userId: "user-2",
      ttlMs: 10_000,
      loader: async () => {
        loadCount += 1;
        return loadCount;
      },
    }),
  ]);

  assert.equal(loadCount, 1);
  assert.equal(first, 1);
  assert.equal(second, 1);
});
