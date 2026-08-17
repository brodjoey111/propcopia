export interface CopyGroupOperatorLogEntry {
  entryId: string;
  groupId: string;
  timestamp: string;
  label: string;
  detail: string;
}

export interface CopyGroupOperatorSummary {
  headline: string;
  detail: string;
  updatedLabel?: string;
}

export const COPY_GROUP_OPERATOR_LOG_STORAGE_KEY = "copy-group-operator-log-v1";
const COPY_GROUP_OPERATOR_LOG_LIMIT = 10;

function canUseStorage(storage?: Storage): storage is Storage {
  return typeof storage !== "undefined";
}

function isCopyGroupOperatorLogEntry(
  value: unknown,
): value is CopyGroupOperatorLogEntry {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as CopyGroupOperatorLogEntry).entryId === "string" &&
      typeof (value as CopyGroupOperatorLogEntry).groupId === "string" &&
      typeof (value as CopyGroupOperatorLogEntry).timestamp === "string" &&
      typeof (value as CopyGroupOperatorLogEntry).label === "string" &&
      typeof (value as CopyGroupOperatorLogEntry).detail === "string",
  );
}

export function normalizeCopyGroupOperatorLog(
  value: unknown,
): Record<string, CopyGroupOperatorLogEntry[]> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([groupId, entries]) => {
      if (!Array.isArray(entries)) {
        return [];
      }

      const normalizedEntries = entries
        .filter(isCopyGroupOperatorLogEntry)
        .filter((entry) => entry.groupId === groupId)
        .slice(0, COPY_GROUP_OPERATOR_LOG_LIMIT);

      if (normalizedEntries.length === 0) {
        return [];
      }

      return [[groupId, normalizedEntries]];
    }),
  );
}

function formatOperatorUpdatedLabel(timestamp?: string): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function loadCopyGroupOperatorLog(
  storage: Storage | undefined = typeof window !== "undefined" ? window.localStorage : undefined,
): Record<string, CopyGroupOperatorLogEntry[]> {
  if (!canUseStorage(storage)) {
    return {};
  }

  try {
    const raw = storage.getItem(COPY_GROUP_OPERATOR_LOG_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    return normalizeCopyGroupOperatorLog(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveCopyGroupOperatorLog(
  logByGroupId: Record<string, CopyGroupOperatorLogEntry[]>,
  storage: Storage | undefined = typeof window !== "undefined" ? window.localStorage : undefined,
): void {
  if (!canUseStorage(storage)) {
    return;
  }

  try {
    storage.setItem(COPY_GROUP_OPERATOR_LOG_STORAGE_KEY, JSON.stringify(logByGroupId));
  } catch {}
}

export function appendCopyGroupOperatorLogEntry(
  current: Record<string, CopyGroupOperatorLogEntry[]>,
  entry: CopyGroupOperatorLogEntry,
): Record<string, CopyGroupOperatorLogEntry[]> {
  const groupEntries = [entry, ...(current[entry.groupId] ?? [])].slice(0, COPY_GROUP_OPERATOR_LOG_LIMIT);
  return {
    ...current,
    [entry.groupId]: groupEntries,
  };
}

export function recordCopyGroupOperatorLogEntry(
  current: Record<string, CopyGroupOperatorLogEntry[]>,
  input: {
    groupId: string;
    label: string;
    detail: string;
  },
) {
  return appendCopyGroupOperatorLogEntry(
    current,
    createCopyGroupOperatorLogEntry(input.groupId, input.label, input.detail),
  );
}

export function createCopyGroupOperatorLogEntry(
  groupId: string,
  label: string,
  detail: string,
): CopyGroupOperatorLogEntry {
  return {
    entryId: `${groupId}-${Date.now()}`,
    groupId,
    timestamp: new Date().toISOString(),
    label,
    detail,
  };
}

export function buildCopyGroupOperatorSummary(
  entries: CopyGroupOperatorLogEntry[] | undefined,
): CopyGroupOperatorSummary | null {
  const latestEntry = entries?.[0];
  if (!latestEntry) {
    return null;
  }

  return {
    headline: latestEntry.label,
    detail: latestEntry.detail,
    updatedLabel: formatOperatorUpdatedLabel(latestEntry.timestamp),
  };
}
