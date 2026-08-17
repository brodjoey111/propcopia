type CacheEntry<T> = {
  expiresAt: number;
  lastAccessedAt: number;
  value?: T;
  promise?: Promise<T>;
};

interface GetOrCreateSnapshotInput<T> {
  scope: string;
  userId: string;
  ttlMs: number;
  loader: () => Promise<T>;
}

const snapshotCache = new Map<string, CacheEntry<unknown>>();
export const MAX_RUNTIME_SNAPSHOT_CACHE_ENTRIES = 500;

const cacheCounters = {
  hits: 0,
  inFlightHits: 0,
  misses: 0,
  loadsSucceeded: 0,
  loadsFailed: 0,
  evictions: 0,
  entriesCleared: 0,
};

function pruneExpiredEntries(now: number): void {
  for (const [key, entry] of Array.from(snapshotCache.entries())) {
    if (!entry.promise && entry.expiresAt <= now) {
      snapshotCache.delete(key);
      cacheCounters.evictions += 1;
    }
  }
}

function enforceEntryLimit(): void {
  while (snapshotCache.size > MAX_RUNTIME_SNAPSHOT_CACHE_ENTRIES) {
    const evictionCandidate = Array.from(snapshotCache.entries())
      .filter(([, entry]) => !entry.promise)
      .sort((left, right) => left[1].lastAccessedAt - right[1].lastAccessedAt)[0];
    if (!evictionCandidate) {
      return;
    }
    snapshotCache.delete(evictionCandidate[0]);
    cacheCounters.evictions += 1;
  }
}

function buildCacheKey(scope: string, userId: string): string {
  return `${scope}:${userId}`;
}

export async function getOrCreateRuntimeSnapshot<T>(
  input: GetOrCreateSnapshotInput<T>,
): Promise<T> {
  const now = Date.now();
  pruneExpiredEntries(now);
  const cacheKey = buildCacheKey(input.scope, input.userId);
  const existing = snapshotCache.get(cacheKey) as CacheEntry<T> | undefined;

  if (existing && existing.value !== undefined && existing.expiresAt > now) {
    existing.lastAccessedAt = now;
    cacheCounters.hits += 1;
    return existing.value;
  }

  if (existing?.promise) {
    existing.lastAccessedAt = now;
    cacheCounters.inFlightHits += 1;
    return existing.promise;
  }

  cacheCounters.misses += 1;

  const pending = input
    .loader()
    .then((value) => {
      snapshotCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + input.ttlMs,
        lastAccessedAt: Date.now(),
      });
      cacheCounters.loadsSucceeded += 1;
      enforceEntryLimit();
      return value;
    })
    .catch((error) => {
      snapshotCache.delete(cacheKey);
      cacheCounters.loadsFailed += 1;
      throw error;
    });

  snapshotCache.set(cacheKey, {
    promise: pending,
    expiresAt: now + input.ttlMs,
    lastAccessedAt: now,
  });
  enforceEntryLimit();

  return pending;
}

export function getRuntimeSnapshotCacheStats(): Readonly<
  typeof cacheCounters & { entryCount: number; maxEntryCount: number }
> {
  pruneExpiredEntries(Date.now());
  return {
    ...cacheCounters,
    entryCount: snapshotCache.size,
    maxEntryCount: MAX_RUNTIME_SNAPSHOT_CACHE_ENTRIES,
  };
}

export function clearRuntimeSnapshotCache(userId?: string): void {
  if (!userId) {
    cacheCounters.entriesCleared += snapshotCache.size;
    snapshotCache.clear();
    return;
  }

  for (const key of Array.from(snapshotCache.keys())) {
    if (key.endsWith(`:${userId}`)) {
      snapshotCache.delete(key);
      cacheCounters.entriesCleared += 1;
    }
  }
}
