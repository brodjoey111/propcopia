import assert from "node:assert/strict";
import test from "node:test";

import {
  clearRuntimeSnapshotCache,
  getRuntimeSnapshotCacheStats,
  getOrCreateRuntimeSnapshot,
  MAX_RUNTIME_SNAPSHOT_CACHE_ENTRIES,
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

test("expired snapshots are pruned when cache statistics are read", async () => {
  clearRuntimeSnapshotCache();
  const evictionsBefore = getRuntimeSnapshotCacheStats().evictions;

  await getOrCreateRuntimeSnapshot({
    scope: "expired",
    userId: "user-expired",
    ttlMs: 0,
    loader: async () => ({ ok: true }),
  });

  const stats = getRuntimeSnapshotCacheStats();
  assert.equal(stats.entryCount, 0);
  assert.equal(stats.evictions, evictionsBefore + 1);
});

test("runtime snapshot cache remains bounded under many unique users and scopes", async () => {
  clearRuntimeSnapshotCache();

  for (let index = 0; index < MAX_RUNTIME_SNAPSHOT_CACHE_ENTRIES + 25; index += 1) {
    await getOrCreateRuntimeSnapshot({
      scope: `scope-${index}`,
      userId: `user-${index}`,
      ttlMs: 60_000,
      loader: async () => index,
    });
  }

  const stats = getRuntimeSnapshotCacheStats();
  assert.equal(stats.entryCount, MAX_RUNTIME_SNAPSHOT_CACHE_ENTRIES);
  assert.equal(stats.maxEntryCount, MAX_RUNTIME_SNAPSHOT_CACHE_ENTRIES);
  assert.ok(stats.evictions >= 25);
});

test("cache statistics count hits, shared in-flight loads, and failures", async () => {
  clearRuntimeSnapshotCache();
  const before = getRuntimeSnapshotCacheStats();
  let releaseLoad: (() => void) | undefined;
  const loader = () => new Promise<number>((resolve) => {
    releaseLoad = () => resolve(42);
  });

  const first = getOrCreateRuntimeSnapshot({
    scope: "stats",
    userId: "user-stats",
    ttlMs: 10_000,
    loader,
  });
  const shared = getOrCreateRuntimeSnapshot({
    scope: "stats",
    userId: "user-stats",
    ttlMs: 10_000,
    loader,
  });
  releaseLoad?.();
  await Promise.all([first, shared]);
  await getOrCreateRuntimeSnapshot({
    scope: "stats",
    userId: "user-stats",
    ttlMs: 10_000,
    loader,
  });
  await assert.rejects(() => getOrCreateRuntimeSnapshot({
    scope: "stats-failure",
    userId: "user-stats",
    ttlMs: 10_000,
    loader: async () => { throw new Error("expected failure"); },
  }));

  const after = getRuntimeSnapshotCacheStats();
  assert.equal(after.inFlightHits, before.inFlightHits + 1);
  assert.equal(after.hits, before.hits + 1);
  assert.equal(after.loadsSucceeded, before.loadsSucceeded + 1);
  assert.equal(after.loadsFailed, before.loadsFailed + 1);
});
