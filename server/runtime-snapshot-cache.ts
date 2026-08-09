type CacheEntry<T> = {
  expiresAt: number;
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

function buildCacheKey(scope: string, userId: string): string {
  return `${scope}:${userId}`;
}

export async function getOrCreateRuntimeSnapshot<T>(
  input: GetOrCreateSnapshotInput<T>,
): Promise<T> {
  const now = Date.now();
  const cacheKey = buildCacheKey(input.scope, input.userId);
  const existing = snapshotCache.get(cacheKey) as CacheEntry<T> | undefined;

  if (existing && existing.value !== undefined && existing.expiresAt > now) {
    return existing.value;
  }

  if (existing?.promise) {
    return existing.promise;
  }

  const pending = input
    .loader()
    .then((value) => {
      snapshotCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + input.ttlMs,
      });
      return value;
    })
    .catch((error) => {
      snapshotCache.delete(cacheKey);
      throw error;
    });

  snapshotCache.set(cacheKey, {
    promise: pending,
    expiresAt: now + input.ttlMs,
  });

  return pending;
}

export function clearRuntimeSnapshotCache(userId?: string): void {
  if (!userId) {
    snapshotCache.clear();
    return;
  }

  for (const key of Array.from(snapshotCache.keys())) {
    if (key.endsWith(`:${userId}`)) {
      snapshotCache.delete(key);
    }
  }
}
