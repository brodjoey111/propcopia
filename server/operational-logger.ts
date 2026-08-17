const REDACTED = "[REDACTED]";
const MAX_DEPTH = 5;
const MAX_ARRAY_ITEMS = 20;
const MAX_OBJECT_KEYS = 40;
const MAX_STRING_LENGTH = 1000;

const SECRET_KEY_PATTERN = /(?:password|passphrase|secret|token|api[_-]?key|authorization|cookie|credential|stripeCustomerId|stripeSubscriptionId)/i;
const URL_SECRET_PATTERN = /([?&](?:api[_-]?key|token|secret|authorization)=)[^&#\s]+/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi;
const INLINE_SECRET_PATTERN = /\b(password|passphrase|secret|token|api[_-]?key|authorization|cookie)(\s*[:=]\s*)[^,\s;&]+/gi;
const STRIPE_REFERENCE_PATTERN = /\b(?:cus|sub)_[A-Za-z0-9]+\b/g;

export type OperationalLogLevel = "info" | "warn" | "error";
export type OperationalLogWriter = (line: string) => void;

function sanitizeString(value: string): string {
  const redacted = value
    .replace(URL_SECRET_PATTERN, `$1${REDACTED}`)
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(INLINE_SECRET_PATTERN, `$1$2${REDACTED}`)
    .replace(STRIPE_REFERENCE_PATTERN, REDACTED);
  return redacted.length > MAX_STRING_LENGTH
    ? `${redacted.slice(0, MAX_STRING_LENGTH)}...[truncated]`
    : redacted;
}

export function sanitizeOperationalValue(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) {
    return "[MAX_DEPTH]";
  }
  if (value === null || value === undefined || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return sanitizeString(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeString(value.message),
    };
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeOperationalValue(item, depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .slice(0, MAX_OBJECT_KEYS)
        .map(([key, item]) => [
          key,
          SECRET_KEY_PATTERN.test(key) ? REDACTED : sanitizeOperationalValue(item, depth + 1),
        ]),
    );
  }
  return sanitizeString(String(value));
}

export class OperationalLogger {
  constructor(
    private readonly service = "propcopia",
    private readonly writers: Record<OperationalLogLevel, OperationalLogWriter> = {
      info: (line) => console.log(line),
      warn: (line) => console.warn(line),
      error: (line) => console.error(line),
    },
  ) {}

  info(event: string, context: Record<string, unknown> = {}): void {
    this.write("info", event, context);
  }

  warn(event: string, context: Record<string, unknown> = {}): void {
    this.write("warn", event, context);
  }

  error(event: string, context: Record<string, unknown> = {}): void {
    this.write("error", event, context);
  }

  private write(level: OperationalLogLevel, event: string, context: Record<string, unknown>): void {
    this.writers[level](JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      event: sanitizeString(event),
      context: sanitizeOperationalValue(context),
    }));
  }
}

export const operationalLogger = new OperationalLogger();
