export interface RithmicLoginMetadata {
  fcmId: string;
  ibId: string;
  uniqueUserId: string;
  timestamp: string;
  timezone: string;
}

type RithmicLoginMetadataInput = {
  fcmId?: unknown;
  ibId?: unknown;
  uniqueUserId?: unknown;
  timestamp?: Date | number | string;
  timezone?: unknown;
};

type BuildRithmicLoginMetadataOptions = {
  now?: () => Date;
  resolveTimezone?: () => string;
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeTimestamp(
  value: RithmicLoginMetadataInput["timestamp"],
  now: () => Date,
): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number" || typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return now().toISOString();
}

function resolveTimezoneLabel(
  value: unknown,
  resolveTimezone: () => string,
): string {
  const normalizedValue = normalizeString(value);
  if (normalizedValue.length > 0) {
    return normalizedValue;
  }

  const detectedTimezone = normalizeString(resolveTimezone());
  return detectedTimezone.length > 0 ? detectedTimezone : "UTC";
}

export function buildRithmicLoginMetadata(
  input: RithmicLoginMetadataInput,
  options: BuildRithmicLoginMetadataOptions = {},
): RithmicLoginMetadata {
  const now = options.now ?? (() => new Date());
  const resolveTimezone =
    options.resolveTimezone ?? (() => Intl.DateTimeFormat().resolvedOptions().timeZone);

  return {
    fcmId: normalizeString(input.fcmId),
    ibId: normalizeString(input.ibId),
    uniqueUserId: normalizeString(input.uniqueUserId),
    timestamp: normalizeTimestamp(input.timestamp, now),
    timezone: resolveTimezoneLabel(input.timezone, resolveTimezone),
  };
}

export function buildRithmicConformanceSummary(
  metadata: RithmicLoginMetadata,
): {
  uniqueUserIds: string[];
  timestamp: string;
  timezone: string;
  fields: Array<{ label: string; value: string }>;
} {
  return {
    uniqueUserIds: metadata.uniqueUserId ? [metadata.uniqueUserId] : [],
    timestamp: metadata.timestamp,
    timezone: metadata.timezone,
    fields: [
      { label: "unique_user_id", value: metadata.uniqueUserId },
      { label: "fcm_id", value: metadata.fcmId },
      { label: "ib_id", value: metadata.ibId },
      { label: "timestamp", value: metadata.timestamp },
      { label: "timezone", value: metadata.timezone },
    ],
  };
}
