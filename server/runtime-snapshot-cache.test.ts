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

test("clearRuntimeSnapshotCache only clears entries for the requested user", async () => {
  clearRuntimeSnapshotCache();

  let userOneLoads = 0;
  let userTwoLoads = 0;

  await getOrCreateRuntimeSnapshot({
    scope: "overview",
    userId: "user-1",
    ttlMs: 10_000,
    loader: async () => {
      userOneLoads += 1;
      return { user: "user-1", load: userOneLoads };
    },
  });

  await getOrCreateRuntimeSnapshot({
    scope: "overview",
    userId: "user-2",
    ttlMs: 10_000,
    loader: async () => {
      userTwoLoads += 1;
      return { user: "user-2", load: userTwoLoads };
    },
  });

  clearRuntimeSnapshotCache("user-1");

  const userOneAfterClear = await getOrCreateRuntimeSnapshot({
    scope: "overview",
    userId: "user-1",
    ttlMs: 10_000,
    loader: async () => {
      userOneLoads += 1;
      return { user: "user-1", load: userOneLoads };
    },
  });

  const userTwoAfterClear = await getOrCreateRuntimeSnapshot({
    scope: "overview",
    userId: "user-2",
    ttlMs: 10_000,
    loader: async () => {
      userTwoLoads += 1;
      return { user: "user-2", load: userTwoLoads };
    },
  });

  assert.equal(userOneLoads, 2);
  assert.equal(userTwoLoads, 1);
  assert.deepEqual(userOneAfterClear, { user: "user-1", load: 2 });
  assert.deepEqual(userTwoAfterClear, { user: "user-2", load: 1 });
});

test("getOrCreateRuntimeSnapshot clears failed loads so the next request can retry", async () => {
  clearRuntimeSnapshotCache();

  let loadCount = 0;

  await assert.rejects(() =>
    getOrCreateRuntimeSnapshot({
      scope: "notifications",
      userId: "user-3",
      ttlMs: 10_000,
      loader: async () => {
        loadCount += 1;
        throw new Error("snapshot failed");
      },
    }),
  );

  const recovered = await getOrCreateRuntimeSnapshot({
    scope: "notifications",
    userId: "user-3",
    ttlMs: 10_000,
    loader: async () => {
      loadCount += 1;
      return { ok: true, loadCount };
    },
  });

  assert.equal(loadCount, 2);
  assert.deepEqual(recovered, { ok: true, loadCount: 2 });
});
